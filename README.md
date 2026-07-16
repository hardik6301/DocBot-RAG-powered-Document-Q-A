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

## Deploy (Phase 6) — Vercel

Repo: https://github.com/hardik6301/DocBot-RAG-powered-Document-Q-A

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** this GitHub repo  
2. Framework: **Next.js** (auto-detected)  
3. **Environment variables** (Production + Preview):

| Name | Required |
|------|----------|
| `GEMINI_API_KEY` | Yes |
| `PINECONE_API_KEY` | Yes |
| `PINECONE_INDEX` | Yes (`docbot`) |
| `NEXT_PUBLIC_APP_URL` | Yes (set after first deploy to your `*.vercel.app` URL) |

4. Deploy → open the URL → `/dashboard` → upload a PDF → chat  

**Notes**
- On Vercel, document list/metadata syncs to **Pinecone** (survives cold starts).  
- Chat history is still ephemeral until Supabase.  
- Supabase/Neon not required for the MVP demo.  
- `vercel.json` sets `maxDuration: 60` for upload/chat.

## Status

- Phases 0–4: UI + local docs + RAG ingest/chat + history  
- Deferred: Supabase Auth/Storage, Neon Prisma, Vercel production smoke test  
