# DocBot evals

Manual RAG quality benchmarks (Phase 8+). No automated harness yet.

## Phase 8.1 — Baseline

```bash
# ingest fixtures + ask all questions (needs GEMINI + PINECONE in .env.local)
node evals/run-baseline.mjs
```

Writes `results/baseline-v1-filled.md` and `results/baseline-v1-raw.json`.

**v1 result (2026-09-08):** 18 PASS / 4 PARTIAL / 0 FAIL → **81.8% PASS**

Manual UI option: upload `fixtures/` PDFs and fill a copy of `baseline-v1.md` by hand.

**Do not change retrieval code until this baseline exists** (it does). Phases 8.2–8.4 re-run the same questions for before/after.

## Fixtures

| File | Topic |
|------|--------|
| `fixtures/acme-software-engineer-jd.pdf` | Job description |
| `fixtures/acme-refund-policy.pdf` | Refund policy |
| `fixtures/acme-intern-onboarding.pdf` | Intern onboarding |

## Later phases

### 8.2 contextual re-test

```bash
CONTEXTUAL=1 node evals/run-baseline.mjs
```

Writes `results/baseline-v2-contextual-filled.md`. Compare PASS rate to v1 (81.8%).

**Production docs:** delete + re-upload (or re-ingest) so vectors use contextual embeddings. Citations still show original chunk text.

After 8.3, copy filled sheets to e.g. `results/baseline-v3-after-rerank.md` and compare on the **same** questions.
