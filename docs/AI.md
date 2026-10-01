# ParcelProof — AI Architecture & Copilot Engine

ParcelProof integrates live Large Language Models via OpenRouter alongside deterministic evidence reconciliation.

---

## 1. Principles of AI Operation
1. **Zero Fake AI**: Production and live mode connect to OpenRouter or standard OpenAI endpoints using real embeddings and semantic context.
2. **Deterministic Fallback**: In the absence of an API key or during network disruptions, the system gracefully falls back to deterministic RAG reconstruction without crashing or hallucinating.
3. **Strict Data Boundary**: Courier claims are treated as claims (`COURIER_CLAIM`), not ground truth. Customer claims are treated as testimony.
4. **Multimodal Reality**: If vision APIs are unavailable, the model marks the delivery photo as `requires manual review` rather than inventing photo contents.
5. **Prompt Injection Defense**: Untrusted customer and courier inputs are strictly wrapped in data tags and evaluated as factual assertions, preventing system override.

---

## 2. Supported AI Operations
- **Customer Dispute Copilot**: Answers customer inquiries with strict privacy scoping and source citations.
- **Adaptive Intake Questions**: Progressively asks only relevant follow-up questions during dispute filing.
- **Owner AI Copilot**: Grounded Q&A for business owners ("Why did the system assign 82?", "What evidence conflicts?").
- **Admin Semantic Intelligence**: Cross-case operational Q&A and policy compliance audits.
