# DocBot RAG Baseline v1

**Phase:** 8.1  
**Date started:** 2026-09-08  
**Pipeline under test:** current production RAG (no contextual chunking, no Gemini rerank yet)  
**App:** local `npm run dev` and/or https://thedocbot.vercel.app  

**Fixtures** (upload these exact files):

| ID | File | Pages |
|----|------|-------|
| A | `evals/fixtures/acme-software-engineer-jd.pdf` | 2 |
| B | `evals/fixtures/acme-refund-policy.pdf` | 2 |
| C | `evals/fixtures/acme-intern-onboarding.pdf` | 2 |

**How to score**

- **PASS** — answer is factually correct *and* grounded in the doc; citation roughly matches expected page/topic  
- **PARTIAL** — right idea but missing key detail, or weak/wrong citation  
- **FAIL** — wrong, hallucinated, or answers off-doc as if true  

Fill **Actual answer**, **Actual source**, **Result** after running each question in DocBot chat (one document open at a time unless noted).

Copy this file to `evals/results/baseline-v1-filled.md` when recording so the template stays clean.

---

## Document A — Software Engineer JD

| # | Question | Expected answer (key facts) | Expected source | Actual answer | Actual source | Result |
|---|----------|----------------------------|-----------------|---------------|---------------|--------|
| A1 | What is the job title and location? | Software Engineer (Backend); Bengaluru, India; Hybrid 3 days in office | A p1 | | | |
| A2 | What is the minimum years of experience required? | 2 years professional software development | A p1 | | | |
| A3 | Which programming languages are required? | TypeScript or JavaScript (strong proficiency) | A p1 | | | |
| A4 | Is a CS degree mandatory? | Bachelor's in CS/IT **or** equivalent practical experience | A p1 | | | |
| A5 | What AWS-related preference is listed? | Hands-on AWS (S3, Lambda, or ECS) as **preferred**, not minimum | A p2 | | | |
| A6 | What is the salary range? | INR 18,00,000 to 28,00,000 per year | A p2 | | | |
| A7 | How do candidates apply? | Email careers@acme.example; subject SE-Backend-2026; resume + short note | A p2 | | | |
| A8 | What is the capital of France? | Must **refuse** / say not in document (off-topic guardrail check) | — | | | |

---

## Document B — Refund Policy

| # | Question | Expected answer (key facts) | Expected source | Actual answer | Actual source | Result |
|---|----------|----------------------------|-----------------|---------------|---------------|--------|
| B1 | When did this policy become effective? | 1 January 2026 | B p1 | | | |
| B2 | Within how many days can a monthly Pro subscription be refunded? | 14 days, if fewer than 3 uploads that period | B p1 | | | |
| B3 | What is the refund window for annual Pro? | 30 days, same usage cap (&lt; 3 uploads) | B p1 | | | |
| B4 | Are partially used credit packs refundable? | No | B p1 | | | |
| B5 | How long after approval until money returns? | Within 7 business days to original payment method | B p1 | | | |
| B6 | How do I request a refund and what must I include? | Email billing@acme.example with account email, invoice ID, reason; reply in 2 business days | B p2 | | | |
| B7 | What happens with unexplained chargebacks? | May result in account suspension pending review | B p2 | | | |
| B8 | Can I get a refund after 60 days on a monthly plan? | No — outside the 14-day window (non-refundable / older charges) | B p2 / §4 | | | |

---

## Document C — Intern Onboarding

| # | Question | Expected answer (key facts) | Expected source | Actual answer | Actual source | Result |
|---|----------|----------------------------|-----------------|---------------|---------------|--------|
| C1 | Which Slack workspace should interns join? | acme-eng-interns | C p1 | | | |
| C2 | By when must security training SEC-101 be completed? | Before Day 3 | C p1 | | | |
| C3 | How long are weekly mentor meetings? | 30 minutes; first meeting by Friday of Week 1 | C p1 | | | |
| C4 | What are core office hours? | 11:00–16:00 IST | C p2 | | | |
| C5 | When do interns present their demo and how long is it? | Week 8; 10-minute demo | C p2 | | | |
| C6 | Should interns commit .env files to git? | No — do not commit secrets | C p1 | | | |

---

## Summary (fill after run)

| Metric | Count |
|--------|------:|
| Total questions | 22 |
| PASS | |
| PARTIAL | |
| FAIL | |
| PASS rate (PASS / total) | |
| Off-topic correct refusals (A8) | |

### Observed failure patterns

- [ ] Wrong chunk / wrong page cited  
- [ ] Hallucinated facts not in doc  
- [ ] Missed number/date detail  
- [ ] Answered off-topic instead of refusing (A8)  
- [ ] Vague answer without citing  
- [ ] Other: _

### Notes / environment

- Tester:  
- Commit SHA:  
- Local or production:  
- Model / index notes:  

---

## Phase 8.1 exit checklist

- [x] 2–3 real (fixture) documents chosen  
- [x] ~15–20+ questions with expected answer + source  
- [ ] Baseline executed on current DocBot  
- [ ] Actual columns filled in `evals/results/baseline-v1-filled.md`  
- [ ] PASS/FAIL marked + failure patterns noted  
- [ ] `Memory.md` updated with PASS rate  
