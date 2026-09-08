# DocBot — Architecture

## 1. Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 14 (App Router) | Full-stack, SSR, API routes |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI primitives |
| LLM | Gemini 2.5 Flash | Free tier, fast, high quality |
| Embeddings | Gemini `embedding-001` | Same API key, 768 dimensions |
| Vector DB | Pinecone | Semantic search, free tier, namespaces |
| Document parsing | LangChain | PDF + PPT load + chunk |
| Database | Supabase Postgres (Prisma) | Durable users/docs/chats; Session pooler on Vercel |
| ORM | Prisma | Type-safe queries |
| File storage | Supabase Storage | Free 1GB |
| Auth | Supabase Auth | Google OAuth + email/password |
| Container | Docker + Compose | Local parity |
| Deploy | Vercel | Auto-deploy from GitHub |

---

## 2. High-Level System Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js UI │────▶│  API Routes  │────▶│ Neon/Prisma │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    Supabase Storage   LangChain      Pinecone
    (files)            (chunk)        (vectors)
                           │
                           ▼
                      Gemini API
                   (embed + generate)
```

---

## 3. RAG Pipeline

**Contract (Phases 8+ must preserve):** one pipeline only —
`Document → ingest → chunks → embeddings → Pinecone → retrieval → generation → citations`.
Upgrades (contextual chunking, rerank, hybrid, voice, comparison) plug into this flow; they do not fork a second RAG system.

### 3.1 Ingestion (upload)

1. User uploads PDF/PPT/DOCX  
2. File stored in Supabase Storage (or local fallback)  
3. Text extracted and split into chunks (~500 tokens / ~50 overlap)  
4. **Contextual prefix (Phase 8.2):** Gemini writes a short situating prefix per chunk  
5. Embeddings use `contextualText = prefix + original chunk` (Gemini `embedding-001`, 768-dim)  
6. Vectors upserted to Pinecone  
   - Metadata keeps **original** `chunkText` for citations/display  
   - Namespace: user `supabaseId`  
7. Document row saved (`chunkCount`, `pageCount`, `status: "ready"`)

**Existing documents:** re-upload (or re-ingest) to pick up contextual embeddings. Chat/citations still read `chunkText` only.

### 3.2 Retrieval (chat)

1. User asks a question  
2. Question → embedding vector  
3. Pinecone similarity search (top 5) in user namespace  
4. Build grounded prompt from retrieved chunks  
5. Gemini generates answer from context only  
6. Return answer + source citations  
7. Persist messages in Chat / Message tables  
8. UI shows answer + source cards  

---

## 4. Folder Structure

```
docbot/
├── app/
│   ├── page.jsx                    ← Landing
│   ├── layout.jsx                  ← Root layout + providers
│   ├── globals.css
│   ├── dashboard/
│   │   └── page.jsx
│   ├── chat/
│   │   └── [docId]/
│   │       └── page.jsx
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.jsx
│   │   └── callback/
│   │       └── route.js
│   └── api/
│       ├── upload/
│       │   └── route.js
│       ├── chat/
│       │   └── route.js
│       └── documents/
│           ├── route.js            ← GET list
│           └── [id]/
│               └── route.js        ← DELETE
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   └── LoadingSpinner.jsx
│   ├── upload/
│   │   ├── FileUpload.jsx
│   │   └── ProcessingStatus.jsx
│   ├── chat/
│   │   ├── ChatWindow.jsx
│   │   ├── ChatInput.jsx
│   │   └── SourceCard.jsx
│   ├── dashboard/
│   │   └── DocumentCard.jsx
│   └── layout/
│       ├── Navbar.jsx
│       └── Footer.jsx
├── lib/
│   ├── gemini.js
│   ├── pinecone.js
│   ├── langchain.js
│   ├── supabase/
│   │   ├── client.js
│   │   └── server.js
│   └── prisma.js
├── prisma/
│   └── schema.prisma
├── hooks/
│   └── useDocuments.js
├── types/
│   └── index.js
├── Dockerfile
├── docker-compose.yml
├── .env.local
└── README.md
```

---

## 5. Database Schema (Prisma → Neon)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String     @id @default(cuid())
  supabaseId  String     @unique
  email       String     @unique
  fullName    String?
  avatarUrl   String?
  isPro       Boolean    @default(false)
  proSince    DateTime?
  documents   Document[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Document {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  filename   String
  fileUrl    String
  fileType   String   // "pdf" | "ppt"
  fileSize   Int?
  pageCount  Int?
  chunkCount Int?
  pineconeNs String
  status     String   @default("processing") // processing | ready | failed
  chats      Chat[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Chat {
  id         String    @id @default(cuid())
  documentId String
  document   Document  @relation(fields: [documentId], references: [id])
  messages   Message[]
  createdAt  DateTime  @default(now())
}

model Message {
  id        String   @id @default(cuid())
  chatId    String
  chat      Chat     @relation(fields: [chatId], references: [id])
  role      String   // "user" | "assistant"
  content   String
  sources   Json?    // [{ chunkText, page, filename }]
  createdAt DateTime @default(now())
}
```

---

## 6. Environment Variables

```bash
# Gemini
GEMINI_API_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=docbot

# Neon
DATABASE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit `.env.local`. Use Vercel project env for production.

---

## 7. Docker

**Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**docker-compose.yml**

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    volumes:
      - .:/app
      - /app/node_modules
```

---

## 8. Auth & Data Isolation

1. Supabase Auth issues session (cookie / JWT).  
2. Server routes resolve Supabase user → Prisma `User` by `supabaseId`.  
3. All document queries filter by `userId`.  
4. Pinecone queries always use namespace = that user's id.  
5. Upload/delete require authenticated session.

---

## 9. Key Interview Concepts

| Concept | Explanation |
|---------|-------------|
| RAG | Retrieve relevant chunks first, then generate — grounds answers in real docs |
| Why Pinecone | Semantic similarity, not exact keyword match |
| Why chunk | Fits context window; only send relevant pieces |
| Why overlap | Sentences spanning chunk boundaries aren't lost |
