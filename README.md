# DocBot

RAG-powered Document Q&A. Upload PDFs/PPTs, ask questions, get answers with source citations.

**GitHub:** https://github.com/hardik6301/DocBot-RAG-powered-Document-Q-A

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js 14 (App Router) + TypeScript + Tailwind |
| LLM / embeddings | Gemini (`gemini-2.0-flash`, `text-embedding-004`) |
| Vector DB | Pinecone (namespace = userId) |
| Local mode | JSON store (`.data/`) + `public/uploads/` (Supabase later) |

## Quick start

```bash
npm install
cp .env.example .env.local
# fill GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX=docbot
npm run dev
```

| Route | URL |
|-------|-----|
| Landing | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| Chat | http://localhost:3000/chat/[docId] |

Without Supabase configured, the app runs in **local mode** (fixed `dev@docbot.local` user). Free tier: 3 documents.

## Environment

See `.env.example`:

- `GEMINI_API_KEY` — required for ingest + chat  
- `PINECONE_API_KEY` / `PINECONE_INDEX` — required for vectors  
- Supabase / Neon — optional until you wire auth & Postgres  

## RAG flow

1. **Upload** — save file → extract text → chunk (~500/50 tokens) → embed → Pinecone upsert  
2. **Chat** — embed question → top-5 chunks → grounded Gemini answer + citations  
3. **History** — messages persisted in `.data/chats.json` and reload on revisit  

## Docker

```bash
docker compose up --build
```

## Deploy (Phase 6)

1. Push to GitHub  
2. Import on Vercel  
3. Set the same env vars in the Vercel project  

## Status

- Phases 0–4: UI + local docs + RAG ingest/chat + history  
- Deferred: Supabase Auth/Storage, Neon Prisma, Vercel production smoke test  
