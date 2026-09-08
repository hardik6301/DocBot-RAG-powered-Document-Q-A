/** Formal RAG eval metrics + regression helpers (Phase 14.5). */

export function isRefuse(answer) {
  return /could not find|couldn't find|cannot find|can't find|not (found|in|mentioned)|insufficient|no (relevant )?information|don't know|do not contain|uploaded document/i.test(
    answer || "",
  );
}

export function scoreAnswer(row, answer, sources) {
  const a = (answer || "").toLowerCase();
  const refuse = isRefuse(answer);

  if (row.offTopic) {
    const leakedParis = /paris/i.test(answer || "") && !refuse;
    if (refuse && !leakedParis) return "PASS";
    if (leakedParis) return "FAIL";
    return "PARTIAL";
  }

  if (refuse) return "FAIL";

  const hits = (row.keywords || []).filter((k) => a.includes(k.toLowerCase()));
  const need = Math.max(1, Math.ceil((row.keywords || []).length * 0.5));
  const srcPage = sources[0]?.page;
  const expectPage = row.expectSrc?.match(/p(\d+)/)?.[1];
  const pageOk =
    !expectPage || srcPage == null || String(srcPage) === expectPage;

  if (hits.length >= need && pageOk) return "PASS";
  if (hits.length >= need) return "PARTIAL";
  if (hits.length > 0) return "PARTIAL";
  return "FAIL";
}

export function gradeCase(row, answer, sources, ranked = []) {
  const result = scoreAnswer(row, answer, sources);
  const expectPage = Number(row.expectSrc?.match(/p(\d+)/)?.[1] || NaN);
  const hasExpectPage = Number.isFinite(expectPage);
  const topPage = ranked[0]?.page ?? sources[0]?.page ?? null;
  const citationHit = !hasExpectPage
    ? null
    : topPage != null && Number(topPage) === expectPage;
  const retrievalHit = !hasExpectPage
    ? null
    : ranked.some((m) => Number(m.page) === expectPage) ||
      sources.some((s) => Number(s.page) === expectPage);

  const keywords = row.keywords || [];
  const a = (answer || "").toLowerCase();
  const keywordHits = keywords.filter((k) => a.includes(k.toLowerCase()));
  const keywordRate = row.offTopic
    ? null
    : keywords.length
      ? keywordHits.length / keywords.length
      : null;

  const refuse = isRefuse(answer);
  const groundedOk = row.offTopic ? refuse && result !== "FAIL" : !refuse;

  return {
    result,
    citationHit,
    retrievalHit,
    keywordRate,
    keywordHits: keywordHits.length,
    keywordTotal: keywords.length,
    refuse,
    groundedOk,
  };
}

export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx];
}

export function summarizeLatencies(rows) {
  const fields = [
    "embedMs",
    "retrieveMs",
    "rerankMs",
    "generateMs",
    "totalMs",
  ];
  const out = {};
  for (const f of fields) {
    const values = rows
      .map((r) => r.latency?.[f])
      .filter((v) => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => a - b);
    if (!values.length) {
      out[f] = null;
      continue;
    }
    out[f] = {
      p50: percentile(values, 50),
      p70: percentile(values, 70),
      p95: percentile(values, 95),
      max: values[values.length - 1],
      n: values.length,
    };
  }
  return out;
}

export function aggregateMetrics(rows) {
  const pass = rows.filter((r) => r.result === "PASS").length;
  const partial = rows.filter((r) => r.result === "PARTIAL").length;
  const fail = rows.filter((r) => r.result === "FAIL").length;
  const total = rows.length || 1;

  const withCite = rows.filter((r) => r.metrics?.citationHit != null);
  const citeHits = withCite.filter((r) => r.metrics.citationHit).length;
  const withRet = rows.filter((r) => r.metrics?.retrievalHit != null);
  const retHits = withRet.filter((r) => r.metrics.retrievalHit).length;
  const withKw = rows.filter(
    (r) => typeof r.metrics?.keywordRate === "number",
  );
  const kwAvg = withKw.length
    ? withKw.reduce((s, r) => s + r.metrics.keywordRate, 0) / withKw.length
    : null;
  const offTopic = rows.filter((r) => r.offTopic);
  const groundedOffTopic = offTopic.filter((r) => r.metrics?.groundedOk).length;
  const onTopic = rows.filter((r) => !r.offTopic);
  const groundedOnTopic = onTopic.filter((r) => r.metrics?.groundedOk).length;

  return {
    total: rows.length,
    pass,
    partial,
    fail,
    passRate: pass / total,
    citationPageHitRate: withCite.length ? citeHits / withCite.length : null,
    retrievalPageHitRate: withRet.length ? retHits / withRet.length : null,
    keywordHitRate: kwAvg,
    groundednessOffTopicRate: offTopic.length
      ? groundedOffTopic / offTopic.length
      : null,
    groundednessOnTopicRate: onTopic.length
      ? groundedOnTopic / onTopic.length
      : null,
    latency: summarizeLatencies(rows),
  };
}

/**
 * Compare current harness metrics to a prior run.
 * Regression if PASS rate drops >5pp or FAIL count rises.
 */
export function compareRegression(current, previous) {
  if (!previous?.metrics) {
    return { hasBaseline: false, regress: false, notes: ["No prior harness-latest.json"] };
  }
  const cur = current.metrics;
  const prev = previous.metrics;
  const passDelta = cur.passRate - prev.passRate;
  const failDelta = cur.fail - prev.fail;
  const latPrev = prev.latency?.totalMs?.p50;
  const latCur = cur.latency?.totalMs?.p50;
  const latencyDelta =
    typeof latPrev === "number" && typeof latCur === "number"
      ? latCur - latPrev
      : null;

  const notes = [];
  notes.push(
    `PASS rate ${(prev.passRate * 100).toFixed(1)}% → ${(cur.passRate * 100).toFixed(1)}% (${passDelta >= 0 ? "+" : ""}${(passDelta * 100).toFixed(1)}pp)`,
  );
  notes.push(`FAIL count ${prev.fail} → ${cur.fail} (${failDelta >= 0 ? "+" : ""}${failDelta})`);
  if (latencyDelta != null) {
    notes.push(`Latency P50 ${latPrev}ms → ${latCur}ms (${latencyDelta >= 0 ? "+" : ""}${latencyDelta}ms)`);
  }

  const regress = passDelta < -0.05 || failDelta > 0;
  return {
    hasBaseline: true,
    regress,
    passRateDelta: passDelta,
    failDelta,
    latencyP50DeltaMs: latencyDelta,
    notes,
  };
}
