# DocBot — Product Requirements Document

**Tagline:** Upload any document. Ask anything. Get answers instantly.  
**Live URL:** https://docbot.vercel.app (post-deployment)  
**GitHub:** https://github.com/hardik6301/docbot

---

## 1. Product Overview

DocBot is a full-stack AI-powered web application that lets users upload any PDF or PPT document and ask questions about it in natural language. Instead of reading entire documents, users get instant, accurate answers with source citations showing exactly which part of the document the answer came from.

Answers are grounded in retrieved document chunks (RAG), reducing hallucination risk by constraining the LLM to the user's own content.

---

## 2. Problem Statement

Students, job seekers, and professionals waste hours manually reading through:

- 100-page study material to find one concept
- Company JDs to check eligibility criteria
- Research papers to extract key findings
- Legal documents to find specific clauses

DocBot solves this by letting users ask natural language questions and getting precise answers from within their own uploaded documents.

---

## 3. Target Users

| User | Use Case |
|------|----------|
| Students | Upload textbooks, notes, past papers — ask exam questions |
| Job seekers | Upload JDs — ask "Am I eligible?" or "What skills are required?" |
| Researchers | Upload research papers — extract methodology, findings, citations |
| Professionals | Upload reports, contracts — find specific clauses or data points |

---

## 4. Core Features

### MVP (Free tier — build first)

| Feature | Description |
|---------|-------------|
| Document upload | PDF and PPT via drag-and-drop or file picker |
| Unlimited questions | Ask as many questions as needed per document |
| Source citations | Every answer shows which chunks/pages were used |
| Document history | View previously uploaded documents |
| Delete documents | Remove doc from DB, storage, and vector index |
| Auth | Google OAuth + email/password via Supabase Auth |
| Free limit | Soft cap shown in UI (e.g. 3 documents) |

### Pro / Later

| Feature | Description |
|---------|-------------|
| Unlimited uploads | Remove free-tier document cap |
| Multi-document Q&A | Ask across multiple docs at once |
| Export chat as PDF | Download conversation history |
| Priority AI processing | Faster queue / higher rate limits |
| Advanced analytics | Most asked questions, document insights |

---

## 5. Pages & UX Requirements

### 5.1 Landing (`/`)

- Hero with brand + tagline + primary CTA
- Product demo (GIF/video)
- How it works (3 steps)
- Free vs Pro pricing
- CTA: "Get Started Free"

### 5.2 Dashboard (`/dashboard`)

- "My Documents" heading
- Upload control (drag-drop + button)
- Document card grid: filename, type icon, date, page/chunk counts, status badge, Ask / Delete
- Empty state: "Upload your first document to get started"
- Free-tier banner: e.g. "2/3 documents used"

### 5.3 Chat (`/chat/[docId]`)

- Left sidebar: document info + optional page preview
- Main thread: user (right), assistant (left) bubbles
- Source cards under each AI answer
- Input + send
- Quick prompts: Summarize, Key points, List requirements

### 5.4 Auth (`/auth/login`)

- Google Sign In
- Email + password
- Brand-aligned styling

---

## 6. API Requirements

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload + process document (ingest pipeline) |
| GET | `/api/documents` | List current user's documents |
| DELETE | `/api/documents/[id]` | Delete document + Pinecone vectors + storage |
| POST | `/api/chat` | Question → answer + sources |

---

## 7. Non-Functional Requirements

- **Security:** Users only access their own documents (Pinecone namespace = userId; DB filtered by userId)
- **Reliability:** Document status: `processing` → `ready` | `failed`
- **Performance:** Chunk retrieval top-K = 5; Gemini 2.5 Flash for generation
- **Deploy:** Vercel; local via Docker Compose

---

## 8. Success Criteria (MVP)

1. User can sign up / log in
2. User can upload a PDF or PPT and see it reach `ready`
3. User can ask a question and receive an answer with at least one source citation
4. User can list and delete documents
5. Deleted documents are removed from Neon, Supabase Storage, and Pinecone
6. App deploys to Vercel with env vars configured

---

## 9. Out of Scope (MVP)

- Mobile native apps
- Collaborative / shared documents
- OCR for scanned image-only PDFs (nice-to-have later)
- Real-time collaborative chat
- Billing integration (show Pro UI only; Stripe later)
