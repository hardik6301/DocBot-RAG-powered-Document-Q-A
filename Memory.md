# DocBot — Memory

## 2026-07-15 — Phase 3 RAG ingest (+ Phase 4 chat API)

### GitHub
- Remote: `https://github.com/hardik6301/DocBot-RAG-powered-Document-Q-A.git`
- Local `main` tracks `origin/main`

### Phase 3 done
- `lib/langchain.ts` — PDF/PPT/DOCX text extract + chunk (~500/50 token approx)
- `lib/gemini.ts` — `text-embedding-004` + grounded answer (gemini-2.0-flash)
- `lib/pinecone.ts` — ensure index, upsert, query, delete by docId
- `lib/ingest.ts` — full pipeline
- Upload route runs ingest → `ready` with chunkCount, or `failed`
- Delete removes local file + Pinecone vectors
- Dashboard shows ProcessingStatus while indexing

### Phase 4 (API wired)
- `POST /api/chat` embeds question → Pinecone top-5 → Gemini grounded answer + sources

### Blocker for live test
- `.env.local` needs `GEMINI_API_KEY` (currently empty)
- Pinecone key/index already set

### Still deferred
- Supabase auth/storage, Neon Prisma migrate
- Persist chat messages to DB
