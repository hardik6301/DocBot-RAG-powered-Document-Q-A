# DocBot — Memory

## 2026-07-16 — Phase 7 Pro features (local demo)

### Shipped (uncommitted — user commits in splits)
- `isPro` via `.data/settings.json` + `POST /api/settings` demo toggle
- Unlimited uploads when Pro; dashboard Upgrade / Switch to Free
- Multi-doc Q&A: `/api/chat/multi` + `/chat/multi` (Pro-gated)
- Chat PDF export (`jspdf` + `ExportChatButton`)
- Analytics: `/api/analytics` + `/analytics` (Pro-gated)
- Navbar: Multi-doc + Analytics; priority ingest badge on Pro dashboard

### Still deferred
- Stripe billing
- Supabase Auth/Storage + durable chat on Vercel

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
