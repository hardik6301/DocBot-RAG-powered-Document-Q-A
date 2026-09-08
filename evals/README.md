# DocBot evals

RAG quality benchmarks. Phase 8 established the baseline; Phase 14.5 adds a formal harness with metrics + regression.

## Golden set

`evals/golden/v1.json` — 22 questions over 3 Acme fixtures (answer keywords, expected page, off-topic flag).

## Formal harness (Phase 14.5)

```bash
# Needs GEMINI_API_KEY + PINECONE_* in .env.local
npm run eval
```

Defaults: `CONTEXTUAL=1` `RERANK=1` (production-like). Writes:

| Artifact | Purpose |
|----------|---------|
| `results/harness-latest.json` | Metrics + per-Q latency; compared on next run |
| `results/harness-latest.md` | Human summary |
| `results/harness-<stamp>.json` | Immutable run archive |
| `results/baseline-v3-contextual-rerank-*.{md,json}` | Detailed Q&A table |

**Metrics:** PASS/PARTIAL/FAIL, citation page hit, retrieval page hit, keyword hit rate, groundedness (off-topic + on-topic), latency P50/P70/P95 for embed / retrieve / rerank / generate / total.

**Regression:** exit code `2` if PASS rate drops &gt;5pp or FAIL count rises vs previous `harness-latest.json`.

```bash
# Re-run questions only (vectors already in eval namespace)
SKIP_INGEST=1 npm run eval

# Compare without rerank / without contextual
CONTEXTUAL=0 RERANK=0 npm run eval
```

## Legacy baseline runner (Phase 8)

```bash
npm run eval:baseline
# or: node evals/run-baseline.mjs
```

Same pipeline; omit harness regression files unless `HARNESS=1`.

**v1 result (2026-09-08):** 18 PASS / 4 PARTIAL / 0 FAIL → **81.8% PASS**

## Fixtures

| File | Topic |
|------|--------|
| `fixtures/acme-software-engineer-jd.pdf` | Job description |
| `fixtures/acme-refund-policy.pdf` | Refund policy |
| `fixtures/acme-intern-onboarding.pdf` | Intern onboarding |

## Scoring

- **PASS** — factual + grounded; citation page roughly matches  
- **PARTIAL** — right idea but missing detail / weak citation  
- **FAIL** — wrong, hallucinated, or answers off-doc as true  
