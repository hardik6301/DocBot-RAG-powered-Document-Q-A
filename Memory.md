# DocBot — Memory

## 2026-07-14 — Phase 2 (local mode, no Supabase)

### Decision
Supabase deferred. App runs in **local mode**:
- Fixed dev user (`dev@docbot.local`)
- Files → `public/uploads/`
- Metadata → `.data/documents.json`
- Free tier enforced: 3 documents

### Done
- `GET /api/documents`, `DELETE /api/documents/[id]`, `POST /api/upload`
- Dashboard wired to live list/upload/delete + usage banner
- Chat loads real document + stub `/api/chat` (RAG next)
- Auth helpers fall back to local user when Supabase env empty

### Next
- Phase 3: PDF/PPT chunk + Gemini embeddings + Pinecone (key already in `.env.local`)
- Phase 4: real chat answers
- Later: swap local store/storage for Supabase + Neon

### Note
Do not commit `.env.local` (contains secrets).
