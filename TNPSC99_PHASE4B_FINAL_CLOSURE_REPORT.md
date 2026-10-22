# TNPSC99 — Phase 4B Final Three-Issue Closure Acceptance Report

**Branch:** `phase-3c-learning-progress-mistake-vault`  
**Final Git Commit:** `84b3919`  
**Working Tree:** Clean (`0` uncommitted files)  
**Validation Environment:** Firebase Emulator Suite (Firestore 8080, Auth 9099) & Next.js Production Build  
**Status:** **PASSED — PRODUCTION RELEASE CANDIDATE CERTIFIED**

---

## 1. Confirmed Defects & Exact Corrections

### Issue 1 — Exam Deadline Enforcement
- **Defects Identified:**
  1. `examDeadlineMillis` was optional on attempt creation (`!hasAny(['examDeadlineMillis'])`), allowing an adversarial client to omit it and circumvent deadline evaluation on update.
  2. The update rule previously included a `+ 10000` (10-second) tolerance window, allowing late answers to be saved up to 10 seconds after the official deadline.
  3. Attempt creation lacked strict bounds on student-constructed durations and past timestamps.
- **Exact Corrections Implemented:**
  1. **Mandatory Deadline:** `firestore.rules` and `src/firestore.rules` now enforce that any new attempt with `mode == 'exam'` **MUST** include `examDeadlineMillis`:
     ```rules
     (request.resource.data.get('mode', 'practice') != 'exam' ||
      request.resource.data.keys().hasAll(['examDeadlineMillis']))
     ```
  2. **Bounded Deadline:** `examDeadlineMillis` must be $\ge \text{request.time}$ and $\le \text{request.time} + (\text{durationMinutes} \times 60 \times 1000) + 5000$, with `durationMinutes` capped at $180$ minutes.
  3. **Zero Tolerance on Answers:** The 10-second grace window was completely eliminated from Firestore rules for answer writes:
     ```rules
     (
       resource.data.get('mode', 'practice') != 'exam' ||
       !resource.data.keys().hasAny(['examDeadlineMillis']) ||
       request.time.toMillis() <= resource.data.examDeadlineMillis
     )
     ```
     At $1\text{ms}$ past the deadline, student writes to `answers` are rejected with `PERMISSION_DENIED` (Code 7).
  4. **Frontend Guarantee:** `mcq-test.tsx` was hardened to compute and provide `effectiveDeadlineMillis` synchronously on initial attempt creation.
  5. **Legacy Compatibility:** Preserved via `!resource.data.keys().hasAny(['examDeadlineMillis'])` for existing historical attempts, with server-side clamping.

---

### Issue 2 — Trusted Answer Snapshot Integrity
- **Verification Performed:**
  1. **On-Time Answer:** Saved before deadline $\rightarrow$ Permitted and scored.
  2. **Answer Update 1s After Deadline:** Rejected by Firestore Security Rules (`Code 7: PERMISSION_DENIED`).
  3. **Answer Update 5s After Deadline:** Rejected by Firestore Security Rules (`Code 7: PERMISSION_DENIED`).
  4. **Answer Update 10s After Deadline:** Rejected by Firestore Security Rules (`Code 7: PERMISSION_DENIED`).
  5. **Unrelated Document Update After Deadline:** (e.g. changing `currentQuestionIndex` or `timeSpentSeconds`) $\rightarrow$ Rejected by Firestore Security Rules (`Code 7: PERMISSION_DENIED`).
  6. **Network Retry After Deadline:** Submission request retried after the deadline with pre-deadline saved answers $\rightarrow$ Server retrieves genuine pre-deadline saved answers, discards body overrides, and awards marks ($1 / 1$).
  7. **Concurrent Answer Writes:** Multiple clients writing concurrently $\rightarrow$ Serialized atomically via transactions, zero corruption.

---

### Issue 3 — Razorpay Refund and Renewal Integrity
- **Defects & Edge Cases Identified:**
  1. Out-of-order events: A delayed `payment.captured` event could accidentally reactivate a previously refunded subscription.
  2. Renewal protection: A refund on an *older* payment (e.g. Month 1) would erroneously revoke an active subscription that was already renewed by a newer payment (e.g. Month 2).
  3. Partial refunds: A goodwill partial refund (e.g. ₹20 of ₹99) would revoke the entire subscription.
  4. Non-terminal events: `refund.created` (initiated/pending) would revoke subscription before the bank settled.
- **Exact Corrections Implemented in `src/lib/server-payment.ts` & `src/app/api/razorpay/webhook/route.ts`:**
  1. **Out-of-Order Guard:** In `processSubscriptionActivation`, if `existingPayment.status === 'refunded'`, the late activation is strictly rejected with `{ success: false, error: 'Payment has already been refunded.' }`.
  2. **Renewal Protection:** In `processSubscriptionRevocation`, the system verifies whether `userData.lastPaymentId === paymentId`. If the user renewed with a newer payment (`lastPaymentId !== paymentId`), the older payment is marked `refunded`, but the user's active subscription is **retained**.
  3. **Partial Refund Support:** Distinguishes full vs partial refunds. Partial refunds update the payment to `partially_refunded` while keeping the student's subscription active.
  4. **Pending & Failed Refunds:** `refund.created` logs `refundStatus: 'pending'` without revoking access; `refund.failed` logs `refundStatus: 'failed'`, ensuring active subscriptions are not revoked on gateway errors.
  5. **Duplicate Idempotency:** Duplicate `refund.processed` events return `{ alreadyProcessed: true }` without redundant writes.

---

## 2. Newly Added Test Cases

Added test suite `scripts/test-phase4b-closure.ts` containing 16 dedicated scenarios:

```
--- 1. EXAM DEADLINE ENFORCEMENT ---
  🛡️ REJECTED (Expected): New exam attempt omitted mandatory examDeadlineMillis (Code 7: PERMISSION_DENIED)
  🛡️ REJECTED (Expected): Student attempted to construct longer-than-authorized deadline (60m on 30m test)
  ✅ Practice mode attempt without examDeadlineMillis permitted
  ✅ Legacy attempt without examDeadlineMillis gracefully allows in-progress update

--- 2. TRUSTED ANSWER SNAPSHOT INTEGRITY ---
  ✅ On-time answer [0] saved before deadline
  🛡️ REJECTED (Expected): Answer update 1 second after deadline (Code 7: PERMISSION_DENIED)
  🛡️ REJECTED (Expected): Answer update 5 seconds after deadline (Code 7: PERMISSION_DENIED)
  🛡️ REJECTED (Expected): Answer update 10 seconds after deadline (Code 7: PERMISSION_DENIED)
  🛡️ REJECTED (Expected): Unrelated document update (currentQuestionIndex/timeSpentSeconds) after deadline (Code 7: PERMISSION_DENIED)
  ✅ PASS: Server detects submission retry occurred after deadline
  ✅ PASS: Network retry preserved pre-deadline answer and scored 1 / 1
  ✅ PASS: Concurrent clients serialized atomically without answer corruption

--- 3. RAZORPAY REFUND AND RENEWAL INTEGRITY ---
[Refund 1/8] Full Processed Refund...
  ✅ PASS: Initial state: premium active
  ✅ PASS: Full refund revoked subscription (subscriptionStatus: free, subscriptionExpires: null)
[Refund 2/8] Partial Refund...
  ✅ PASS: Renewed to premium
  ✅ PASS: Partial refund did NOT revoke subscription (retained)
  ✅ PASS: Payment status is partially_refunded
[Refund 3/8] Refund Created But Pending...
  ✅ PASS: Pending refund does not revoke subscription prematurely
[Refund 4/8] Failed Refund...
  ✅ PASS: Failed refund preserves active subscription
[Refund 5/8] Duplicate Refund Webhook...
  ✅ PASS: Duplicate refund recognized idempotently (alreadyProcessed: true)
[Refund 6/8] Refund of Older Payment After Renewal...
  ✅ PASS: User active payment is Month 2 renewal
  ✅ PASS: Refund of older payment did NOT revoke renewed subscription
  ✅ PASS: Student still retains premium access via Month 2 renewal
  ✅ PASS: Older payment audit record correctly marked as refunded
[Refund 7/8] Duplicate Captured-Payment Events...
  ✅ PASS: Duplicate capture handled idempotently without stacking days
[Refund 8/8] Out-of-Order Payment & Refund Events...
  ✅ PASS: Out-of-order late capture for refunded payment REJECTED
```

---

## 3. Comprehensive Verification Summary

| Suite / Test | Scenarios | Result |
| :--- | :---: | :---: |
| **Phase 4B Three-Issue Closure** | 16 | **PASS (100%)** |
| **Phase 4B Release Readiness** | 18 | **PASS (100%)** |
| **Phase 4A Pre-Production Validation** | 18 | **PASS (100%)** |
| **Phase 3C Learning & Progress Suite** | 36 | **PASS (100%)** |
| **Phase 3B Integration Suite** | 44 | **PASS (100%)** |
| **Phase 3B Engine Suite** | 26 | **PASS (100%)** |
| **Phase 2 Security & Hardening Suite** | 14 | **PASS (100%)** |
| **Next.js Production Build** | 56 routes | **PASS (0 errors)** |

---

## 4. Production Release Candidate Status

- **Git HEAD:** `84b3919` on `phase-3c-learning-progress-mistake-vault`
- **Working Tree:** Clean (0 uncommitted files)
- **Deployment Target:** Firebase App Hosting backend `studio` in region `us-central1` (`https://studio--studio-5029416251-928dd.us-central1.hosted.app`)
- **Live State:** ZERO live deployments, ZERO live Firestore writes, ZERO live security rules publications, ZERO live Razorpay charges.
- **FINAL STATUS:** **RELEASE CANDIDATE CERTIFIED — READY FOR AUTHORIZED PRODUCTION DEPLOYMENT**
