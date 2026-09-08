# DocBot RAG Baseline v1 — FILLED

**Phase:** 8.1  
**Run date:** 2026-09-08T07:20:05.176Z  
**Runner:** `node evals/run-baseline.mjs` (same retrieve→generate contract as `/api/chat`)  
**Namespace:** `eval-baseline-v3-contextual-rerank`  
**topK:** 5, score floor: 0.15

## Summary

| Metric | Count |
|--------|------:|
| Total questions | 22 |
| PASS | 18 |
| PARTIAL | 3 |
| FAIL | 1 |
| PASS rate (PASS / total) | 81.8% |
| Off-topic refusal (A8) | PASS |

### Observed failure patterns


- See non-PASS rows below for missed keywords / page mismatch / weak retrieval

- Off-topic correctly refused

## Document A — Software Engineer JD

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| A1 | What is the job title and location? | Software Engineer (Backend); Bengaluru; Hybrid 3 days | A p1 | The job title is Software Engineer (Backend) and the location is Bengaluru, India (Hybrid – 3 days in office) [1]. | p1 @0.67; p2 @0.67 | **PASS** |
| A2 | What is the minimum years of experience required? | 2 years | A p1 | The minimum requirement is 2 years of professional software development experience [1]. | p1 @0.65; p2 @0.65 | **PASS** |
| A3 | Which programming languages are required? | TypeScript or JavaScript | A p1 | Based on the provided document, strong proficiency in TypeScript or JavaScript is required [1]. | p1 @0.63; p2 @0.60 | **PASS** |
| A4 | Is a CS degree mandatory? | CS/IT or equivalent practical experience | A p1 | No, a Computer Science degree is not strictly mandatory, as the qualifications allow for "equivalent practical experience" in addition to a Bachelor’s degree in Computer Science, IT, or equivalent [1]. | p1 @0.61; p2 @0.59 | **PASS** |
| A5 | What AWS-related preference is listed? | AWS S3/Lambda/ECS preferred | A p2 | The preferred AWS-related experience is hands-on AWS experience with S3, Lambda, or ECS [1]. | p2 @0.63; p1 @0.58 | **PASS** |
| A6 | What is the salary range? | INR 18,00,000 to 28,00,000 | A p2 | The base salary range is INR 18,00,000 to INR 28,00,000 per year, depending on experience [1]. | p2 @0.65; p1 @0.59 | **PASS** |
| A7 | How do candidates apply? | careers@acme.example subject SE-Backend-2026 | A p2 | To apply, candidates should email careers@acme.example with the subject line "SE-Backend-2026", including their resume and a short note about a backend project they shipped [1]. | p2 @0.60; p1 @0.56 | **PASS** |
| A8 | What is the capital of France? | Refuse / not in document | — | I cannot find that information in the document. | p1 @0.48; p2 @0.46 | **PASS** |

## Document B — Refund Policy

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| B1 | When did this policy become effective? | 1 January 2026 | B p1 | This policy became effective on 1 January 2026 [1]. | p1 @0.64; p2 @0.59 | **PASS** |
| B2 | Within how many days can a monthly Pro subscription be refunded? | 14 days if fewer than 3 uploads | B p1 | A monthly Pro subscription may be refunded within 14 days of purchase [1]. | p1 @0.72; p2 @0.65 | **PASS** |
| B3 | What is the refund window for annual Pro? | 30 days | B p1 | Annual Pro subscriptions may be refunded within 30 days of purchase, provided the customer has used fewer than 3 document uploads in that billing period [1]. | p1 @0.72; p2 @0.66 | **PASS** |
| B4 | Are partially used credit packs refundable? | No | B p1 | No, partially used credit packs are not refundable [2]. | p1 @0.71; p2 @0.68 | **PASS** |
| B5 | How long after approval until money returns? | 7 business days | B p1 | Refunds are processed to the original payment method within 7 business days after approval [1]. | p1 @0.64; p2 @0.60 | **PASS** |
| B6 | How do I request a refund and what must I include? | billing@acme.example + email, invoice, reason | B p2 | To request a refund, email billing@acme.example with the following information: - Account email [1] - Invoice ID [1] - Reason for the request [1] | p2 @0.67; p1 @0.67 | **PASS** |
| B7 | What happens with unexplained chargebacks? | Account suspension pending review | B p2 | Unexplained chargebacks may result in account suspension pending review [1]. | p2 @0.65; p1 @0.60 | **FAIL** |
| B8 | Can I get a refund after 60 days on a monthly plan? | No — outside 14-day window | B p2 | No, charges older than the refund windows (which are 14 days for monthly Pro subscriptions) are non-refundable [1], [2]. | p1 @0.69; p2 @0.66 | **PARTIAL** |

## Document C — Intern Onboarding

| # | Question | Expected | Expected source | Actual answer | Actual source | Result |
|---|----------|----------|-----------------|---------------|---------------|--------|
| C1 | Which Slack workspace should interns join? | acme-eng-interns | C p1 | Interns should join the Slack workspace: `acme-eng-interns` [1]. | p1 @0.70; p2 @0.65 | **PASS** |
| C2 | By when must security training SEC-101 be completed? | Before Day 3 | C p1 | Security training module SEC-101 must be completed before Day 3 [2]. | p2 @0.59; p1 @0.58 | **PARTIAL** |
| C3 | How long are weekly mentor meetings? | 30 minutes; first by Friday Week 1 | C p1 | Weekly mentor meetings are 30 minutes long [1]. | p1 @0.62; p2 @0.61 | **PASS** |
| C4 | What are core office hours? | 11:00–16:00 IST | C p2 | Core hours are 11:00–16:00 IST for hybrid collaboration [1]. | p2 @0.61; p1 @0.57 | **PASS** |
| C5 | When do interns present their demo and how long is it? | Week 8; 10-minute demo | C p2 | Interns present a 10-minute demo in Week 8 [1]. | p2 @0.66; p1 @0.63 | **PASS** |
| C6 | Should interns commit .env files to git? | No — do not commit secrets | C p1 | No, interns should not commit secrets like `.env` files to git [1]. | p2 @0.73; p1 @0.67 | **PARTIAL** |

## Phase 8.1 exit checklist

- [x] Fixtures chosen  
- [x] Questions + expected answers  
- [x] Baseline executed on current RAG path  
- [x] Actual columns filled  
- [x] PASS/FAIL marked  
- [x] Failure patterns noted  
