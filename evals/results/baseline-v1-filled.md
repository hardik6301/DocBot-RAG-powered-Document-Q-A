# DocBot RAG Baseline v1 — FILLED

**Phase:** 8.1  
**Run date:** 2026-09-08T07:10:55.149Z  
**Runner:** `node evals/run-baseline.mjs` (same retrieve→generate contract as `/api/chat`)  
**Namespace:** `eval-baseline-v1`  
**topK:** 5, score floor: 0.15

## Summary

| Metric | Count |
|--------|------:|
| Total questions | 22 |
| PASS | 18 |
| PARTIAL | 4 |
| FAIL | 0 |
| PASS rate (PASS / total) | 81.8% |
| Off-topic refusal (A8) | PASS |

### Observed failure patterns

- Off-topic correctly refused (A8)
- **Citation page rank:** A2 answer correct but top chunk was p2 before p1 (scored PARTIAL)
- **Citation page rank:** B4/B6/C6 answers correct but top hit page ≠ expected primary page (PARTIAL)
- Auto-scorer false FAIL on B7 overridden to PASS (answer matched expected; keyword edge case)

**Gaps for Phase 8.2–8.4:** improve chunk ranking / contextual embeddings; tighten guardrails already partially working for off-topic.
## Document A — Software Engineer JD

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| A1 | What is the job title and location? | Software Engineer (Backend); Bengaluru; Hybrid 3 days | A p1 | The job title is Software Engineer (Backend) and the location is Bengaluru, India (Hybrid – 3 days in office) [1]. | p1 @0.68; p2 @0.66 | **PASS** |
| A2 | What is the minimum years of experience required? | 2 years | A p1 | The minimum requirement is 2 years of professional software development experience [2]. | p2 @0.65; p1 @0.64 | **PARTIAL** |
| A3 | Which programming languages are required? | TypeScript or JavaScript | A p1 | The required programming languages are TypeScript or JavaScript [1]. | p1 @0.61; p2 @0.61 | **PASS** |
| A4 | Is a CS degree mandatory? | CS/IT or equivalent practical experience | A p1 | No, a Computer Science degree is not mandatory; the role accepts a Bachelor’s degree in IT or equivalent practical experience as an alternative [1]. | p1 @0.62; p2 @0.59 | **PASS** |
| A5 | What AWS-related preference is listed? | AWS S3/Lambda/ECS preferred | A p2 | Hands-on AWS experience (S3, Lambda, or ECS) [1]. | p2 @0.61; p1 @0.57 | **PASS** |
| A6 | What is the salary range? | INR 18,00,000 to 28,00,000 | A p2 | The base salary range is INR 18,00,000 to INR 28,00,000 per year, depending on experience [1]. | p2 @0.65; p1 @0.60 | **PASS** |
| A7 | How do candidates apply? | careers@acme.example subject SE-Backend-2026 | A p2 | Candidates can apply by emailing careers@acme.example with the subject line "SE-Backend-2026", including their resume and a short note about a backend project they shipped [1]. | p2 @0.61; p1 @0.58 | **PASS** |
| A8 | What is the capital of France? | Refuse / not in document | — | I cannot find that information in the document. | p1 @0.47; p2 @0.45 | **PASS** |

## Document B — Refund Policy

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| B1 | When did this policy become effective? | 1 January 2026 | B p1 | This policy became effective on 1 January 2026 [1]. | p1 @0.66; p2 @0.61 | **PASS** |
| B2 | Within how many days can a monthly Pro subscription be refunded? | 14 days if fewer than 3 uploads | B p1 | A monthly Pro subscription can be refunded within 14 days of purchase, provided the customer has used fewer than 3 document uploads in that billing period [1]. | p1 @0.72; p2 @0.68 | **PASS** |
| B3 | What is the refund window for annual Pro? | 30 days | B p1 | The refund window for annual Pro subscriptions is within 30 days of purchase, provided the customer has used fewer than 3 document uploads [1]. | p1 @0.72; p2 @0.69 | **PASS** |
| B4 | Are partially used credit packs refundable? | No | B p1 | No, partially used credit packs are not refundable [1]. | p2 @0.71; p1 @0.68 | **PARTIAL** |
| B5 | How long after approval until money returns? | 7 business days | B p1 | Refunds are processed to the original payment method within 7 business days after approval [1]. | p1 @0.65; p2 @0.61 | **PASS** |
| B6 | How do I request a refund and what must I include? | billing@acme.example + email, invoice, reason | B p2 | To request a refund, email billing@acme.example [2]. You must include the following information: - Account email [2] - Invoice ID [2] - Reason for the request [2] | p1 @0.69; p2 @0.67 | **PARTIAL** |
| B7 | What happens with unexplained chargebacks? | Account suspension pending review | B p2 | Unexplained chargebacks may result in account suspension pending review [1]. | p2 @0.63; p1 @0.59 | **PASS** (human override) |
| B8 | Can I get a refund after 60 days on a monthly plan? | No — outside 14-day window | B p2 | No, you cannot get a refund after 60 days because charges older than the windows in sections 2 and 3 are non-refundable [1]. Monthly Pro subscriptions must be refunded within 14 days of purchase [2]. | p2 @0.69; p1 @0.69 | **PASS** |

## Document C — Intern Onboarding

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| C1 | Which Slack workspace should interns join? | acme-eng-interns | C p1 | Interns should join the Slack workspace **acme-eng-interns** [1]. | p1 @0.70; p2 @0.65 | **PASS** |
| C2 | By when must security training SEC-101 be completed? | Before Day 3 | C p1 | Security training SEC-101 must be completed before Day 3 [1]. | p1 @0.59; p2 @0.57 | **PASS** |
| C3 | How long are weekly mentor meetings? | 30 minutes; first by Friday Week 1 | C p1 | Weekly mentor meetings are 30 minutes long [1]. | p1 @0.62; p2 @0.61 | **PASS** |
| C4 | What are core office hours? | 11:00–16:00 IST | C p2 | Core hours are 11:00–16:00 IST for hybrid collaboration [1]. | p2 @0.59; p1 @0.57 | **PASS** |
| C5 | When do interns present their demo and how long is it? | Week 8; 10-minute demo | C p2 | Interns present a 10-minute demo in Week 8 [1]. | p2 @0.67; p1 @0.65 | **PASS** |
| C6 | Should interns commit .env files to git? | No — do not commit secrets | C p1 | No, interns should not commit secrets like .env files or API keys to git [1]. | p2 @0.72; p1 @0.68 | **PARTIAL** |

## Phase 8.1 exit checklist

- [x] Fixtures chosen  
- [x] Questions + expected answers  
- [x] Baseline executed on current RAG path  
- [x] Actual columns filled  
- [x] PASS/FAIL marked  
- [x] Failure patterns noted  
