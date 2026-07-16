# DocBot — Build Phases

Build in order. Do not start a phase until the previous phase’s exit criteria are met. Update `Memory.md` after each completed phase (create it when Phase 1 coding starts).

---

## Phase 0 — Project scaffolding

**Goal:** Runnable Next.js app with docs, tooling, and env template.

**Tasks**

- [ ] Initialize Next.js 14 (App Router) + Tailwind
- [ ] Add shadcn/ui base setup
- [ ] Create folder skeleton from `Architecture.md`
- [ ] Add Prisma schema (models only; no migrate yet if DB not ready)
- [ ] Add `.env.example` (keys listed, empty values)
- [ ] Add `.gitignore` (include `.env.local`)
- [ ] Add Dockerfile + docker-compose.yml
- [ ] Add README with setup steps + architecture summary
- [ ] Wire `globals.css` with Design.md CSS variables

**Exit criteria**

- `npm run dev` loads without crash
- Empty landing route renders with brand tokens

---

## Phase 1 — Auth + layout shell

**Goal:** Users can sign in; protected routes exist.

**Tasks**

- [x] Supabase browser + server clients (`lib/supabase/*`)
- [x] Auth callback route (`/auth/callback`)
- [x] Login page: Google + email/password
- [x] Navbar (logged out / logged in states)
- [x] Middleware or server checks: `/dashboard` and `/chat/*` require auth
- [x] On first login: upsert Prisma `User` from Supabase user

**Exit criteria**

- Login → redirect to dashboard
- Logged-out user cannot access dashboard
- User row exists in Neon after first successful auth

---

## Phase 2 — Documents CRUD + upload UI

**Goal:** List/upload/delete documents (metadata + storage); processing can be stubbed.

**Tasks**

- [ ] Prisma migrate against Neon
- [ ] `GET /api/documents`
- [ ] `DELETE /api/documents/[id]` (DB + Storage; Pinecone later if vectors exist)
- [ ] Dashboard page + DocumentCard + empty state
- [ ] FileUpload component (PDF/PPT only)
- [ ] Free-tier banner (e.g. `n/3 documents used`)
- [ ] `POST /api/upload`: store file in Supabase, create Document with `status: "processing"`

**Exit criteria**

- Authenticated user sees their docs only
- Upload creates Storage object + Document row
- Delete removes row + file

---

## Phase 3 — Ingestion pipeline (RAG write path)

**Goal:** Uploaded docs become searchable vectors.

**Tasks**

- [ ] `lib/langchain.js` — load PDF/PPT, split (500 / 50)
- [ ] `lib/gemini.js` — embeddings client
- [ ] `lib/pinecone.js` — upsert with metadata + user namespace
- [ ] Complete upload route: extract → chunk → embed → upsert → update Document (`chunkCount`, `pageCount`, `status: "ready"` | `"failed"`)
- [ ] ProcessingStatus UI on dashboard/upload

**Exit criteria**

- Sample PDF reaches `ready` with `chunkCount > 0`
- Vectors visible in Pinecone for that user’s namespace
- Failed parse sets `status: "failed"`

---

## Phase 4 — Chat Q&A (RAG read path)

**Goal:** Ask questions; get grounded answers + citations.

**Tasks**

- [ ] Chat page `/chat/[docId]` layout (sidebar + thread + input)
- [ ] `POST /api/chat`: embed query → Pinecone top-5 → Gemini answer → return sources
- [ ] Persist Chat + Message rows
- [ ] ChatWindow, ChatInput, SourceCard
- [ ] Quick prompts
- [ ] Guard: only owner can chat with doc; doc must be `ready`

**Exit criteria**

- Question returns answer + ≥1 source when context exists
- Insufficient context yields honest “not in document” style reply
- Messages reload on revisit (history from DB)

---

## Phase 5 — Landing page + polish

**Goal:** Marketing surface + UX hardening.

**Tasks**

- [ ] Landing: hero, demo visual, 3 steps, Free vs Pro cards, CTA
- [ ] Footer
- [ ] Loading / error / empty polish across dashboard + chat
- [ ] Free-tier enforcement on upload API
- [ ] README final pass (env, local, Docker, deploy)

**Exit criteria**

- Landing matches Design.md (brand-first hero)
- Happy path: land → sign up → upload → chat → cite → delete works end-to-end

---

## Phase 6 — Deploy

**Goal:** Production on Vercel.

**Tasks**

- [ ] Push to `github.com/hardik6301/docbot`
- [ ] Configure Vercel env vars
- [ ] Neon + Supabase + Pinecone production projects
- [ ] Supabase Auth redirect URLs for production
- [ ] Smoke test on `docbot.vercel.app`

**Exit criteria**

- Production URL live; auth + upload + chat verified

---

## Phase 7 — Pro features (later)

Only after MVP is stable:

1. [x] Unlimited uploads / `isPro` gating (local demo toggle via `/api/settings`)  
2. [x] Multi-document Q&A (`/chat/multi`)  
3. [x] Export chat history as PDF  
4. [x] Priority processing (Pro badge / label; Stripe later)  
5. [x] Analytics (top questions, insights)  
6. [x] Stripe billing (optional Checkout + webhook + portal; demo toggle fallback)

---

## Suggested session workflow

1. Read `Phases.md` → pick current phase  
2. Read `Rules.md` + `Design.md`  
3. Skim `Memory.md` (once it exists)  
4. Implement only that phase’s tasks  
5. Verify exit criteria  
6. Append progress to `Memory.md`
