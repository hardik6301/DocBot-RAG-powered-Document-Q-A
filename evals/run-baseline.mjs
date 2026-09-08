/**
 * Phase 8.1 — run current DocBot RAG path on fixture PDFs (no HTTP/auth).
 * Usage: node evals/run-baseline.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  gradeCase,
  aggregateMetrics,
  compareRegression,
} from "./lib/metrics.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(root, name), "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#") || !t.includes("=")) continue;
        const i = t.indexOf("=");
        const k = t.slice(0, i);
        let v = t.slice(i + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      /* missing ok */
    }
  }
}

loadEnv();

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;
const CONTEXTUAL = process.env.CONTEXTUAL === "1";
const RERANK = process.env.RERANK !== "0"; // default ON to match app Phase 8.3
const HARNESS = process.env.HARNESS === "1" || process.argv.includes("--harness");
const SKIP_INGEST = process.env.SKIP_INGEST === "1";
const NS = CONTEXTUAL
  ? RERANK
    ? "eval-baseline-v3-contextual-rerank"
    : "eval-baseline-v2-contextual"
  : RERANK
    ? "eval-baseline-v3-rerank"
    : "eval-baseline-v1";
const RETRIEVE_K = RERANK ? 15 : 5;
const TOP_K = RERANK ? 5 : 5;
const SCORE_MIN = 0.15;

const golden = JSON.parse(
  readFileSync(join(__dirname, "golden", "v1.json"), "utf8"),
);

const DOCS = golden.fixtures.map((f) => ({
  id: f.id,
  label: f.label,
  file: f.file,
  filename: f.file,
}));

/** @type {{id:string,doc:string,q:string,expect:string,expectSrc:string,keywords:string[],offTopic?:boolean}[]} */
const QUESTIONS = golden.questions;
function l2Normalize(values) {
  let sum = 0;
  for (const v of values) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) return values;
  return values.map((v) => v / norm);
}

async function embedOne(text, taskType) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 8000) || " ";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: cleaned }] },
        taskType,
        outputDimensionality: EMBED_DIM,
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `embed failed ${res.status}`);
  }
  const values = data.embedding?.values;
  if (!values?.length) throw new Error("empty embedding");
  const truncated =
    values.length > EMBED_DIM ? values.slice(0, EMBED_DIM) : values;
  return l2Normalize(truncated);
}

async function embedTexts(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += 8) {
    const batch = texts.slice(i, i + 8);
    for (const t of batch) {
      out.push(await embedOne(t, "RETRIEVAL_DOCUMENT"));
      await sleep(200);
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function splitPages(pages) {
  const chunks = [];
  let index = 0;
  for (const p of pages) {
    const text = p.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length <= CHUNK_SIZE) {
      chunks.push({ index: index++, page: p.page, text });
      continue;
    }
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      chunks.push({
        index: index++,
        page: p.page,
        text: text.slice(start, end),
      });
      if (end >= text.length) break;
      start = Math.max(0, end - CHUNK_OVERLAP);
    }
  }
  return chunks;
}

async function loadPdf(absPath) {
  await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");
  const { readFileSync } = await import("fs");
  const buffer = readFileSync(absPath);
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const info = await parser.getInfo().catch(() => null);
  await parser.destroy().catch(() => undefined);
  const raw = (
    typeof textResult === "string"
      ? textResult
      : textResult?.text || ""
  ).trim();
  if (!raw) throw new Error(`No text in ${absPath}`);
  const parts = raw
    .split(/\f+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return parts.map((text, i) => ({ page: i + 1, text }));
  }
  const pageCount = Math.max(1, Number(info?.total) || 1);
  if (pageCount === 1) return [{ page: 1, text: raw }];
  const approx = Math.ceil(raw.length / pageCount);
  const pages = [];
  for (let i = 0; i < pageCount; i++) {
    const slice = raw.slice(i * approx, (i + 1) * approx).trim();
    if (slice) pages.push({ page: i + 1, text: slice });
  }
  return pages.length ? pages : [{ page: 1, text: raw }];
}

async function getIndex() {
  const key = process.env.PINECONE_API_KEY?.trim();
  if (!key) throw new Error("PINECONE_API_KEY missing");
  const name = process.env.PINECONE_INDEX?.trim() || "docbot";
  const pc = new Pinecone({ apiKey: key });
  return pc.index(name);
}

async function upsertChunks(index, records) {
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await index.upsert({
      namespace: NS,
      records: batch.map((r) => ({
        id: r.id,
        values: r.values,
        metadata: {
          ...r.metadata,
          chunkText: r.metadata.chunkText.slice(0, 3500),
        },
      })),
    });
  }
}


async function rerankChunks(question, candidates, keep = 5) {
  if (candidates.length <= keep) return candidates;
  const blocks = candidates
    .map((c, i) => {
      const head = `[${i + 1}] (${c.filename}${c.page != null ? `, page ${c.page}` : ""})`;
      const body = c.chunkText.replace(/\s+/g, " ").trim().slice(0, 1200);
      return `${head}\n${body}`;
    })
    .join("\n\n");
  const prompt = `You rank document chunks for retrieval relevance.

QUESTION:
${question}

CHUNKS:
${blocks}

Return ONLY a JSON array of chunk numbers (1-based), ordered from most relevant to least relevant.
Include every chunk number exactly once. Example: [3,1,2,5,4]
No markdown, no explanation.`;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  const models = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-flash-lite-latest"];
  let raw = "";
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      raw = result.response.text().trim();
      break;
    } catch {
      continue;
    }
  }
  if (!raw) return candidates.slice(0, keep);
  const jsonMatch = raw.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return candidates.slice(0, keep);
  let ranked;
  try {
    ranked = JSON.parse(jsonMatch[0]);
  } catch {
    return candidates.slice(0, keep);
  }
  if (!Array.isArray(ranked)) return candidates.slice(0, keep);
  const picked = [];
  const used = new Set();
  for (const id of ranked.map(Number)) {
    if (picked.length >= keep) break;
    const idx = id - 1;
    if (!Number.isInteger(id) || idx < 0 || idx >= candidates.length || used.has(idx)) continue;
    used.add(idx);
    picked.push(candidates[idx]);
  }
  for (let i = 0; i < candidates.length && picked.length < keep; i++) {
    if (used.has(i)) continue;
    picked.push(candidates[i]);
  }
  return picked;
}

async function querySimilar(index, vector, docId) {
  const result = await index.query({
    namespace: NS,
    vector,
    topK: RETRIEVE_K,
    includeMetadata: true,
    filter: { docId: { $eq: docId } },
  });
  return (result.matches ?? []).map((m) => ({
    score: m.score ?? 0,
    chunkText: String(m.metadata?.chunkText ?? ""),
    page:
      typeof m.metadata?.page === "number"
        ? m.metadata.page
        : Number(m.metadata?.page) || null,
    filename: String(m.metadata?.filename ?? ""),
  }));
}

async function buildContextualPrefix(filename, preview, chunk) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  const prompt = `You are indexing a document for search.
Document filename: ${filename}
Document preview:
"""
${preview.slice(0, 6000)}
"""

Chunk (page ${chunk.page}):
"""
${chunk.text.slice(0, 2500)}
"""

Write ONE short paragraph (2 sentences max) that situates this chunk within the document so it can be retrieved independently.
Include the document type/topic and what this chunk is about.
Do NOT repeat the chunk verbatim. Answer with only the situating context.`;
  const models = [
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-flash-lite-latest",
  ];
  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim().replace(/\s+/g, " ").slice(0, 500);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429|503|high demand|quota/i.test(msg) && attempt < 2) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        break;
      }
    }
  }
  return "";
}

async function generateGroundedAnswer(question, contextBlocks) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  const context = contextBlocks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.filename}${c.page != null ? `, page ${c.page}` : ""})\n${c.text}`,
    )
    .join("\n\n");
  const prompt = `You are DocBot, a document Q&A assistant. Answer ONLY using the context below.
If the context is insufficient, say you cannot find that information in the document.
Cite sources inline like [1], [2] matching the context block numbers.
Be concise and precise.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;
  const models = [
    process.env.GEMINI_CHAT_MODEL?.trim(),
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
  ].filter(Boolean);
  let lastError;
  for (const modelName of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        const retryable =
          msg.includes("429") ||
          msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("quota") ||
          msg.includes("UNAVAILABLE");
        const nextModel =
          msg.includes("404") ||
          msg.includes("not found") ||
          msg.includes("is not found");
        if (retryable && attempt < 2) {
          const wait = 1500 * (attempt + 1);
          console.warn(`model ${modelName} busy, retry in ${wait}ms…`);
          await sleep(wait);
          continue;
        }
        if (retryable || nextModel) {
          console.warn(`model ${modelName} failed, next…`);
          break;
        }
        throw e;
      }
    }
  }
  throw lastError;
}

function escCell(s) {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .slice(0, 280);
}

async function main() {
  console.log(
    "Namespace:",
    NS,
    "contextual=",
    CONTEXTUAL,
    "rerank=",
    RERANK,
    "harness=",
    HARNESS,
  );
  const index = await getIndex();

  if (!SKIP_INGEST) {
    try {
      await index.deleteAll({ namespace: NS });
      console.log("Cleared eval namespace");
    } catch (e) {
      console.warn("deleteAll skipped:", e.message?.slice(0, 80));
    }

    for (const doc of DOCS) {
      const abs = join(__dirname, "fixtures", doc.file);
      console.log("Ingesting", doc.file);
      const pages = await loadPdf(abs);
      const chunks = splitPages(pages);
      console.log(
        `  pages=${pages.length} chunks=${chunks.length} contextual=${CONTEXTUAL}`,
      );
      const preview = pages
        .map((p) => `Page ${p.page}: ${p.text}`)
        .join("\n\n");
      let embedInputs = chunks.map((c) => c.text);
      if (CONTEXTUAL) {
        embedInputs = [];
        for (const c of chunks) {
          const prefix = await buildContextualPrefix(doc.filename, preview, c);
          embedInputs.push(prefix ? `${prefix}\n\n${c.text}` : c.text);
          await sleep(200);
        }
      }
      const vectors = await embedTexts(embedInputs);
      const records = chunks.map((c, i) => ({
        id: `${doc.id}-${c.index}-${randomUUID().slice(0, 8)}`,
        values: vectors[i],
        metadata: {
          filename: doc.filename,
          page: c.page,
          chunkText: c.text,
          docId: doc.id,
          userId: NS,
        },
      }));
      await upsertChunks(index, records);
    }

    // Pinecone eventual consistency
    await sleep(2000);
  } else {
    console.log("SKIP_INGEST=1 — reusing vectors in", NS);
  }

  const docByLabel = Object.fromEntries(DOCS.map((d) => [d.label, d]));

  const rows = [];
  for (const q of QUESTIONS) {
    process.stdout.write(`Q ${q.id}… `);
    const doc = docByLabel[q.doc];
    const t0 = Date.now();

    const tEmbed = Date.now();
    const vector = await embedOne(q.q, "RETRIEVAL_QUERY");
    const embedMs = Date.now() - tEmbed;

    const tRet = Date.now();
    const matches = await querySimilar(index, vector, doc.id);
    const retrieveMs = Date.now() - tRet;

    const usable = matches.filter((m) => m.chunkText && m.score > SCORE_MIN);
    const tRerank = Date.now();
    const ranked = RERANK
      ? await rerankChunks(q.q, usable, TOP_K)
      : usable.slice(0, TOP_K);
    const rerankMs = RERANK ? Date.now() - tRerank : 0;

    let answer;
    let sources = [];
    let generateMs = 0;
    if (ranked.length === 0) {
      answer =
        "I couldn't find information about that in the uploaded document.";
    } else {
      sources = ranked.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
        score: m.score,
      }));
      const tGen = Date.now();
      answer = await generateGroundedAnswer(
        q.q,
        sources.map((s) => ({
          text: s.chunkText,
          page: s.page,
          filename: s.filename,
        })),
      );
      generateMs = Date.now() - tGen;
    }
    const withScores = ranked
      .slice(0, 3)
      .map((m) => `p${m.page} @${(m.score ?? 0).toFixed(2)}`);
    const metrics = gradeCase(q, answer, sources, ranked);
    const result = metrics.result;
    console.log(result);
    rows.push({
      ...q,
      answer,
      actualSrc: withScores.join("; ") || "—",
      result,
      metrics,
      latency: {
        embedMs,
        retrieveMs,
        rerankMs,
        generateMs,
        totalMs: Date.now() - t0,
      },
    });
    await sleep(800);
  }

  const pass = rows.filter((r) => r.result === "PASS").length;
  const partial = rows.filter((r) => r.result === "PARTIAL").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const a8 = rows.find((r) => r.id === "A8");
  const metrics = aggregateMetrics(rows);

  const byDoc = { A: [], B: [], C: [] };
  for (const r of rows) byDoc[r.doc].push(r);

  function table(list) {
    const lines = [
      "| # | Question | Expected | Expected source | Actual answer | Actual source | Result |",
      "|---|----------|----------|-----------------|---------------|---------------|--------|",
    ];
    for (const r of list) {
      lines.push(
        `| ${r.id} | ${escCell(r.q)} | ${escCell(r.expect)} | ${r.expectSrc} | ${escCell(r.answer)} | ${escCell(r.actualSrc)} | **${r.result}** |`,
      );
    }
    return lines.join("\n");
  }

  const runLabel = CONTEXTUAL
    ? RERANK
      ? "baseline-v3-contextual-rerank"
      : "baseline-v2-contextual"
    : RERANK
      ? "baseline-v3-rerank"
      : "baseline-v1";

  const md = `# DocBot RAG ${HARNESS ? "Harness" : "Baseline"} — FILLED

**Phase:** ${HARNESS ? "14.5" : "8.x"}  
**Run date:** ${new Date().toISOString()}  
**Runner:** \`node evals/${HARNESS ? "run-harness.mjs" : "run-baseline.mjs"}\`  
**Golden set:** \`evals/golden/v1.json\` (${golden.id})  
**Namespace:** \`${NS}\`  
**Flags:** contextual=${CONTEXTUAL} rerank=${RERANK} skipIngest=${SKIP_INGEST}  
**topK:** ${TOP_K}, retrieveK: ${RETRIEVE_K}, score floor: ${SCORE_MIN}

## Summary

| Metric | Count |
|--------|------:|
| Total questions | ${rows.length} |
| PASS | ${pass} |
| PARTIAL | ${partial} |
| FAIL | ${fail} |
| PASS rate (PASS / total) | ${((pass / rows.length) * 100).toFixed(1)}% |
| Off-topic refusal (A8) | ${a8?.result ?? "n/a"} |
| Citation page hit rate | ${metrics.citationPageHitRate == null ? "—" : `${(metrics.citationPageHitRate * 100).toFixed(1)}%`} |
| Retrieval page hit rate | ${metrics.retrievalPageHitRate == null ? "—" : `${(metrics.retrievalPageHitRate * 100).toFixed(1)}%`} |
| Keyword hit rate (avg) | ${metrics.keywordHitRate == null ? "—" : `${(metrics.keywordHitRate * 100).toFixed(1)}%`} |
| Latency P50 total | ${metrics.latency.totalMs?.p50 ?? "—"} ms |
| Latency P95 total | ${metrics.latency.totalMs?.p95 ?? "—"} ms |

### Observed failure patterns

${fail + partial === 0 ? "- None (all PASS)" : ""}
${rows.some((r) => r.result !== "PASS" && !r.offTopic) ? "- See non-PASS rows below for missed keywords / page mismatch / weak retrieval" : ""}
${a8?.result === "FAIL" ? "- Off-topic answered with Paris (guardrail gap)" : ""}
${a8?.result === "PASS" ? "- Off-topic correctly refused" : ""}

## Document A — Software Engineer JD

${table(byDoc.A)}

## Document B — Refund Policy

${table(byDoc.B)}

## Document C — Intern Onboarding

${table(byDoc.C)}
`;

  mkdirSync(join(__dirname, "results"), { recursive: true });
  const outName = `${runLabel}-filled.md`;
  const outPath = join(__dirname, "results", outName);
  writeFileSync(outPath, md);
  writeFileSync(
    join(__dirname, "results", outName.replace("-filled.md", "-raw.json")),
    JSON.stringify({ pass, partial, fail, metrics, rows }, null, 2),
  );
  console.log("\nWrote", outPath);
  console.log(`PASS ${pass} / PARTIAL ${partial} / FAIL ${fail}`);

  if (HARNESS) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const report = {
      id: `harness-${stamp}`,
      at: new Date().toISOString(),
      golden: golden.id,
      namespace: NS,
      flags: { CONTEXTUAL, RERANK, SKIP_INGEST },
      metrics,
      rows: rows.map((r) => ({
        id: r.id,
        result: r.result,
        metrics: r.metrics,
        latency: r.latency,
        actualSrc: r.actualSrc,
      })),
    };

    const latestPath = join(__dirname, "results", "harness-latest.json");
    let previous = null;
    try {
      previous = JSON.parse(readFileSync(latestPath, "utf8"));
    } catch {
      /* first run */
    }
    const regression = compareRegression(report, previous);
    report.regression = regression;

    writeFileSync(latestPath, JSON.stringify(report, null, 2));
    writeFileSync(
      join(__dirname, "results", `harness-${stamp}.json`),
      JSON.stringify(report, null, 2),
    );

    const harnessMd = `# DocBot formal RAG harness

**Run:** ${report.id}  
**Golden:** ${golden.id}  
**PASS rate:** ${(metrics.passRate * 100).toFixed(1)}% (${pass}/${rows.length})  
**Regression:** ${regression.regress ? "**YES — investigate**" : "no"}  

${regression.notes.map((n) => `- ${n}`).join("\n")}

## Latency (ms)

| Stage | P50 | P70 | P95 | max |
|-------|----:|----:|----:|----:|
| Embed | ${metrics.latency.embedMs?.p50 ?? "—"} | ${metrics.latency.embedMs?.p70 ?? "—"} | ${metrics.latency.embedMs?.p95 ?? "—"} | ${metrics.latency.embedMs?.max ?? "—"} |
| Retrieve | ${metrics.latency.retrieveMs?.p50 ?? "—"} | ${metrics.latency.retrieveMs?.p70 ?? "—"} | ${metrics.latency.retrieveMs?.p95 ?? "—"} | ${metrics.latency.retrieveMs?.max ?? "—"} |
| Rerank | ${metrics.latency.rerankMs?.p50 ?? "—"} | ${metrics.latency.rerankMs?.p70 ?? "—"} | ${metrics.latency.rerankMs?.p95 ?? "—"} | ${metrics.latency.rerankMs?.max ?? "—"} |
| Generate | ${metrics.latency.generateMs?.p50 ?? "—"} | ${metrics.latency.generateMs?.p70 ?? "—"} | ${metrics.latency.generateMs?.p95 ?? "—"} | ${metrics.latency.generateMs?.max ?? "—"} |
| Total | ${metrics.latency.totalMs?.p50 ?? "—"} | ${metrics.latency.totalMs?.p70 ?? "—"} | ${metrics.latency.totalMs?.p95 ?? "—"} | ${metrics.latency.totalMs?.max ?? "—"} |

## Quality

| Metric | Value |
|--------|------:|
| Citation page hit | ${metrics.citationPageHitRate == null ? "—" : `${(metrics.citationPageHitRate * 100).toFixed(1)}%`} |
| Retrieval page hit | ${metrics.retrievalPageHitRate == null ? "—" : `${(metrics.retrievalPageHitRate * 100).toFixed(1)}%`} |
| Keyword hit (avg) | ${metrics.keywordHitRate == null ? "—" : `${(metrics.keywordHitRate * 100).toFixed(1)}%`} |
| Groundedness (off-topic) | ${metrics.groundednessOffTopicRate == null ? "—" : `${(metrics.groundednessOffTopicRate * 100).toFixed(1)}%`} |
| Groundedness (on-topic) | ${metrics.groundednessOnTopicRate == null ? "—" : `${(metrics.groundednessOnTopicRate * 100).toFixed(1)}%`} |
`;
    writeFileSync(join(__dirname, "results", "harness-latest.md"), harnessMd);
    console.log("Wrote harness-latest.json / harness-latest.md");
    if (regression.regress) {
      console.warn("REGRESSION detected vs previous harness-latest");
      process.exitCode = 2;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
