# ParcelProof AI — 2-Minute Flagship Demo Walkthrough

This demo highlights how **ParcelProof AI** empowers human support agents with persistent memory, case isolation, evidence-grounded RAG, and cross-session continuity.

---

### Step 1: Open Flagship Case `PP-1042` ("Broken Promise")
1. Open `http://127.0.0.1:3000` in your browser.
2. Select case **01 Broken promise (`PP-1042`)**.
3. Point out the verified customer `Alex Morgan`, delivery status `Delivered · disputed`, and order value `$129.00`.
4. Observe the **Risk Signals**:
   - `⚠ Commitment Deadline Exceeded`
   - `⚠ Customer Contacted Support Multiple Times`
   - `⚠ Courier / Customer Evidence Conflict`
   - `⚠ Delivery Location Disputed`

---

### Step 2: Analyze Case & Examine the Promise Ledger
1. Click **Re-analyze case** (or **Analyze case**).
2. The system executes RAG retrieval and extracts the overdue promise:
   - Quotation: *"Your refund will be initiated within 24 hours."*
   - Promised by: `Maya Chen` on Sept 30, 09:00 UTC.
   - Deadline: Oct 1, 09:00 UTC (`OVERDUE`).
   - Grounded Source Citation: `[SUP-1042-01]`.
3. Point out the **Refund Ledger Status**: `Not initiated` (`[REF-PP-1042]`).
   - *Key takeaway:* The database ledger is authoritative on financial state; the AI does not hallucinate that money moved.

---

### Step 3: Interactive ParcelProof AI Copilot
1. Click on the **AI Copilot** tab (or bottom navigation icon).
2. Click the quick prompt: **"What did the previous agent promise?"**
   - AI answers with exact quotation, promised timestamp, agent name, overdue status, and cited source chips `[SUP-1042-01]`, `[REF-PP-1042]`.
   - Click `[SUP-1042-01]` to inspect the original transcript.
3. Click the quick prompt: **"Was the refund completed?"**
   - AI verifies the SQLite ledger and confirms `not_initiated`.
4. Click the quick prompt: **"Why is this delivery disputed?"**
   - AI surfaces the conflict: Courier reports *"Left at reception"* with photo (`[COU-1042-01]`), but customer reports building has no reception and disputes the doorway photo (`[SUP-1042-02]`).
   - AI maintains strict neutrality without fabricating fraud accusations.
5. Click the quick prompt: **"What should I do next?"**
   - AI checks policy `[POL-US-2]` and recommends approving simulated refund initiation.

---

### Step 4: Human-in-the-Loop Action Approval
1. Return to **Case overview** tab.
2. Under **Next justified action**, review the policy rationale and click **Approve simulated refund · $129.00**.
3. Observe:
   - Atomic database update writes audit record `ACT-...` and marks refund ledger as `initiated`.
   - Promise Ledger immediately reflects `FULFILLED` status.
   - Duplicate protection activates: attempting approval again prevents duplicate refund.

---

### Step 5: Seamless Shift Handoff & Continuity
1. Click **Switch agent** in the header.
2. The active agent switches to `Daniel Kim`.
3. Open the **Shift handoff** tab.
4. Point out the **Next Agent Brief**:
   - `Customer Issue`
   - `Important Verified Information`
   - `Previous Commitment`
   - `Unresolved Conflict`
   - `Next Action`
5. Daniel has full cross-shift memory and never needs to ask the customer to repeat their story!

---

### Step 6: Case Isolation Verification
1. Switch to **03 Shared household (`PP-1044`)**.
2. Show that `PP-1044` has **zero borrowed promises** from `PP-1042`, distinguishes speaker `Alex Morgan` from recipient `Jordan Morgan`, and halts unauthorized refunds.

