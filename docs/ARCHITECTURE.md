# Architecture and design decisions

## Structured truth and retrieved claims have different jobs

SQLite supplies the selected order identity, recipient verification state and current refund status directly. Those facts never come from semantic similarity. Each order gets a synthetic `ORDER-…` and `REF-…` source record so factual claims can cite inspectable structured state. Action IDs resolve to immutable audit events.

Support and courier records are selected with exact **accountId AND orderId** SQL predicates before ranking. Policies are filtered by region and effective interval at the fixed decision clock. Account-level context is queried separately, has no order ID, and contains only a shared-account caution. It cannot import another household member’s conversation.

## Real ingestion and hybrid retrieval

`npm run ingest` chunks support conversations, courier notes and versioned policies into 700-character windows with 120-character overlap. Source ID, order/account scope, timestamp, type and policy metadata remain attached through the source relation. Chunk IDs include content hashes; changed chunks invalidate old vectors. Live ingestion batches real `text-embedding-3-small` calls and persists vectors/model IDs in SQLite. The SQLite chunk table is the lightweight local vector index.

Live retrieval embeds the query, loads only pre-scoped chunks, ranks by cosine similarity plus lexical overlap and exact order-identifier boosts, rejects negligible relevance and selects up to 12 passages. The relevance cutoff is an engineering heuristic, not a confidence score. Full scoped support records used for extraction are pinned when absent from retrieval, so quotations remain inspectable. No third-party order can be rescued by a high similarity score. Missing/outdated vectors cause an explicit error rather than fake embeddings.

## Two LLM stages

1. **Extraction:** scoped conversations become validated speakers, claims, commitments, deadlines and questions. Commitments must quote exact source text and carry the source timestamp. Proposals and unknown intent stay separate from committed promises.
2. **Reconciliation:** retrieved passages, extraction, separate account context, structured ledger facts and the authoritative policy gate become cited conflicts, recommendation rationale, prerequisites, responsible team, customer reply and handoff.

The server uses the Responses API with `zodTextFormat`, validates the parsed object again and checks all citation IDs against the current input scope. Input records are serialized as data; system instructions explicitly reject instructions embedded in evidence. There are no model tools and the model cannot execute a refund. An agent reviews the output. Extraction errors, unsupported references, refusals and incompatible action suggestions fail closed.

## Promise Ledger

Exact quotation + speaker + source time + explicit deadline + promise intent form a commitment. A committed refund-initiation promise is fulfilled only when the structured refund ledger has an initiation and a supporting action ID. A past deadline without an action is overdue. Proposed promises stay proposed. Unknown intent stays unknown. No refund eligibility is inferred from a promise.

For the main case the source says “Your refund will be initiated within 24 hours.” It was made at September 30, 09:00 UTC. The clock is October 1, 12:00 UTC. The initial refund ledger says `not_initiated`. This is an overdue initiation commitment, not evidence of courier fault or of entitlement by itself.

## Approval and shift continuity

An approval requires a current analysis ID. The API ignores client-suggested action kinds and derives the action from a fresh deterministic gate. Inside `BEGIN IMMEDIATE`, it re-checks current state, looks up the idempotency key, writes an audit event and updates the refund ledger atomically. A unique partial index allows at most one refund initiation per order. Reusing the same key returns the original action. Reusing a key for another order/agent is rejected.

A confirmed action immediately refreshes financial wording, reconciles promises, clears stale reply drafts and persists an updated handoff within the same transaction. This refresh is deterministic and labeled as such, even in live mode. Model latency/failure cannot make a committed action appear uncommitted. The next analysis can generate a fresh live narrative.

Switching agents persists the handoff before changing the active simulated agent. Original records remain accessible, and all completed actions are attached to the handoff. Browser reloads recover database state. These are demo workflow semantics, not an authentication system.

## Deliberate limits

The fixture corpus is small, English-only and synthetic. Character chunking is adequate for it; a larger corpus should use token-aware sentence chunking, evaluated retrieval and a vector database. Policy applicability is evaluated at decision time. Model citations are checked for existence and scope, not automatically proven to entail the prose. There is no photo analysis, payment execution, autonomous financial action or external message sending.
