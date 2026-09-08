#!/usr/bin/env node
/**
 * Phase 14.5 — Formal RAG evaluation harness.
 *
 * Uses the golden set at evals/golden/v1.json and the same retrieve→rerank→generate
 * contract as production /api/chat (via evals/run-baseline.mjs).
 *
 * Usage:
 *   npm run eval
 *   CONTEXTUAL=1 RERANK=1 npm run eval
 *   SKIP_INGEST=1 npm run eval   # reuse vectors already in the eval namespace
 *
 * Writes:
 *   evals/results/harness-latest.json|md
 *   evals/results/harness-<timestamp>.json
 *   plus the usual baseline-*-filled.md / raw.json
 *
 * Exit code 2 if PASS rate regresses >5pp or FAIL count rises vs harness-latest.
 */
process.env.HARNESS = "1";
// Match production defaults unless the caller overrides.
if (process.env.CONTEXTUAL === undefined) process.env.CONTEXTUAL = "1";
if (process.env.RERANK === undefined) process.env.RERANK = "1";

await import("./run-baseline.mjs");
