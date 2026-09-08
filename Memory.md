# DocBot — Memory

## 2026-09-08 — Roadmap lock (Phases 8–14)

### Docs
- `Phases.md` updated: Phases 0–7 marked complete; Phases 8–14 locked with exit criteria
- Immediate next work: **Phase 13 Productivity** (Phase 12 only if RAG quality regresses)
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
1. ~~Phase 8–11~~ **DONE (code)**  
2. **Phase 13** Productivity (next) — skip **Phase 12** unless eval shows retrieval still weak  

### 2026-09-08 — Phase 11 complete (code)
- Mic on `ChatInput` → Web Speech STT → same `/api/chat` RAG path
- UX: Listening → Transcribing → Searching document → Generating answer
- Read aloud (browser TTS) on assistant answers
- Server stage timings (`embed` / `pinecone` / `rerank` / `generate`) + client STT/total; P50/P70/P95 in status strip

### 2026-09-08 — Phase 10 complete (code)
- `/api/chat/compare` — per-doc retrieve + rerank → structured comparison JSON
- `/chat/compare` UI + `ComparisonTable` + comparative citations
- Navbar: Compare link

### 2026-09-08 — Phase 9 complete (code)
- Columns: `summary`, `keyTopics`, `suggestedQuestions` on Document (Supabase migration applied)
- `lib/doc-intelligence.ts` runs at end of ingest
- Chat sidebar `AiOverview` + suggested Q → `onSend`
- Re-upload older docs to generate overview

### Go / no-go after Phase 8
- **Provisional YES → Phase 9** (shipped) → 10 → 11 shipped; **13 next** (12 only if needed)

### 2026-09-08 — Phase 8.4 complete (code)
- `lib/grounding.ts`: score floor + lexical mismatch gate + strict prompt rules
- Chat/multi refuse with standard not-found message when support is weak

### 2026-09-08 — Phase 8.3 complete (code)
- `lib/rerank.ts` + wired into `/api/chat` and `/api/chat/multi`
- Eval defaults to rerank ON; `RERANK=0` for v1-comparable run; results → `baseline-v3-*-filled.md`

### 2026-09-08 — Phase 8.2 complete
- Ingest: Gemini situating prefix → embed `prefix + original`; Pinecone metadata still original `chunkText`
- Existing user docs need **re-upload** to get contextual vectors

### 2026-09-08 — Phase 8.1 complete
- Results: 18 PASS / 4 PARTIAL / 0 FAIL → 81.8% PASS
- Runner: `evals/run-baseline.mjs`

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
