# TNPSC99 — Phase 4B Production Release Readiness Report

**Branch:** `phase-3c-learning-progress-mistake-vault`  
**Validation Date:** October 23, 2026  
**Environment:** Firebase Emulator Suite (Firestore 8080, Auth 9099) & Next.js Production Build  
**Status:** **PASSED — READY FOR AUTHORIZED PRODUCTION DEPLOYMENT**

---

## 1. Executive Summary

Phase 4B finalized all release-readiness verification checks for the **TNPSC99 ₹99 MCQ Academy** without executing production deployments or making live changes. All security controls, deployment target specifications, payment lifecycle workflows, and rule backward-compatibility requirements have been verified in the local emulator environment.

---

## 2. Task 1 — Late Firestore Answer Writes Verification & Resolution

### Defect Identified:
Previously, Firestore Security Rules allowed an authenticated student to update the `answers` array in an in-progress attempt even after the official examination deadline had passed. If `/api/test/submit` fell back to pre-deadline saved answers, it would read those late-modified answers from Firestore and award marks.

### Dual-Layer Security Solution Implemented:
1. **Layer 1 (Firestore Security Rules):**
   - Enforces `examDeadlineMillis` verification on create and update.
   - Rejects any attempt to update an active exam once `request.time.toMillis() > (resource.data.examDeadlineMillis + 10000)`.
   - Blocks direct tampering with `examDeadlineMillis` on update.
2. **Layer 2 (Server-Side Metadata Audit in `/api/test/submit`):**
   - Verifies the immutable Firestore metadata `attemptSnap.updateTime`.
   - If the attempt document in Firestore was modified after the official deadline, the server flags `isLateFirestoreDocumentWrite = true` and scores late answers as `-1` (0 marks).

### Adversarial Emulator Test Evidence:
```
--- TASK 1: Late Firestore Answer Writes Verification ---
  ✅ Legitimate on-time exam answer update permitted
  🛡️ REJECTED (Expected): Malicious client attempted late answer write to Firestore on expired exam (Code 7: PERMISSION_DENIED)
  ✅ Practice mode answer update permitted without deadline restriction
  🛡️ REJECTED (Expected): Client attempted to create exam with deadlineMillis 10 days in future (Code 7: PERMISSION_DENIED)
```

---

## 3. Task 2 — App Hosting Deployment Target Specification

The App Hosting backend configuration was inspected using the Firebase CLI and configuration files:

| Attribute | Verified Value | Notes |
| :--- | :--- | :--- |
| **Firebase Project** | `studio-5029416251-928dd` | Mapped in `.firebaserc` |
| **Backend ID** | `studio` | Mapped in `firebase.json` (`apphosting.backendId`) |
| **Primary Region** | `us-central1` | Confirmed via `firebase apphosting:backends:list` |
| **Production URL** | `https://studio--studio-5029416251-928dd.us-central1.hosted.app` | **Not** a `.web.app` domain |
| **Deployment Mode** | CLI Source Deployment | Repository field is empty; deploys directly from source |
| **Deployment Command** | `firebase deploy --only apphosting` | Strictly App Hosting; DO NOT deploy to Firebase Hosting |
| **Rollback Method** | Firebase Console $\rightarrow$ App Hosting $\rightarrow$ Rollback | Instant 1-click traffic shift to previous rollout build |

---

## 4. Task 3 — Payment Release Validation

All payment pathways were audited and verified using test credentials:

### 1. Strict ₹99 Pricing & Signature Verification:
- Order creation enforces `9900` paise (₹99.00) and `INR` currency.
- HMAC-SHA256 signature verification accepts genuine signatures and rejects tampered signatures.

### 2. Transaction Linking:
- Successful payments store `status: 'captured'`, `amount: 99`, `userId`, `orderId`, and `subscriptionExpires` in `/payments/{paymentId}`.
- Student profile updates `subscriptionStatus: 'premium'`, `subscriptionExpires: +30 days`, `lastPaymentId`, and `lastOrderId`.

### 3. Duplicate Event & Idempotency Handling:
- Duplicate checkout verifications or duplicate webhook events detect existing `status: 'captured'` payment and return `{ alreadyProcessed: true }` without double-extending the subscription.

### 4. Refund & Cancellation Revocation:
- Webhook events `refund.processed` or `refund.created` trigger `processSubscriptionRevocation`:
  - User `subscriptionStatus` immediately reverts to `'free'`.
  - User `subscriptionExpires` is cleared to `null`.
  - Payment record updates to `status: 'refunded'` with `refundId`.

### 5. Failed Payments & Expired Subscriptions:
- Failed payments are logged in `/payments` with `status: 'failed'`; user remains on `'free'` tier.
- Expired subscriptions are detected deterministically by `getSubscriptionStatus` (`isExpired: true`); access to paid tests and revision engines is blocked.

---

## 5. Task 4 — Rules & Application Compatibility

1. **Release Order Compatibility:**
   - Newly published rules contain graceful fallback `!resource.data.keys().hasAny(['examDeadlineMillis'])`, ensuring cached in-flight client sessions are not broken when rules are deployed before frontend assets.
2. **Legitimate Student Operations Verified:**
   - Profile updates (displayName, phone) $\rightarrow$ Permitted.
   - Practice mode tests $\rightarrow$ Permitted without timer restrictions.
   - On-time exam mode tests $\rightarrow$ Permitted within deadline.
   - Bookmarks creation and lookup $\rightarrow$ Permitted.
   - History and Mistake Vault read operations $\rightarrow$ Permitted.
3. **Rollback Procedures Prepared:**
   - **Application Rollback:** Firebase Console $\rightarrow$ App Hosting $\rightarrow$ Revert rollout build.
   - **Rules Rollback:** `git checkout HEAD~1 -- firestore.rules src/firestore.rules && firebase deploy --only firestore:rules`.

---

## 6. Comprehensive Verification Summary

| Suite / Test | Scenarios | Result |
| :--- | :---: | :---: |
| **Phase 4B Release Readiness** | 18 | **PASS (100%)** |
| **Phase 4A Pre-Production Validation** | 18 | **PASS (100%)** |
| **Phase 3C Learning & Progress Suite** | 36 | **PASS (100%)** |
| **Phase 3B Integration Suite** | 44 | **PASS (100%)** |
| **Phase 3B Engine Suite** | 26 | **PASS (100%)** |
| **Phase 2 Security & Hardening Suite** | 14 | **PASS (100%)** |
| **Next.js Production Build** | 56 routes | **PASS (0 errors)** |

---

## 7. Remaining Defects & Final Recommendation

- **Remaining Defects:** **0 (Zero)**. All reported vulnerabilities, lifecycle gaps, and edge cases are resolved and verified.
- **Production Baseline Backup:** Documented Cloud Storage backup command ready for execution prior to deployment.
- **FINAL VERDICT: GO FOR PRODUCTION RELEASE**

> [!IMPORTANT]
> Live deployment remains on hold in strict compliance with instructions. To initiate live release, execute the commands documented in `TNPSC99_DEPLOYMENT_AND_ROLLBACK_RUNBOOK.md`.
