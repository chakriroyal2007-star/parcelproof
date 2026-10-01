# ParcelProof

**Delivered, but to whom?**

When a parcel is marked delivered but the customer never received it, support teams must reconstruct the truth across courier notes, earlier conversations and refund systems. Shared household accounts make identity assumptions especially risky. Every shift change can erase context.

ParcelProof is an evidence-backed agent workspace that connects the relevant records, preserves contradictory claims and recommends the next policy-justified action with inspectable citations.

Its differentiator is the **Promise Ledger**. It extracts exact commitments from support history and reconciles them against the actual refund ledger: **“A refund was promised yesterday, but no refund initiation is recorded.”** A promise is never confused with refund eligibility.

Real RAG retrieves order-scoped support, courier and policy evidence. Structured LLM calls extract commitments and reconcile claims, then draft a context-aware reply and handoff. Identity and financial status come directly from SQLite. A human approves every simulated action, and duplicate prevention is enforced in the database.

The demo proves the workflow across a broken promise, an existing refund, a shared household and missing evidence. It is not a production integration or a measured business-impact study. All data is synthetic, fixture mode is labeled, and no money or messages leave the app.

**The next agent inherits the story—not another frustrated customer.**
