# DocBot

RAG-powered Document Q&A. Upload PDFs/PPTs, ask questions, get answers with source citations.

**GitHub:** https://github.com/hardik6301/DocBot-RAG-powered-Document-Q-A

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js 14 (App Router) + TypeScript + Tailwind |
| LLM / embeddings | Gemini (`gemini-flash-latest`, `gemini-embedding-001` @ 768d) |
| Vector DB | Pinecone (namespace = userId) |
| Auth / files | Supabase Auth + Storage (optional; local JSON fallback) |
| DB | Neon + Prisma (optional; local JSON fallback) |

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

Without Supabase configured, the app runs in **local mode** (fixed `dev@docbot.local` user). Free tier: unlimited while billing is off.

## Auth (local Supabase + Docker)

Requires **Docker Desktop** running on your Mac.

```bash
# 1) Install Docker Desktop → open the app (whale icon in menu bar)
#    https://www.docker.com/products/docker-desktop/

# 2) Start local Supabase stack (API :54321, DB :54322, Studio :54323)
npm run supabase:start

# 3) Write keys into .env.local (keeps Gemini/Pinecone)
npm run supabase:env

# 4) Push Prisma tables into local Postgres
npx prisma db push

# 5) Restart Next
# Ctrl+C then:
npm run dev
```

Then open http://localhost:3000/auth/login → **Sign Up** with email + password (confirmations are off locally).

Useful URLs:
- Studio: http://127.0.0.1:54323  
- Email inbox (Inbucket): http://127.0.0.1:54324  
- Stop stack: `npm run supabase:stop`

Google OAuth is optional later (enable provider in Studio + Google Cloud console).

## Environment

See `.env.example`:

- `GEMINI_API_KEY` — required for ingest + chat  
- `PINECONE_API_KEY` / `PINECONE_INDEX` — required for vectors  
- `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` — optional Pro billing  
- Supabase + Neon — optional durable Auth / Storage / Postgres  

### Supabase + Neon (durable mode)

When these are set, DocBot stops using `.data/*.json` for docs/chats and uses Neon; files go to Supabase Storage.

1. Create a [Supabase](https://supabase.com) project  
2. Enable Email + Google Auth; set redirect URL to `http://localhost:3000/auth/callback` (and your Vercel URL)  
3. Create a **private** Storage bucket named `documents` (or set `SUPABASE_STORAGE_BUCKET`)  
4. Create a [Neon](https://neon.tech) Postgres database  
5. Fill in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
6. Push schema:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
7. Restart `npm run dev` → `/auth/login` → sign in → upload/chat persists in Neon

Without those keys, local mode still works (fixed `dev@docbot.local`).

### Stripe Pro (optional)

1. Create a [Stripe](https://dashboard.stripe.com) product + recurring Price  
2. Put `STRIPE_SECRET_KEY` + `STRIPE_PRICE_ID` in `.env.local`  
3. For webhooks (production): point to `/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`  
4. Locally, success page calls `/api/stripe/confirm` so Pro activates without a webhook  
5. Without Stripe keys, dashboard **Unlock Pro (demo)** still works

## RAG flow

1. **Upload** — save file → extract text → chunk (~500/50 tokens) → embed → Pinecone upsert  
2. **Chat** — embed question → top-5 chunks → grounded Gemini answer + citations  
3. **History** — messages in Neon (`Chat`/`Message`) when `DATABASE_URL` is set; else `.data/chats.json`  

## Docker

Production-style multi-stage image (Node 20 Alpine). Needs a `.env.local` beside the compose file.

```bash
# build + run
npm run docker:up
# or
docker compose up --build
```

- App: http://localhost:3000  
- Local JSON/uploads persist in named volumes (`docbot-data`, `docbot-uploads`)  
- For durable Auth/DB/files, set Supabase + Neon vars in `.env.local` and run `npx prisma db push` against Neon once  
- Stop: `npm run docker:down`

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
| `STRIPE_SECRET_KEY` | Optional (Pro Checkout) |
| `STRIPE_PRICE_ID` | Optional |
| `STRIPE_WEBHOOK_SECRET` | Optional (recommended in production) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional (Auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional (Storage) |
| `DATABASE_URL` | Optional (Neon durable docs/chats) |

4. Deploy → open the URL → `/dashboard` → upload a PDF → chat  

**Notes**
- With Neon + Supabase Storage, docs/chats/files survive Vercel cold starts.  
- Without them, local JSON + Pinecone doc meta still works for demos.  
- `vercel.json` sets `maxDuration: 60` for upload/chat.

## Status

- Phases 0–7 + durable Supabase/Neon adapters (optional env)  
- Local mode remains the default until you add Supabase + Neon keys
