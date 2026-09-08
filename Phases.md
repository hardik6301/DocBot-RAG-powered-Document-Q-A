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
- [ ] Run current DocBot  
- [ ] Record actual answer/source → `evals/results/baseline-v1-filled.md`  
- [ ] Mark PASS/FAIL  

No formal eval harness yet — scorecard in `evals/baseline-v1.md`.

**Exit criteria**

- Baseline artifact exists (`evals/baseline-v1.md` + filled results) with questions, expected, actual, PASS/FAIL  
- Fail patterns noted (wrong chunk, hallucination, off-topic, citation miss)

### 8.2 — Contextual chunking

Improve ingestion without destroying citation text:

```
Document → extract → chunk
  → Gemini contextual prefix
  → enriched chunk
  → embedding → Pinecone
```

- [ ] Add contextual prefix generation at ingest  
- [ ] Store/use `contextualText` for retrieval embeddings  
- [ ] Keep **original chunk text** for citation/display  
- [ ] Re-ingest or migrate path documented for existing docs  

**Exit criteria**

- New uploads embed contextual text but cite original chunk text  
- Baseline can be re-run after re-ingest (or on newly uploaded copies)

### 8.3 — Gemini reranking

```
Query → embed → Pinecone top-15
  → Gemini relevance scoring → top-5
  → grounded generation
```

- [ ] Increase Pinecone candidate pool (e.g. 15)  
- [ ] Gemini scores/reranks candidates  
- [ ] Pass top-5 into existing grounded generation  
- [ ] Re-run the same 15–20 baseline questions  
- [ ] Record before/after PASS rate  

**Exit criteria**

- Chat path uses retrieve → rerank → generate  
- Baseline comparison table updated (v1 vs v2)

### 8.4 — Grounding + guardrails

DocBot must know when **not** to answer.

Handle:

- [ ] Insufficient context  
- [ ] Irrelevant retrieval  
- [ ] Off-topic questions  
- [ ] Unsupported claims / hallucination risk  
- [ ] Poor source relevance  
- [ ] Citation mismatch  

Example: capital of France + Software Engineer JD → honest “not in the uploaded document.”

**Exit criteria**

- Off-topic / no-context prompts refuse or say not found (not confident wrong answers)  
- On-topic baseline questions still pass at least as well as after 8.3  

**Phase 8 done when:** 8.1–8.4 complete + baseline re-tested + go/no-go for Phase 9 vs 12 recorded in `Memory.md`.

---

## Phase 9 — Document Intelligence 🧠

**Goal:** Analysis generated at ingest (when status → `ready`), not on first chat open.

- [ ] After ready: AI summary  
- [ ] Key topics  
- [ ] Suggested questions  
- [ ] Persist on Document (schema + store)  
- [ ] UI: AI Overview panel (summary, topics, suggested Qs → fill chat)  

**Exit criteria**

- New ready docs show summary/topics/suggestions without opening a separate analysis action  
- Suggested question click starts chat with that prompt  

---

## Phase 10 — Document Comparison 🔥

**Goal:** Structured comparison across selected docs — not a naive chunk merge.

- [ ] Multi-document selection UI  
- [ ] Per-document retrieval for the same question  
- [ ] Comparison prompt → structured table + key differences  
- [ ] Comparative citations (which doc supports which cell/claim)  

**Exit criteria**

- User can pick ≥2 docs and get a comparison table + narrative differences  
- Each major claim ties back to the correct document citation  

---

## Phase 11 — Voice Mode 🎙️

**Goal:** Voice as another input modality into the **existing** `/api/chat` RAG path. No second RAG system.

### 11.1 Voice input

- [ ] Mic control on chat input  
- [ ] Speech → text  
- [ ] Feed transcript into existing chat/RAG pipeline  

### 11.2 Voice UX states

- [ ] Listening → Transcribing → Searching document → Generating answer  

### 11.3 Optional voice output

- [ ] Text-to-speech “read aloud” for answers  

### 11.4 Latency analytics

Track (ms): STT, embedding, Pinecone, reranking, generation, total; aggregate P50/P70/P95/max.

- [ ] Instrument timings server and/or client  
- [ ] Simple display or log for N queries  

**Exit criteria**

- Mic question completes the same RAG path as typed chat  
- UX states visible; latency numbers recorded for a small sample  
- No duplicate retrieval stack  

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

- [ ] Folders  
- [ ] Tags  
- [ ] Document library search  
- [ ] Rename  
- [ ] Archive  
- [ ] Better chat history  
- [ ] Search within library  

**Exit criteria**

- User with many docs can organize, find, rename, and archive without leaving the product  

---

## Phase 14 — Scale & Advanced Engineering

### Documents

- [ ] OCR for scanned PDFs  
- [ ] TXT / Markdown  
- [ ] DOCX improvements  
- [ ] EPUB  
- [ ] Optional URL/webpage ingestion  

### Infrastructure

- [ ] Background processing / job queue  
- [ ] Retries  
- [ ] Rate limiting  
- [ ] Better observability  

### Monetization

- [ ] Enable real Stripe (`BILLING_ENABLED=true`)  
- [ ] Usage limits / Pro quotas  
- [ ] Subscription management polish  

### Formal RAG evaluation

- [ ] Golden questions harness  
- [ ] Retrieval metrics, answer quality, citation correctness, groundedness  
- [ ] Latency + regression tracking  
- [ ] Automated evaluation where practical  

### Collaboration

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
