# ParcelProof — Deterministic 0–100 Refund Assessment Engine

> **"Delivered is a status. Proof is a story."**

The **Refund Assessment Score** is a transparent, explainable decision-support signal computed for business owners and operations leads. It does **not** replace the human decision-maker and does not automatically disburse funds.

---

## 1. Transparent Scoring Architecture

The engine uses a deterministic multi-factor model evaluated over authoritative database records, verified RAG citations, and structured courier/customer testimonies:

| Factor | Weight Range | Calibration Benchmark (PP-1042) | Description |
|---|---|---|---|
| **Customer Evidence** | 0 – 20 | **+18** | Evaluates customer testimony depth, location specifics, and customer-submitted photos. |
| **Delivery Evidence Consistency** | 0 – 20 | **+17** | Detects physical contradictions between dropoff claims and customer premises (e.g. no reception). |
| **Courier Evidence Consistency** | 0 – 15 | **+10** | Assesses dropoff method (direct handoff vs unverified shared dropoff). |
| **Previous Commitments** | 0 – 15 | **+15** | Verifies documented support agent promises, quoted text, and deadline status. |
| **Financial Ledger History** | 0 – 10 | **+10** | Checks whether a refund has already been recorded (prevents duplicate payouts). |
| **Timeline Consistency** | 0 – 10 | **+8** | Measures time elapsed between marked delivery and customer dispute filing. |
| **Policy Eligibility** | 0 – 14 | **+14** | Evaluates applicable regional dispute policies (e.g. `POL-US-2`). |
| **Uncertainty Adjustments** | Variable | **-8 / -2** | Flags unverified GPS coordinates, missing geotags, or unconfirmed recipient identities. |
| **Total Score** | **0 – 100** | **82 / 100** | **Strong Evidence Supporting Refund Review** |

---

## 2. Score Interpretation Bands

- **85 – 100**: *Very strong evidence supporting refund review*
- **70 – 84**: *Strong evidence supporting refund review* (e.g., PP-1042 = 82)
- **40 – 69**: *Mixed / requires additional review*
- **0 – 39**: *Insufficient support for refund recommendation*

---

## 3. Closed-Loop Feedback Loop

```
Customer Uploads New Evidence
             ↓
 SQLite Database Stores Evidence Record
             ↓
 RAG Indexes New Context Chunk
             ↓
 Assessment Engine Recomputes Factors
             ↓
 Score Updates Transparently (e.g. 74 → 82)
             ↓
 Owner Review Screen Displays Delta & Audit Log
             ↓
 Owner Makes Final Decision (Approve / Reject / Request Info / Escalate)
```
