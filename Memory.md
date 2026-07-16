# DocBot — Memory

## 2026-07-16 — Production Docker polish

### Shipped (uncommitted — user commits)
- Multi-stage `Dockerfile` (deps → build → runner as `nextjs`)
- `.dockerignore` (keeps secrets + `.data` out of image)
- `docker-compose.yml` named volumes + healthcheck (no bind-mount of source)
- `postinstall` / `build` run `prisma generate`; `docker:up` / `docker:down` scripts

### Note
- User has 4 Supabase commits ahead of origin — remind to `git push`

---

## 2026-07-16 — Supabase Auth + Storage + Neon durability

### Shipped (uncommitted — user commits in splits)
- Prisma schema: Chat `userId`/`kind`, optional `documentId`, User Stripe fields
- Dual-mode stores: Neon when `DATABASE_URL`, else `.data` JSON
- Supabase Storage via service role (`lib/storage/files.ts`, bucket `documents`)
- Ingest materializes Storage files to temp for parsers
- Auth: no silent fallback to local user when Supabase fails
- Middleware protects `/analytics` + `/billing`
- README setup for Supabase bucket + `prisma db push`

### Still local-by-default
- Without Supabase/Neon env, app keeps working as before

---

## 2026-07-16 — Phase 7 Pro features (local demo)

### Shipped (uncommitted — user commits in splits)
- `isPro` via `.data/settings.json` + `POST /api/settings` demo toggle
- Unlimited uploads when Pro; dashboard Upgrade / Switch to Free
- Multi-doc Q&A: `/api/chat/multi` + `/chat/multi` (Pro-gated)
- Chat PDF export (`jspdf` + `ExportChatButton`)
- Analytics: `/api/analytics` + `/analytics` (Pro-gated)
- Navbar: Multi-doc + Analytics; priority ingest badge on Pro dashboard

### Still deferred
- Supabase Auth/Storage + durable chat on Vercel

---

## 2026-07-16 — Stripe billing

### Shipped (uncommitted — user commits in splits)
- `stripe` SDK + `lib/stripe.ts`
- Checkout `/api/stripe/checkout`, confirm `/api/stripe/confirm`, webhook, portal
- `/billing/success` + `/billing/cancel`
- Pricing + dashboard wired via `UpgradeButton` / `ManageBillingButton`
- Demo Pro toggle remains when Stripe env unset

### Follow-up
- Supabase/Neon adapters shipped in later session (see top of Memory)

---

## 2026-07-16 — Phase 6 deploy prep

### Confirmed
- User pushed 4 Phase 4–5 commits to `origin/main` (clean tree before this work)

### Phase 6 work (uncommitted — tell user to commit in splits)
- `vercel.json` — 60s for upload/chat
- Vercel-safe paths (`/tmp` uploads + data)
- Pinecone document metadata registry for durable doc list on serverless
- Dashboard `DeployBanner` when `NEXT_PUBLIC_VERCEL_ENV` is set
- README deploy checklist

### Commit preference
- Never auto-commit; give user commit msgs + file steps for max contribution splits

### Still deferred
- Supabase Auth/Storage
- Neon
- Live Vercel project creation (user clicks Import)
