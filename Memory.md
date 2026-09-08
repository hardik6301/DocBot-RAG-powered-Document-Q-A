# DocBot — Memory

## 2026-09-08 — Roadmap lock (Phases 8–14)

### Docs
- `Phases.md` updated: Phases 0–7 marked complete; Phases 8–14 locked with exit criteria
- Immediate next work: **Phase 14.6 Collaboration** (last) — or **14.4 Monetization** only if enabling Stripe
- Rule: upgrade the single RAG pipeline; no parallel RAG stacks

### Current production reality
- Live: https://thedocbot.vercel.app
- Auth: Supabase (`awifaeoqgjnmzlvapesh`)
- DB: Supabase Postgres + Prisma (`User`, `Document`, `Chat`, `Message`, `IngestJob`)
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
1. ~~Phase 8–13~~ **DONE**  
2. ~~Phase 14.1–14.3 + 14.5~~ **DONE (code)**  
3. **Phase 14.4** monetization deferred (`BILLING_ENABLED=false`)  
4. **Phase 14.6** collaboration (last)  

### 2026-09-08 — Phase 14.5 complete (code)
- Golden set: `evals/golden/v1.json` (22 Qs); baseline runner loads it
- Formal harness: `npm run eval` → PASS/citation/retrieval/keyword/groundedness + stage latency P50/P70/P95
- Regression vs `harness-latest.json` (exit 2 on >5pp PASS drop or more FAILs)
- `SKIP_INGEST=1` for fast re-asks; 14.4 Stripe intentionally skipped

### 2026-09-08 — Phase 14.3 complete (code)
- `IngestJob` table + local JSON fallback; upload/URL enqueue and return **202** while `processing`
- Worker: `processIngestJob` with claim lock, up to 3 attempts + backoff; `@vercel/functions` `waitUntil` + client `/api/ingest/run` kick
- Retry UI on failed cards → `POST /api/ingest/retry`; dashboard polls every 2.5s while processing
- Logs: `ingest.job.enqueued` / `attempt` / `retry` / `complete` / `failed`

### 2026-09-08 — Phase 14.2 complete (code)
- Scanned PDF OCR via Gemini multimodal when pdf-parse text is empty/sparse (`lib/ocr.ts`)
- EPUB spine/chapter extract (`lib/epub.ts`) through same ingest path
- URL import: `POST /api/ingest/url` + dashboard `UrlImport` (SSRF host blocklist, 2MB/15s caps)
- Logs: `ingest.ocr`, `ingest.url`

### 2026-09-08 — Phase 14.1 complete (code)
- Ingest: `.txt` / `.md` (+ markdown heading sections); improved DOCX paragraph/page-break packing
- Upload accept + type detect updated; same Pinecone RAG path
- Rate limits: upload 20/hour, chat 60/min (in-memory); `X-RateLimit-*` headers
- Structured logs: `ingest.complete` / `ingest.failed` / `chat.complete`

### 2026-09-08 — Phase 13 complete (code)
- Document org: `folder`, `tags`, `archived`/`archivedAt` (+ indexes); `PATCH /api/documents/[id]`
- Library search across filename/folder/tags/summary/topics; folder + tag filters; archive view
- Chat history: `Chat.title`, `/history`, `GET /api/chats`, rename via `PATCH /api/chats/[id]`
- Auto-title from first user question on append

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
- **Provisional YES → Phase 9…13 + 14.1–14.3 + 14.5 shipped; 14.6 next** (14.4 deferred; 12 only if needed)

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
