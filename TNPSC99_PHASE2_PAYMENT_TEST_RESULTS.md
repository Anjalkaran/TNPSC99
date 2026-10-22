# TNPSC99 — Phase 2: Payment Security Test Results
**Document ID:** `TNPSC99-P2-PAY-001`  
**Execution Date:** October 2026  
**Test Suite:** `scripts/test-phase2-security.ts` & Mock Payment Integration  
**Branch Under Test:** `phase-2-core-security-hardening` (`e5c3a86`)  
**Status:** ALL TESTS PASSED

---

## 1. Payment Security Architecture Overview

The TNPSC99 payment pipeline was re-architected to implement zero-trust server validation:
1. **Unauthenticated API Access Blocked:** All payment creation and verification requests require a valid Firebase ID token in the `Authorization: Bearer <token>` header.
2. **Server-Side Pricing Control:** The price of ₹99.00 (9900 paise, INR) is enforced strictly on the server.
3. **Cryptographic Integrity:** Signatures are validated using constant-time HMAC SHA256 comparison.
4. **Asynchronous Webhook Processing:** Dedicated webhook handler at `/api/razorpay/webhook` with signature verification.
5. **Replay Attack Prevention & Idempotency:** Payment audit logs in `/payments/{paymentId}` prevent duplicate entitlement grants.

---

## 2. Payment Test Execution Matrix

| Test ID | Test Scenario | Request Endpoint | Input Parameters | Expected Response | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **PAY-01** | Unauthenticated Order Request | `POST /api/razorpay/order` | No `Authorization` header | `401 Unauthorized` | 401 Unauthorized (`Missing token`) | **PASS** |
| **PAY-02** | Unauthenticated Verification Request | `POST /api/razorpay/verify` | No `Authorization` header | `401 Unauthorized` | 401 Unauthorized (`Missing token`) | **PASS** |
| **PAY-03** | Server Enforced Pricing | `POST /api/razorpay/order` | Client sends `{ amount: 1 }` | Server overrides to 9900 paise | Amount set to `9900` paise (₹99) | **PASS** |
| **PAY-04** | Valid Checkout Signature | `POST /api/razorpay/verify` | Valid `order_id + '|' + payment_id` HMAC | `200 OK` (Activated) | Signature verified; 200 OK returned | **PASS** |
| **PAY-05** | Tampered Checkout Signature | `POST /api/razorpay/verify` | Altered signature hex | `400 Bad Request` | 400 Bad Request (`Invalid signature`) | **PASS** |
| **PAY-06** | Webhook Without Signature | `POST /api/razorpay/webhook` | Missing `x-razorpay-signature` | `400 Bad Request` | 400 Bad Request (`Missing signature`) | **PASS** |
| **PAY-07** | Valid Webhook Signature | `POST /api/razorpay/webhook` | Valid HMAC SHA256 signature | `200 OK` (`received: true`) | Signature verified; processed | **PASS** |
| **PAY-08** | Tampered Webhook Payload | `POST /api/razorpay/webhook` | Altered JSON payload body | `400 Bad Request` | Signature mismatch; 400 Bad Request | **PASS** |
| **PAY-09** | Replay Attack / Duplicate Verify | `POST /api/razorpay/verify` | Same `razorpay_payment_id` sent twice | Idempotent `200 OK`, no extra $+30$ days | `alreadyProcessed: true`, expiry unaltered | **PASS** |
| **PAY-10** | Expiry Stacking on Active Sub | Internal activation logic | Active sub expiring in 15 days | New expiry = $\text{current} + 30\text{ days}$ | Expiry extended to $+45$ days from now | **PASS** |

---

## 3. Idempotency & Replay Prevention Trace

### Test Scenario: Duplicate Payment Verification Callback
```
Step 1: Student completes Razorpay payment `pay_TEST1234567890`.
Step 2: Client submits verification request to `/api/razorpay/verify`.
        - Server verifies Firebase bearer token $\rightarrow$ caller is `student_abc`.
        - Server checks `/payments/pay_TEST1234567890`. Not found.
        - Server calculates expiry: Now + 30 days = 2026-11-21T20:00:00.000Z.
        - Server commits batch write:
            * Update `/users/student_abc`: { subscriptionStatus: 'premium', subscriptionExpires: '...' }
            * Create `/payments/pay_TEST1234567890`: { status: 'captured', ... }
        - Server returns: { success: true, message: 'Subscription successfully activated.' }

Step 3: Attacker or network retry replays identical payload to `/api/razorpay/verify`.
        - Server verifies Firebase bearer token $\rightarrow$ caller is `student_abc`.
        - Server checks `/payments/pay_TEST1234567890`.
        - Document EXISTS with `status: 'captured'`.
        - Server detects duplicate submission.
        - Server skips updating `/users/student_abc`.
        - Server returns: { success: true, alreadyProcessed: true, message: 'Payment already processed...' }
```
**Outcome:** Replay attacks cannot extend subscriptions or inflate duration.

---

## 4. Webhook Reliability Simulation

### Test Scenario: Student Closes Browser Immediately After Payment
- If a student completes UPI or card payment on Razorpay but closes the browser before the client redirect triggers:
  1. Razorpay server sends a signed HTTP POST to `/api/razorpay/webhook` with event `payment.captured`.
  2. Server validates `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET`.
  3. Server extracts `userId` from `payment.notes.userId` (persisted from order creation).
  4. Server calls `processSubscriptionActivation()`.
  5. User subscription is activated in Firestore automatically.
  6. When the student reopens TNPSC99, their subscription is already active.

---

## 5. Security Conclusion

The payment processing pipeline is now robust against parameter tampering, unauthorized user impersonation, network replay attacks, and dropped browser connections.
