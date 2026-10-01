# ParcelProof — Retrieval-Augmented Generation (RAG) Architecture

ParcelProof's RAG pipeline indexes authoritative lifecycle events and enforces multi-tenant case isolation.

---

## 1. Indexed Entities
- **Order & Product Catalog**: (`ORD-2026-...`, `PROD-...`, item name, amount, shipping address)
- **Courier Delivery Proofs**: (Delivery photos, GPS metadata, dropoff timestamps, courier notes)
- **Customer Support Transcripts**: (Multi-turn dispute messages, uploaded photos, household details)
- **Agent Commitments**: (Documented promises, deadlines, agent signatures)
- **Financial Ledger**: (Refund initiations, payout timestamps, idempotency keys)
- **Regulatory Policies**: (Regional customer terms, e.g. `POL-US-2`)

---

## 2. Pre-Retrieval Authorization Filter
Retrieval is strictly scoped before vector ranking:
```
Query → Authorize User (Role + Account ID) → Filter Scoped SQLite Sources → Vector & BM25 Similarity Ranking → Top-K Sources → LLM Synthesis with Citations
```
