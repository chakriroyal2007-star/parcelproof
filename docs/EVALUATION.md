# Observed evaluation results

Run locally on October 1, 2026 with Node 22.23.2. This is a synthetic regression suite, not a live-model benchmark or a business-impact study.

| Check | Observed result |
|---|---|
| Core behavior and guardrails | **19/19 passing** |
| Live-path SDK contract, mocked provider | **2/2 passing** |
| Browser workflows in installed Google Chrome | **3/3 passing** |
| Production build (Next.js, webpack) | **Passing** |
| TypeScript | **Passing**, including build type validation |
| Synthetic ingestion | **10 retrievable source records, 11 chunks**; separate account context |
| Actual live embedding/model requests | **Not run**; requires a real API key |

## What was exercised

- Ingestion, overlapping chunks and cosine ranking math.
- Order/account filtering before ranking; another household order's promises and conversations stay excluded.
- Current US policy selected; retired v1 and unavailable CA policy excluded.
- Exact promise quotation, correct speaker and 24-hour deadline; overdue initiation promise surfaced.
- Citations resolve to real scoped sources; invented and cross-order citations rejected.
- Missing delivery scan/policy/recipient authority leads to escalation, never refund eligibility.
- Existing refund initiation fulfills the initiation commitment, blocks duplicate initiation and does not claim payment completion.
- Unsupported pre-execution completion language and incompatible model action rejected in the checked patterns.
- Stale analysis rejected; approval atomically updates ledger, audit trail, Promise Ledger and handoff.
- Replayed idempotency key returns the existing action; cross-order reuse is rejected; new keys cannot create duplicate refund initiation.
- Handoff persists through agent switching and reload, including disputed reception claims and completed-action citations.
- Mocked live SDK contract exercises actual application ingestion/retrieval/generation code, two strict JSON-schema Responses calls, server-only provider setup and `store:false`. Missing/model-mismatched vectors fail closed. **The provider responses in these two tests are mocked.**
- Browser clicks cover analysis, citation dialog, reply generation, approval, shift switching and persisted handoff. Separate cases cover household isolation and missing evidence. Mobile width 390px has no horizontal overflow.

## Issues found and corrected during verification

A negative financial statement initially triggered an overly broad wording guard; bundled font paths contained a duplicate directory; and Next.js's internal request hostname differed from the browser host. These were corrected and the relevant suites rerun successfully. The local sandbox also blocks Turbopack's compiler IPC, so the reproducible build uses webpack.

## Scope of these results

Passing checks establish behavior for this small synthetic corpus and the tested failure modes. They do not establish general citation entailment, hallucination rates, policy accuracy, production authorization, model quality, payment correctness or cost/time savings. Regex checks are supplemental; the independent policy gate and database constraints control financial actions.

Before a live presentation, configure a real API key, run live ingestion, analyze all four cases, and manually inspect quotations/citations and reply language. No live-provider quality or latency claim is made here.

Screenshots: [desktop](dashboard-desktop.png), [handoff](dashboard-handoff.png), [mobile](dashboard-mobile.png).

## Portability additions

Portable setup and doctor commands were exercised on macOS; setup preserved existing configuration and all doctor checks passed. The core test command now enumerates files in Node instead of depending on shell glob expansion. Windows/Linux CI configuration and Docker files are provided but have not been executed here. The live-evaluation command is implemented; actual provider execution remains unperformed without credentials.
