# DocBot — AI Coding Rules

Rules for any AI agent or human implementing this project. Follow these unless the user explicitly overrides them.

---

## 1. Stack Lock (use these)

| Allowed | Notes |
|---------|--------|
| Next.js 14 App Router | `app/` directory only; no Pages Router |
| JavaScript (`.jsx` / `.js`) | Match PRD folder structure; no TypeScript migration unless asked |
| Tailwind CSS | Primary styling |
| shadcn/ui | Prefer for Button, Badge, Input, Dialog, etc. |
| Prisma + Neon | All relational data |
| Supabase Auth + Storage | Auth and file blobs |
| Pinecone | Vectors only |
| LangChain | Document load + text split |
| Gemini | Embeddings + chat generation |
| Docker / Compose | Local container option |

### Do not introduce without explicit approval

- LangChain alternatives (LlamaIndex, custom parsers) as primary path
- Other LLMs (OpenAI, Claude) as default
- Other vector DBs (Chroma, Weaviate, pgvector) as default
- Redux / Zustand / Jotai unless prop drilling becomes painful
- TypeScript rewrite
- Separate Express/Fastify backend
- MongoDB / Firebase Firestore for app data

---

## 2. Project Docs Authority

| File | Role |
|------|------|
| `PRD.md` | What to build / scope |
| `Architecture.md` | How systems connect |
| `Design.md` | Visual system |
| `Phases.md` | Build order — **do not skip ahead** |
| `Rules.md` | This file |
| `Memory.md` | Progress log once coding starts — update after meaningful work |

If docs conflict with code, update docs only when the user confirms a product change.

---

## 3. Code Style

- Match existing patterns once the repo has code.
- Prefer small, focused files over god modules.
- Keep API route handlers thin: validate → auth → call `lib/` → return JSON.
- Put Gemini / Pinecone / LangChain / Prisma behind `lib/*` clients.
- Use JSDoc in `types/index.js` for shared shapes (sources, document status, API payloads).
- No unused deps, no drive-by refactors, no unsolicited markdown docs beyond these project files.
- No emojis in UI copy or code comments unless the user asks.

---

## 4. Auth & Security

- Every `/api/*` route that touches user data must verify the Supabase session.
- Never trust client-sent `userId` alone — resolve user from session.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` / `PINECONE_API_KEY` to the client.
- Pinecone namespace must equal the authenticated user's id.
- On delete: remove Neon row, Storage object, and Pinecone vectors (best-effort + log failures).
- Validate file type (PDF/PPT only) and reasonable size limits on upload.
- Sanitize / constrain prompts: instruct the model to answer **only** from provided context; if insufficient, say so.

---

## 5. RAG Constraints

- Chunk size: **500** tokens; overlap: **50** tokens (unless user changes Architecture).
- Retrieval: top **5** chunks by default.
- Always return sources with answers when chunks were found.
- Document `status` must move: `processing` → `ready` or `failed`.
- Do not mark `ready` until vectors are upserted and metadata is saved.
- On ingest failure: set `status: "failed"` and return a clear error.

---

## 6. Error Handling

- API responses: consistent JSON `{ error: string }` with proper HTTP status (401, 400, 404, 500).
- Never swallow errors silently in ingest/chat paths — log server-side, surface user-safe messages.
- UI: loading, empty, and error states for dashboard, upload, and chat.
- Prefer skeletal loaders over generic spinners for list/chat layouts when feasible.

---

## 7. UI Rules

- Follow `Design.md` tokens and layout rules strictly.
- Landing: one hero composition — brand first, one headline, one supporting line, one CTA group, one dominant demo visual.
- Dashboard/chat: functional product UI — cards only where they aid interaction (document cards, source cards).
- No purple-neon “AI slop” gradients; no Inter/Roboto/Arial as primary fonts.
- Responsive: desktop + mobile; use `min-h-[100dvh]` not `h-screen` for full-viewport sections.

---

## 8. Environment & Secrets

- Local: `.env.local` (gitignored).
- Document required keys in README; never commit real keys.
- Docker Compose reads `.env.local`.

---

## 9. Git & Scope Discipline

- Implement only the current phase in `Phases.md`.
- Do not add Pro features (multi-doc Q&A, export PDF, analytics, Stripe) until their phase.
- Do not create `Memory.md` until Phase 1 coding begins; then update it after each phase or major milestone.
- Commit only when the user asks.

---

## 10. Testing Mindset (manual MVP)

Before calling a phase done:

1. Auth works (login + callback).
2. Upload reaches `ready` for a sample PDF.
3. Chat returns grounded answer + sources.
4. Delete cleans up user-visible state.
5. Unauthenticated API calls return 401.
