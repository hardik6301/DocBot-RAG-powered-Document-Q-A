# DocBot — Memory

## 2026-09-08 — Roadmap lock (Phases 8–14)

### Docs
- `Phases.md` updated: Phases 0–7 marked complete; Phases 8–14 locked with exit criteria
- Immediate next work: **Phase 8.1 baseline testing** (no code until that artifact exists)
- Rule: upgrade the single RAG pipeline; no parallel RAG stacks

### Current production reality
- Live: https://thedocbot.vercel.app
- Auth: Supabase (`awifaeoqgjnmzlvapesh`)
- DB: Supabase Postgres + Prisma (`User`, `Document`, `Chat`, `Message`)
- Vectors: Pinecone; namespace = user `supabaseId`
- Files: Supabase Storage (`documents`) with local fallback
- `BILLING_ENABLED = false` (Pro features usable; Stripe dormant)
- DB failures → **503** (not fake 401) via `requireUserOrResponse`
- `DATABASE_URL` must be **Session pooler** with URL-encoded password (`@` → `%40`)

### Core RAG contract (do not break)
```
Document → ingest → chunks → embed → Pinecone
→ retrieve → (optional rerank) → generate → citations
```

### Next slice
1. ~~Phase 8.1~~ **DONE** — 81.8% PASS  
2. ~~Phase 8.2~~ **DONE** — contextual chunking on ingest (`lib/contextualize.ts` + `lib/ingest.ts`)  
3. **Phase 8.3** Gemini rerank + re-test (next)  
4. Then 8.4 guardrails + re-test  

### 2026-09-08 — Phase 8.2 complete
- Ingest: Gemini situating prefix → embed `prefix + original`; Pinecone metadata still original `chunkText`
- Chat unchanged (still cites `chunkText`)
- Re-eval: `CONTEXTUAL=1 node evals/run-baseline.mjs` → `evals/results/baseline-v2-contextual-filled.md`
- Existing user docs need **re-upload** to get contextual vectors

### 2026-09-08 — Phase 8.1 complete
- Runner: `evals/run-baseline.mjs` (mirrors `/api/chat` retrieve→generate)
- Results: 18 PASS / 4 PARTIAL / 0 FAIL after human override on B7
- Patterns: citation page ranking weak on a few Qs; off-topic A8 refused correctly
- Fixtures + scorecard under `evals/`

---

## 2026-08 — Auth / DB production hardening (shipped)

- Fake Unauthorized from Prisma/DB failures → clear 503 + hints (`lib/auth.ts`)
- `supabase/schema.sql` for SQL Editor / MCP apply
- Session pooler `DATABASE_URL` verified locally (`SELECT 1`)
- Marketing hero + claymorphic icons + navbar polish
- Prior: processing stuck, duplicate cards, chat 404/500 for Pinecone-only ids, PDF DOMMatrix on Vercel, cold-path speedups

---

## 2026-07-16 — Production Docker polish

### Shipped
- Multi-stage `Dockerfile` (deps → build → runner as `nextjs`)
- `.dockerignore` (keeps secrets + `.data` out of image)
- `docker-compose.yml` named volumes + healthcheck
- `postinstall` / `build` run `prisma generate`; `docker:up` / `docker:down` scripts

---

## 2026-07-16 — Supabase Auth + Storage + durable Postgres

### Shipped
- Prisma schema: Chat `userId`/`kind`, optional `documentId`, User Stripe fields
- Dual-mode stores: Postgres when `DATABASE_URL`, else `.data` JSON
- Supabase Storage via service role (`lib/storage/files.ts`, bucket `documents`)
- Ingest materializes Storage files to temp for parsers
- Auth: no silent fallback to local user when Supabase fails
- Middleware protects `/analytics` + `/billing`

---

## 2026-07-16 — Phase 7 Pro features

### Shipped
- `isPro` via settings + demo toggle
- Multi-doc Q&A: `/api/chat/multi` + `/chat/multi`
- Chat PDF export
- Analytics
- Stripe Checkout / confirm / webhook / portal (optional; demo fallback)

---

## 2026-07-16 — Phase 6 deploy

- Vercel deploy + env
- Pinecone meta registry for serverless doc list
- Dashboard `DeployBanner`
