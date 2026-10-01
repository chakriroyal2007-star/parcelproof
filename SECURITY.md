# ParcelProof — Security & Access Control Model

---

## 1. Four Isolated Roles
1. **CUSTOMER**: Scoped exclusively to their own account (`accountId`) and orders.
2. **DELIVERY_AGENT**: Scoped exclusively to deliveries assigned to them.
3. **OWNER**: Operations access for order assignment, dispute analysis, and refund approvals.
4. **ADMIN**: Full system auditing, user management, and policy oversight.

---

## 2. API Key Protection
- `OPENROUTER_API_KEY` is loaded strictly on the server (`process.env`).
- Never bundled into client-side Next.js chunks or sent in API responses.
- Secure cookie-based and session-token authentication.
