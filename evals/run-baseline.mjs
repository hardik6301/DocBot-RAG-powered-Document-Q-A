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

const DOCS = [
  {
    id: "eval-doc-a",
    label: "A",
    file: "acme-software-engineer-jd.pdf",
    filename: "acme-software-engineer-jd.pdf",
  },
  {
    id: "eval-doc-b",
    label: "B",
    file: "acme-refund-policy.pdf",
    filename: "acme-refund-policy.pdf",
  },
  {
    id: "eval-doc-c",
    label: "C",
    file: "acme-intern-onboarding.pdf",
    filename: "acme-intern-onboarding.pdf",
  },
];

/** @type {{id:string,doc:string,q:string,expect:string,expectSrc:string,keywords:string[],offTopic?:boolean}[]} */
const QUESTIONS = [
  {
    id: "A1",
    doc: "A",
    q: "What is the job title and location?",
    expect: "Software Engineer (Backend); Bengaluru; Hybrid 3 days",
    expectSrc: "A p1",
    keywords: ["software engineer", "bengaluru", "hybrid"],
  },
  {
    id: "A2",
    doc: "A",
    q: "What is the minimum years of experience required?",
    expect: "2 years",
    expectSrc: "A p1",
    keywords: ["2 year"],
  },
  {
    id: "A3",
    doc: "A",
    q: "Which programming languages are required?",
    expect: "TypeScript or JavaScript",
    expectSrc: "A p1",
    keywords: ["typescript", "javascript"],
  },
  {
    id: "A4",
    doc: "A",
    q: "Is a CS degree mandatory?",
    expect: "CS/IT or equivalent practical experience",
    expectSrc: "A p1",
    keywords: ["equivalent", "computer science", "bachelor"],
  },
  {
    id: "A5",
    doc: "A",
    q: "What AWS-related preference is listed?",
    expect: "AWS S3/Lambda/ECS preferred",
    expectSrc: "A p2",
    keywords: ["aws", "preferred"],
  },
  {
    id: "A6",
    doc: "A",
    q: "What is the salary range?",
    expect: "INR 18,00,000 to 28,00,000",
    expectSrc: "A p2",
    keywords: ["18", "28"],
  },
  {
    id: "A7",
    doc: "A",
    q: "How do candidates apply?",
    expect: "careers@acme.example subject SE-Backend-2026",
    expectSrc: "A p2",
    keywords: ["careers@acme", "se-backend"],
  },
  {
    id: "A8",
    doc: "A",
    q: "What is the capital of France?",
    expect: "Refuse / not in document",
    expectSrc: "—",
    keywords: [],
    offTopic: true,
  },
  {
    id: "B1",
    doc: "B",
    q: "When did this policy become effective?",
    expect: "1 January 2026",
    expectSrc: "B p1",
    keywords: ["january", "2026"],
  },
  {
    id: "B2",
    doc: "B",
    q: "Within how many days can a monthly Pro subscription be refunded?",
    expect: "14 days if fewer than 3 uploads",
    expectSrc: "B p1",
    keywords: ["14"],
  },
  {
    id: "B3",
    doc: "B",
    q: "What is the refund window for annual Pro?",
    expect: "30 days",
    expectSrc: "B p1",
    keywords: ["30"],
  },
  {
    id: "B4",
    doc: "B",
    q: "Are partially used credit packs refundable?",
    expect: "No",
    expectSrc: "B p1",
    keywords: ["not refundable", "non-refundable", "are not", "no"],
  },
  {
    id: "B5",
    doc: "B",
    q: "How long after approval until money returns?",
    expect: "7 business days",
    expectSrc: "B p1",
    keywords: ["7"],
  },
  {
    id: "B6",
    doc: "B",
    q: "How do I request a refund and what must I include?",
    expect: "billing@acme.example + email, invoice, reason",
    expectSrc: "B p2",
    keywords: ["billing@acme", "invoice"],
  },
  {
    id: "B7",
    doc: "B",
    q: "What happens with unexplained chargebacks?",
    expect: "Account suspension pending review",
    expectSrc: "B p2",
    keywords: ["suspend"],
  },
  {
    id: "B8",
    doc: "B",
    q: "Can I get a refund after 60 days on a monthly plan?",
    expect: "No — outside 14-day window",
    expectSrc: "B p2",
    keywords: ["no", "not", "14", "window", "eligible"],
  },
  {
    id: "C1",
    doc: "C",
    q: "Which Slack workspace should interns join?",
    expect: "acme-eng-interns",
    expectSrc: "C p1",
    keywords: ["acme-eng-interns"],
  },
  {
    id: "C2",
    doc: "C",
    q: "By when must security training SEC-101 be completed?",
    expect: "Before Day 3",
    expectSrc: "C p1",
    keywords: ["day 3", "sec-101"],
  },
  {
    id: "C3",
    doc: "C",
    q: "How long are weekly mentor meetings?",
    expect: "30 minutes; first by Friday Week 1",
    expectSrc: "C p1",
    keywords: ["30"],
  },
  {
    id: "C4",
    doc: "C",
    q: "What are core office hours?",
    expect: "11:00–16:00 IST",
    expectSrc: "C p2",
    keywords: ["11", "16"],
  },
  {
    id: "C5",
    doc: "C",
    q: "When do interns present their demo and how long is it?",
    expect: "Week 8; 10-minute demo",
    expectSrc: "C p2",
    keywords: ["week 8", "10"],
  },
  {
    id: "C6",
    doc: "C",
    q: "Should interns commit .env files to git?",
    expect: "No — do not commit secrets",
    expectSrc: "C p1",
    keywords: ["not", "secret", "do not", "never", "no"],
  },
];

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

function scoreAnswer(row, answer, sources) {
  const a = (answer || "").toLowerCase();
  const refuse =
    /could not find|cannot find|can't find|not (found|in|mentioned)|insufficient|no (relevant )?information|don't know|do not contain/i.test(
      answer || "",
    );

  if (row.offTopic) {
    const leakedParis = /paris/i.test(answer || "") && !refuse;
    if (refuse && !leakedParis) return "PASS";
    if (leakedParis) return "FAIL";
    return "PARTIAL";
  }

  if (refuse) return "FAIL";

  const hits = row.keywords.filter((k) => a.includes(k.toLowerCase()));
  const need = Math.max(1, Math.ceil(row.keywords.length * 0.5));
  const srcPage = sources[0]?.page;
  const expectPage = row.expectSrc.match(/p(\d+)/)?.[1];
  const pageOk =
    !expectPage || srcPage == null || String(srcPage) === expectPage;

  if (hits.length >= need && pageOk) return "PASS";
  if (hits.length >= need) return "PARTIAL";
  if (hits.length > 0) return "PARTIAL";
  return "FAIL";
}

function escCell(s) {
  return String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .slice(0, 280);
}

async function main() {
  console.log("Namespace:", NS, "contextual=", CONTEXTUAL, "rerank=", RERANK);
  const index = await getIndex();

  try {
    await index.deleteAll({ namespace: NS });
    console.log("Cleared eval namespace");
  } catch (e) {
    console.warn("deleteAll skipped:", e.message?.slice(0, 80));
  }

  const docByLabel = Object.fromEntries(DOCS.map((d) => [d.label, d]));

  for (const doc of DOCS) {
    const abs = join(__dirname, "fixtures", doc.file);
    console.log("Ingesting", doc.file);
    const pages = await loadPdf(abs);
    const chunks = splitPages(pages);
    console.log(`  pages=${pages.length} chunks=${chunks.length} contextual=${CONTEXTUAL}`);
    const preview = pages.map((p) => `Page ${p.page}: ${p.text}`).join("\n\n");
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

  const rows = [];
  for (const q of QUESTIONS) {
    process.stdout.write(`Q ${q.id}… `);
    const doc = docByLabel[q.doc];
    const vector = await embedOne(q.q, "RETRIEVAL_QUERY");
    const matches = await querySimilar(index, vector, doc.id);
    const usable = matches.filter((m) => m.chunkText && m.score > SCORE_MIN);
    const ranked = RERANK
      ? await rerankChunks(q.q, usable, TOP_K)
      : usable.slice(0, TOP_K);
    let answer;
    let sources = [];
    if (ranked.length === 0) {
      answer =
        "I could not find relevant information in this document for that question.";
    } else {
      sources = ranked.map((m) => ({
        chunkText: m.chunkText,
        page: m.page,
        filename: m.filename || doc.filename,
        score: m.score,
      }));
      answer = await generateGroundedAnswer(
        q.q,
        sources.map((s) => ({
          text: s.chunkText,
          page: s.page,
          filename: s.filename,
        })),
      );
    }
    const withScores = ranked
      .slice(0, 3)
      .map((m) => `p${m.page} @${(m.score ?? 0).toFixed(2)}`);
    const result = scoreAnswer(q, answer, sources);
    console.log(result);
    rows.push({
      ...q,
      answer,
      actualSrc: withScores.join("; ") || "—",
      result,
    });
    await sleep(800);
  }

  const pass = rows.filter((r) => r.result === "PASS").length;
  const partial = rows.filter((r) => r.result === "PARTIAL").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const a8 = rows.find((r) => r.id === "A8");

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

  const md = `# DocBot RAG Baseline v1 — FILLED

**Phase:** 8.1  
**Run date:** ${new Date().toISOString()}  
**Runner:** \`node evals/run-baseline.mjs\` (same retrieve→generate contract as \`/api/chat\`)  
**Namespace:** \`${NS}\`  
**topK:** ${TOP_K}, score floor: ${SCORE_MIN}

## Summary

| Metric | Count |
|--------|------:|
| Total questions | ${rows.length} |
| PASS | ${pass} |
| PARTIAL | ${partial} |
| FAIL | ${fail} |
| PASS rate (PASS / total) | ${((pass / rows.length) * 100).toFixed(1)}% |
| Off-topic refusal (A8) | ${a8?.result ?? "n/a"} |

### Observed failure patterns

${fail + partial === 0 ? "- None (all PASS)" : ""}
${rows.some((r) => r.result !== "PASS" && !r.offTopic) ? "- See non-PASS rows below for missed keywords / page mismatch / weak retrieval" : ""}
${a8?.result === "FAIL" ? "- Off-topic answered with Paris (guardrail gap — Phase 8.4)" : ""}
${a8?.result === "PASS" ? "- Off-topic correctly refused" : ""}

## Document A — Software Engineer JD

${table(byDoc.A)}

## Document B — Refund Policy

${table(byDoc.B)}

## Document C — Intern Onboarding

${table(byDoc.C)}

## Phase 8.1 exit checklist

- [x] Fixtures chosen  
- [x] Questions + expected answers  
- [x] Baseline executed on current RAG path  
- [x] Actual columns filled  
- [x] PASS/FAIL marked  
- [x] Failure patterns noted  
`;

  mkdirSync(join(__dirname, "results"), { recursive: true });
  const outName = CONTEXTUAL
    ? RERANK
      ? "baseline-v3-contextual-rerank-filled.md"
      : "baseline-v2-contextual-filled.md"
    : RERANK
      ? "baseline-v3-rerank-filled.md"
      : "baseline-v1-filled.md";
  const outPath = join(__dirname, "results", outName);
  writeFileSync(outPath, md);
  writeFileSync(
    join(__dirname, "results", outName.replace("-filled.md", "-raw.json")),
    JSON.stringify({ pass, partial, fail, rows }, null, 2),
  );
  console.log("\nWrote", outPath);
  console.log(`PASS ${pass} / PARTIAL ${partial} / FAIL ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
