# Hackathon readiness

ParcelProof has a credible core demo: a concrete support problem, an inspectable Promise Ledger, meaningful RAG/LLM separation, and agent-approved actions. A win cannot be predicted without the event's rubric, competing submissions and judging. The following is an engineering assessment, not a measured score.

## Highest-value work before presenting

1. **Verify real inference.** Configure your key, ingest and run `npm run evaluate:live`. Inspect all four outputs. Fixture tests and mocked API tests are not evidence of real model quality. This is the most important unfinished validation.
2. **Rehearse the reveal.** Show the exact promise, the separate refund ledger, then switch agents after approval. Keep this sequence under three minutes. Use `docs/DEMO.md`.
3. **Validate the problem with a person.** Ask a support agent or teammate familiar with disputes whether the handoff contains the facts they need. Record actual feedback and changes; do not invent testimonials or time savings.
4. **Prepare a fallback.** Keep a clean fixture demo and record a short demo video before the event. Label fixture footage honestly. A screenshot is not a substitute for a working walkthrough.
5. **Match the rubric.** Confirm required sponsor technology, team attribution, deadline, submission format and permitted assets with the event organizers. The specific event rules have not been supplied or checked here.

## What is already implemented

- Four cases: broken promise, existing refund, shared household and insufficient evidence.
- Exact quoted promises reconciled against structured financial state.
- Hybrid retrieval scoped by account/order before ranking; policies filtered by region and effective dates.
- Real embedding ingestion and two schema-constrained model stages, plus a labeled offline fixture path.
- Citations and original evidence inspection; uncertain delivery claims remain uncertain.
- Separate speaker/recipient identity, deterministic policy eligibility, approval transaction and duplicate protection.
- Persistent handoff, editable unsent draft and audit trail.
- Responsive UI, observed automated checks and a source bundle.
- Portable setup/check commands, live-evaluation runner, Docker configuration and three-platform CI configuration.

## Sensible additions after the rehearsal

Prioritize a real live-evaluation report and user feedback over more screens. If there is time and rubric support, an exportable cited case brief is a useful next feature. If judges emphasize robustness, broaden the evaluation corpus with paraphrased promises, proposed-but-not-committed refunds, changed policies and embedded malicious instructions. If they emphasize adoption, demonstrate how one support-system adapter could ingest the same source schema.

These are follow-up ideas, not claims that those features or larger evaluations already exist. A mobile app, autonomous refunds, broad courier integrations and an unrelated chatbot would dilute this overnight workflow.

## Judge questions and candid answers

**Why does this need RAG and LLMs?** Retrieval selects relevant order evidence and policy. Models interpret conversation language and produce structured, cited reconciliation. The database supplies current identity/financial truth, and code controls authorization.

**How is it different from a chatbot?** It reconstructs a case, tracks a prior commitment against action records, and gives the next agent a persisted record of what was promised, disputed and done.

**Does a promise authorize a refund?** No. The synthetic policy gate independently checks the prerequisites and blocks duplicates.

**Does the photo prove wrong delivery?** No. The demo uses a labeled synthetic illustration and preserves the customer's objection. No visual model verifies a mismatch.

**What if the model invents something?** Structured outputs, scoped reference checks, exact quotation/speaker/deadline validation and independent action gating catch specified problems. Citation existence does not prove semantic entailment. Agents must review the text.

**What has been measured?** Local regression/browser/build results are in EVALUATION.md. No real customer-resolution improvements or live-model accuracy have been measured in this session.

**Is it production-ready?** No. Authentication, real authority checks, integrations, broader evaluation and operational controls remain. All financial actions are simulated.

## Submission checklist

- [ ] Read the actual event rubric and requirements.
- [ ] Run real live evaluation and review every case.
- [ ] Reset and rehearse the main demo on the presentation computer.
- [ ] Check the source ZIP on a second computer.
- [ ] Record a short video and retain a fixture fallback.
- [ ] Collect at least one real piece of user feedback if feasible.
- [ ] Include README, architecture, evaluation results and demo script.
- [ ] Confirm the ZIP/repository contains no keys or real customer data.
- [ ] Fill in team details, repository/video links and required attribution.
