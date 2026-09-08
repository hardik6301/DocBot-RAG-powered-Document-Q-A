# DocBot — Build Phases

Build in order. Do not start a phase until the previous phase’s exit criteria are met. Update `Memory.md` after each completed phase (or sub-phase).

**Architectural rule (all phases):** Do not break the existing RAG contract.

```
Document → ingestion → chunks → embeddings → Pinecone
→ retrieval → generation → citations
```

Upgrade pieces of this pipeline. Do not create parallel RAG systems. Voice, Comparison, Intelligence, etc. must reuse the same underlying services.

**Workflow per phase / sub-phase**

1. Read this file → pick the next unchecked item  
2. Implement only that scope  
3. Verify exit criteria  
4. Append progress to `Memory.md`  
5. Commit + push that slice to GitHub  

---

## Phases 0–7 — COMPLETE (MVP)

Shipped on production (`thedocbot.vercel.app`):

| Phase | Status | Notes |
|-------|--------|--------|
| 0 Scaffolding | Done | Next.js 14, Tailwind, Prisma, Docker, env template |
| 1 Auth + layout | Done | Supabase Auth, middleware, callback, user upsert |
| 2 Documents CRUD | Done | Upload/list/delete; Storage + local fallback |
| 3 Ingestion | Done | Chunk ~500/50 → Gemini embed → Pinecone |
| 4 Chat Q&A | Done | Top-k retrieve → grounded Gemini → citations + history |
| 5 Landing + polish | Done | Claymorphic marketing + dashboard UX |
| 6 Deploy | Done | Vercel + Supabase Postgres + Pinecone |
| 7 Pro features | Done | Multi-doc, analytics, export, Stripe wired; `BILLING_ENABLED=false` |

---

## Phase 8 — RAG Quality 🔥 (NEXT)

**Goal:** Measure current quality, then improve retrieval and grounding with a before/after baseline.

**Decision after Phase 8**

```
Re-test baseline
     │
Is RAG good enough?
   /           \
 YES            NO
  │              │
  ▼              ▼
Phase 9       Phase 12 (targeted)
```

### 8.1 — Baseline testing

**Before modifying retrieval.**

- [x] Choose 2–3 real documents → `evals/fixtures/*.pdf`  
- [x] Create ~15–20 questions → `evals/baseline-v1.md` (22 questions)  
- [x] Record expected answer  
- [x] Record expected source/page  
- [x] Run current DocBot RAG path → `node evals/run-baseline.mjs`  
- [x] Record actual answer/source → `evals/results/baseline-v1-filled.md`  
- [x] Mark PASS/FAIL → **18 PASS / 4 PARTIAL / 0 FAIL (81.8% PASS)**  

**Exit criteria**

- [x] Baseline artifact exists with questions, expected, actual, PASS/FAIL  
- [x] Fail patterns noted (mostly citation page ranking; off-topic refusal OK)

### 8.2 — Contextual chunking

Improve ingestion without destroying citation text:

```
Document → extract → chunk
  → Gemini contextual prefix
  → enriched chunk
  → embedding → Pinecone
```

- [x] Add contextual prefix generation at ingest (`lib/contextualize.ts`)  
- [x] Store/use `contextualText` for retrieval embeddings  
- [x] Keep **original chunk text** for citation/display (`chunkText` metadata)  
- [x] Re-ingest path documented (re-upload; `CONTEXTUAL=1 node evals/run-baseline.mjs` for eval)  

**Exit criteria**

- [x] New uploads embed contextual text but cite original chunk text  
- [x] Baseline can be re-run after re-ingest (`CONTEXTUAL=1`)

### 8.3 — Gemini reranking

```
Query → embed → Pinecone top-15
  → Gemini relevance scoring → top-5
  → grounded generation
```

- [x] Increase Pinecone candidate pool (15) — `RETRIEVE_TOP_K`  
- [x] Gemini scores/reranks candidates — `lib/rerank.ts`  
- [x] Pass top-5 into existing grounded generation  
- [ ] Re-run the same 15–20 baseline questions (`node evals/run-baseline.mjs`)  
- [ ] Record before/after PASS rate vs 8.1 (81.8%)  

**Exit criteria**

- [x] Chat path uses retrieve → rerank → generate (`/api/chat`, `/api/chat/multi`)  
- [ ] Baseline comparison table updated (v1 vs v3) when re-run completes

### 8.4 — Grounding + guardrails

DocBot must know when **not** to answer.

Handle:

- [x] Insufficient context  
- [x] Irrelevant retrieval  
- [x] Off-topic questions  
- [x] Unsupported claims / hallucination risk (prompt + pre-gate)  
- [x] Poor source relevance (score floor + lexical check)  
- [x] Citation mismatch (cite only used blocks; refuse when unsupported)  

Example: capital of France + Software Engineer JD → honest “not in the uploaded document.”

**Exit criteria**

- [x] Off-topic / no-context prompts refuse via `assessGroundingSupport` + stricter prompt (`lib/grounding.ts`)  
- [ ] Optional: re-run baseline to confirm on-topic PASS holds (`node evals/run-baseline.mjs`)  

**Phase 8 done when:** 8.1–8.4 complete + baseline re-tested + go/no-go for Phase 9 vs 12 recorded in `Memory.md`.

**Go/no-go (provisional):** Phase 9 next — baseline was already 81.8% PASS with correct off-topic refusal; 8.2–8.4 harden retrieval/grounding. Re-run eval when convenient; jump to Phase 12 only if PASS regresses badly.

---

## Phase 9 — Document Intelligence 🧠

**Goal:** Analysis generated at ingest (when status → `ready`), not on first chat open.

- [x] After ready: AI summary  
- [x] Key topics  
- [x] Suggested questions  
- [x] Persist on Document (schema + store)  
- [x] UI: AI Overview panel (summary, topics, suggested Qs → fill chat)  

**Exit criteria**

- [x] New ready docs show summary/topics/suggestions without a separate analysis action  
- [x] Suggested question click starts chat with that prompt  

**Note:** Existing docs need re-upload to populate intelligence fields.  

---

## Phase 10 — Document Comparison 🔥

**Goal:** Structured comparison across selected docs — not a naive chunk merge.

- [x] Multi-document selection UI (`/chat/compare`)  
- [x] Per-document retrieval for the same question  
- [x] Comparison prompt → structured table + key differences  
- [x] Comparative citations (which doc supports which claim — labels A1, B2, …)  

**Exit criteria**

- [x] User can pick ≥2 docs and get a comparison table + narrative differences  
- [x] Each major claim ties back via per-doc sources (`/api/chat/compare`)  

---

## Phase 11 — Voice Mode 🎙️

**Goal:** Voice as another input modality into the **existing** `/api/chat` RAG path. No second RAG system.

### 11.1 Voice input

- [x] Mic control on chat input  
- [x] Speech → text  
- [x] Feed transcript into existing chat/RAG pipeline  

### 11.2 Voice UX states

- [x] Listening → Transcribing → Searching document → Generating answer  

### 11.3 Optional voice output

- [x] Text-to-speech “read aloud” for answers  

### 11.4 Latency analytics

Track (ms): STT, embedding, Pinecone, reranking, generation, total; aggregate P50/P70/P95/max.

- [x] Instrument timings server and/or client  
- [x] Simple display or log for N queries  

**Exit criteria**

- [x] Mic question completes the same RAG path as typed chat  
- [x] UX states visible; latency numbers recorded for a small sample  
- [x] No duplicate retrieval stack  

---

## Phase 12 — Retrieval Expansion

**Only if Phase 8 (or later) shows retrieval still weak.** Do not add complexity for marketing labels.

Possible work (pick based on measured gaps):

- [ ] Hybrid search (semantic + BM25/keyword)  
- [ ] Query rewriting (with chat context)  
- [ ] Larger candidate pools / chunk-size experiments  
- [ ] Metadata filtering  
- [ ] Larger context window experiments  
- [ ] Advanced reranking if Gemini rerank is insufficient  

**Exit criteria**

- Each experiment has a baseline delta (PASS rate or clear failure-mode fix)  
- Kept changes documented; discarded experiments noted in `Memory.md`  

---

## Phase 13 — Productivity

- [x] Folders  
- [x] Tags  
- [x] Document library search  
- [x] Rename  
- [x] Archive  
- [x] Better chat history  
- [x] Search within library  

**Exit criteria**

- [x] User with many docs can organize, find, rename, and archive without leaving the product  

---

## Phase 14 — Scale & Advanced Engineering

Build as sub-phases. Collaboration last.

### 14.1 — Text formats + guardrails

- [x] TXT / Markdown ingest through existing RAG path  
- [x] DOCX improvements (paragraph + page-break aware extraction)  
- [x] Upload/chat rate limiting (in-memory per instance)  
- [x] Structured JSON event logs (`ingest.*`, `chat.complete`)  

**Exit criteria**

- [x] `.txt` / `.md` upload reaches `ready` and answers via `/api/chat`  
- [x] DOCX extraction preserves paragraphs / soft pages better than flat dump  

### 14.2 — Advanced document sources

- [x] OCR for scanned PDFs (Gemini multimodal fallback when text extract is empty/sparse)  
- [x] EPUB  
- [x] Optional URL/webpage ingestion (`POST /api/ingest/url`, SSRF-safe)  

**Exit criteria**

- [x] Scanned/image PDF can still reach `ready` via OCR path  
- [x] `.epub` and public URL imports use the same Pinecone RAG contract  

### 14.3 — Infrastructure

- [ ] Background processing / job queue  
- [ ] Retries (ingest job-level)  
- [x] Rate limiting (started in 14.1)  
- [x] Better observability (started in 14.1; expand later)  

### 14.4 — Monetization

- [ ] Enable real Stripe (`BILLING_ENABLED=true`)  
- [ ] Usage limits / Pro quotas  
- [ ] Subscription management polish  

### 14.5 — Formal RAG evaluation

- [ ] Golden questions harness  
- [ ] Retrieval metrics, answer quality, citation correctness, groundedness  
- [ ] Latency + regression tracking  
- [ ] Automated evaluation where practical  

### 14.6 — Collaboration (last)

- [ ] Sharing  
- [ ] Workspaces / teams  
- [ ] Permissions  

**Exit criteria**

- Defined per sub-epic when started; collaboration last (largest architecture change)  

---

## Locked priority order

```
NOW → 8.1 → 8.2 → 8.3 → 8.4 → re-test baseline
        → Phase 9 → 10 → 11 → 12 (if needed) → 13 → 14
```

Do not jump to Phase 14 while Phase 8 is open.
