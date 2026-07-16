# DocBot — Memory

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
