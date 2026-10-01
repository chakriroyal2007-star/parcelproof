# ParcelProof — Evidence-Driven Delivery Dispute Resolution

> *"Delivered is a status. Proof is a story."*

ParcelProof transforms delivery dispute management into an enterprise-grade, evidence-grounded AI system connecting Customers, Support Specialists, and Operations Leadership.

---

## 🏛️ Enterprise Product Portals

ParcelProof delivers a unified product experience with 3 specialized portals powered by the same shared AI/RAG engine:

1. **Customer Portal (`/customer`)**:
   - Order history and delivery timeline tracking
   - Real SQLite dispute filing with automated case ID generation
   - **Customer-Safe AI Assistant**: Answers questions regarding dispute progress, policy guidelines, and refund status without leaking internal operational notes or unverified risk scores.
   - Strict customer account data isolation enforced prior to RAG retrieval.

2. **Agent Portal (`/agent`)**:
   - Dispute Queue Inbox with real-time AI signals (Overdue promises, Courier conflicts, Missing photo evidence).
   - Flagship Case Workspace for `PP-1042` through `PP-1045`.
   - **Interactive ParcelProof AI Copilot**: Grounded multi-turn conversational reasoning, SLA memory, and source citations.
   - Simulated Human-in-the-Loop financial action approval with immutable ledger state.
   - Cross-shift continuity handoffs with **Next Agent Briefs**.

3. **Admin Intelligence Console (`/admin`)**:
   - Real-time operational metrics: active disputes, overdue commitments, conflict rates, and approved actions.
   - Complete dispute registry search and case inspector.
   - Agent shift allocation and workload monitoring.
   - Versioned dispute resolution policy catalog (`POL-US-2`, `POL-US-1`).
   - Immutable audit trail and governance log.

---

## 🔑 Demo Accounts & Authentication

Access the login portal at **`/login`** (includes one-click demo credentials):

| Role | Demo User | Email | Password | Scope |
|---|---|---|---|---|
| **Customer** | Alex Morgan | `alex@example.com` | `password123` | Household `HH-208` (`PP-1042`, `PP-1044`) |
| **Customer** | Sam Rivera | `sam@example.com` | `password123` | Household `HH-309` (`PP-1043`) |
| **Agent** | Priya Shah | `priya@parcelproof.com` | `password123` | Specialist Shift (Full case access) |
| **Agent** | Daniel Kim | `daniel@parcelproof.com` | `password123` | Specialist Shift (Full case access) |
| **Admin** | Sarah Connor | `admin@parcelproof.com` | `password123` | Executive & Operations Management |

---

## 🚀 Quick Start

```bash
# 1. Run all 44 automated unit, evaluation, and security tests
npm test

# 2. Type check (0 TypeScript errors)
npm run typecheck

# 3. Start development server
npm run dev
```

Open **http://127.0.0.1:3000** in your browser.


## Flagship 2-Minute Demo Flow

1. Open **01 Broken promise (`PP-1042`)**.
2. Click **Analyze case** to reconcile courier records, prior promises, and refund status.
3. Open the **AI Copilot** tab and ask:
   - *"What did the previous agent promise?"* → Returns exact quotation, deadline, and source citation `[SUP-1042-01]`.
   - *"Was the refund completed?"* → Checks SQLite refund ledger and confirms `not_initiated`.
   - *"Why is this delivery disputed?"* → Highlights courier reception claim vs customer doorway contradiction.
   - *"What should I do next?"* → Recommends policy-compliant simulated refund under `POL-US-2`.
4. Click **Approve simulated refund** on the Overview tab to record an atomic simulated refund with audit trace.
5. Click **Switch agent** to switch to `Daniel Kim` and open **Shift handoff** to inspect the persisted **Next Agent Brief**.

## Enable Live OpenAI Mode

Set these server-only variables in `.env.local`:

```dotenv
AI_MODE=live
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small
```

Then run:
```bash
npm run ingest
npm run dev
```


**Fixture mode is not live RAG or LLM inference.** It uses real source ingestion/chunking and deterministic lexical/exact-ID retrieval, an exact synthetic promise extractor, and authored narrative rules. No fake vectors or confidence scores are generated. After approval, both modes use a clearly labeled deterministic refresh so the confirmed database state immediately replaces stale financial language. Re-analysis restores model-authored output in live mode.

The fixed scenario clock is **2026-10-01 12:00 UTC**: the promise made September 30 at 09:00 is overdue by three hours. Actual audit writes use wall-clock time. The UI labels the scenario clock, and all timestamps render in UTC. Change `DEMO_NOW` only if you intend to change policy/deadline behavior.

## Architecture

```text
Next.js client dashboard
    │ same-origin, validated API operations
    ▼
Case service ── SQLite orders + current refund ledger + audit events
    │
    ├─ scoped support/courier records + date/region-filtered policy
    │       └─ chunks → real embeddings → local SQLite vector index
    │                    └─ cosine + lexical + exact-ID retrieval
    ├─ separate, minimal account context (no other orders' conversations)
    ├─ LLM 1: structured speaker/claim/commitment extraction
    └─ LLM 2: cited reconciliation, recommendation, reply, handoff
            ▼
    Zod + source/quote validation + deterministic eligibility gate
            ▼
    Agent approval → SQLite transaction + idempotency/unique constraint
            ▼
    Updated ledger, promise status, draft invalidation, persisted handoff
```

See [architecture](docs/ARCHITECTURE.md), [evaluation results](docs/EVALUATION.md), [three-minute demo](docs/DEMO.md) and [pitch](docs/PITCH.md).

## Commands

| Command | Purpose |
|---|---|
| `npm run setup` | Create local configuration safely and seed synthetic records |
| `npm run doctor` | Check Node, dependencies, SQLite, configuration and writable storage without API calls |
| `npm run evaluate:live` | Run a separate four-case live-provider evaluation and save a report |
| `npm run dev` | Local development server, bound to loopback |
| `npm run build` | Production build and Next.js type validation |
| `npm start` | Serve production build on loopback |
| `npm run seed` | Initialize synthetic SQLite records without overwriting work |
| `npm run reset` | Erase the configured demo database and reseed; stop server first |
| `npm run ingest` | Chunk fixtures; embed with API when `AI_MODE=live` |
| `npm run typecheck` | TypeScript verification |
| `npm test` | Isolated fixture and guardrail evaluations using temporary SQLite |
| `npm run test:e2e` | Browser workflow checks; separate `data/e2e.sqlite` |

For browser checks, install Chromium once with `npx playwright install chromium`. On a machine with Google Chrome already installed, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` instead. The browser suite starts its own server at port 3100. Main demo data is unaffected. `npm test` is fully offline; it does **not** measure live model quality.

## Running on another system and troubleshooting

The [complete setup guide](docs/SETUP.md) includes shell-specific commands, configuration variables, Docker data persistence, backups, resets, port changes, browser installation, model errors and network/proxy troubleshooting. Use `npm ci` to install the locked dependencies on the target machine; do not transfer `node_modules` or `.next` from another OS.

## Hackathon assessment

The Promise Ledger and shift-change reveal make a focused demo. Winning is not guaranteed; the event rubric and competitors are unknown. The highest-value remaining work is real live-model validation, a rehearsed presentation, actual support-user feedback and a short fallback recording. [Read the readiness guide](docs/HACKATHON.md) for priorities, judge questions and a submission checklist. No business-impact numbers are invented.

## Project map

- `app/page.tsx`, `app/globals.css`: responsive agent dashboard, evidence dialogs, editable reply and handoff.
- `app/api/cases`: validated case reads and workflow commands.
- `lib/fixtures.ts`: all synthetic records and versioned policies.
- `lib/db.ts`: SQLite schema, direct identity/financial reads, scoped access.
- `lib/retrieval.ts`: chunking, embedding ingestion and local hybrid vector retrieval.
- `lib/engine.ts`: structured extraction, grounded generation, validation, policy gate, approval transaction.
- `lib/types.ts`: shared types and Zod output schemas.
- `tests`: focused behavioral checks and browser workflows.
- `scripts/setup.mjs`, `scripts/doctor.mjs`, `scripts/test.mjs`: portable setup, checks and test discovery.
- `scripts/evaluate-live.ts`: isolated real-provider evaluation runner.
- `Dockerfile`, `compose.yaml`: optional local container deployment with persistent data.
- `.github/workflows/checks.yml`: fixture tests/builds across three OS runners once pushed to GitHub.

## Boundaries and honest limitations

This is a local, single-process hackathon prototype, not a production support platform. It has no authentication, real recipient verification, real courier integrations or payment gateway. Agent switching is a simulation. Do not expose it publicly or load real customer data without adding authentication, authorization, operational controls and a proper tenant model. The development/production scripts bind to loopback.

The eligibility gate encodes the **synthetic US policy v2** as code, by design; it does not execute arbitrary policy text. New policy versions require matching reviewed gate code. Region/date filtering excludes retired or irrelevant policies. The CA case deliberately has no applicable policy.

The delivery image is a hand-authored SVG illustration representing a simulated courier upload. No image model verifies a doorway mismatch. The customer's objection remains a disputed claim.

Source existence, exact quotations, output shape and action eligibility are enforced in code. Citation validation is **not proof of semantic entailment**; model-authored sentences still require agent review. Phrase checks are an additional guard, not a general hallucination detector. The small evaluation set establishes regression behavior, not statistical accuracy. No time-saving, accuracy, cost or business-impact claims are invented.

The project uses webpack for consistent local builds across restricted environments. Local vector search scans eligible vectors in memory—appropriate for a small demo corpus. There is no background ingestion queue. Re-run ingestion after changing sources or embedding models. The interface uses system fonts and ParcelProof branding; no Oracle logos, fonts or decorative image assets are bundled.

## Implementation references

The live path follows the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) and [embeddings guide](https://developers.openai.com/api/docs/guides/embeddings). Dependency versions are recorded in `package-lock.json` after installation.
