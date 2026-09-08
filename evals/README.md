# DocBot evals

Manual RAG quality benchmarks (Phase 8+). No automated harness yet.

## Phase 8.1 — Baseline

1. Start DocBot (`npm run dev`) and sign in.  
2. Upload the three PDFs in `fixtures/` (separate uploads).  
3. Wait until each doc is **ready**.  
4. Open chat per document and ask every question in `baseline-v1.md`.  
5. Copy the template:

```bash
cp evals/baseline-v1.md evals/results/baseline-v1-filled.md
```

6. Fill **Actual answer**, **Actual source**, **Result** (PASS / PARTIAL / FAIL).  
7. Complete the Summary + failure-pattern checkboxes.  
8. Update `Memory.md` with PASS rate, then commit that results slice.

**Do not change retrieval code until the filled baseline exists.** Phases 8.2–8.4 need this before/after score.

## Fixtures

| File | Topic |
|------|--------|
| `fixtures/acme-software-engineer-jd.pdf` | Job description |
| `fixtures/acme-refund-policy.pdf` | Refund policy |
| `fixtures/acme-intern-onboarding.pdf` | Intern onboarding |

## Later phases

After 8.2 / 8.3, copy the filled sheet to e.g. `results/baseline-v2-after-rerank.md` and compare PASS rates on the **same** questions.
