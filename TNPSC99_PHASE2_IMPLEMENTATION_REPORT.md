# TNPSC99 — Phase 2: Core Platform Security & Hardening Implementation Report
**Document ID:** `TNPSC99-P2-IMPL-001`  
**Execution Date:** October 2026  
**Git Branch:** `phase-2-core-security-hardening`  
**Commit Hash:** `e5c3a861d5c0915d153233adacb3d93a46802769`  
**Status:** Completed & Validated (Pending Deployment Review)

---

## 1. Executive Summary

Phase 2 ("Core Platform Security & Hardening") has been successfully implemented and verified in the dedicated Git branch `phase-2-core-security-hardening`. This work eliminates the critical security vulnerabilities that previously threatened commercial operation, locks down user privilege escalation, secures the ₹99 monthly payment pipeline, unlocks textbook references for paying students, and removes unmetered Google Gemini API costs from student dashboards.

In strict compliance with directives:
- **No production deployments** or live Firestore changes were made.
- **No security rules were published to production**; all tests were verified in isolation.
- **No MCQ corrections or deletions** were executed (remains paused).
- **Approved ₹99 monthly MCQ pricing** is strictly enforced.
- **Zero AI cost policy** is implemented across the core student journey.

---

## 2. Technical Modifications Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2 IMPLEMENTATION SUMMARY                                              │
├──────┬───────────────────────────┬──────────────────────────────────────────┤
│ Step │ Area                      │ Key Changes & Artifacts                  │
├──────┼───────────────────────────┼──────────────────────────────────────────┤
│ 2.1  │ Preflight & Branching     │ Created branch `phase-2-core-security-   │
│      │                           │ hardening`, verified clean working tree. │
│ 2.2  │ Firestore Rules           │ Blocked self-escalation of isAdmin, role,│
│      │                           │ subscription status, expiry & credits.   │
│ 2.3  │ Storage Rules             │ Restricted textbook uploads/deletions to │
│      │                           │ admins; preserved student read access.   │
│ 2.4  │ Razorpay Security         │ Firebase Bearer token verification,      │
│      │                           │ server-side ₹99 pricing, HMAC validation.│
│ 2.5  │ Webhook & Idempotency     │ Created `/api/razorpay/webhook/route.ts` │
│      │                           │ & idempotent `/payments/{paymentId}` log.│
│ 2.6  │ Subscription Gating       │ Fixed loophole in test/[slug]/page.tsx;  │
│      │                           │ expired & new unpaying users blocked.    │
│ 2.7  │ Textbook References       │ Removed `{userProfile?.isAdmin}` gate in │
│      │                           │ mcq-test.tsx & pdf-viewer/page.tsx.      │
│ 2.8  │ Zero-AI Cost Analytics    │ Replaced unmetered Gemini calls with     │
│      │                           │ local mathematical analytics engine.     │
└──────┴───────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Detailed Work Completed by Workstream

### 3.1 Firebase Security Hardening (`firestore.rules` & `storage.rules`)
- **Vulnerability Remediated:** Previously, `/users/{userId}` allowed `write: if isOwner(userId)`, permitting any student to assign themselves `isAdmin: true` or extend `subscriptionExpires`.
- **Hardened Rules Implemented:**
  - `allow create`: Allowed only if caller is not attempting to elevate privileges (`isAdmin == false`, `role in ['student', 'user']`, `subscriptionStatus == 'free'`, `subscriptionExpires == null`, `aiCredits == 0`).
  - `allow update`: Permitted for the profile owner **only** if sensitive keys (`isAdmin`, `role`, `subscriptionStatus`, `subscriptionExpires`, `aiCredits`, `lastPaymentId`, `lastOrderId`) are unmodified. Students can safely edit their `displayName`, `phoneNumber`, `city`, and language preferences.
  - Subcollections: Protected student attempt logs (`/testAttempts`) and bookmarks while securing ledger subcollections.
  - Storage: Closed open `{allPaths=**}` read/write. Added authenticated read-only access for textbook PDFs, reserving upload/delete strictly to verified administrators.

### 3.2 Razorpay Payment Gateway Hardening
- **Files Modified/Created:**
  - [`src/lib/server-payment.ts`](file:///c:/Users/shanm/Downloads/project/src/lib/server-payment.ts) (New shared server payment service)
  - [`src/app/api/razorpay/order/route.ts`](file:///c:/Users/shanm/Downloads/project/src/app/api/razorpay/order/route.ts)
  - [`src/app/api/razorpay/verify/route.ts`](file:///c:/Users/shanm/Downloads/project/src/app/api/razorpay/verify/route.ts)
  - [`src/app/api/razorpay/webhook/route.ts`](file:///c:/Users/shanm/Downloads/project/src/app/api/razorpay/webhook/route.ts) (New server webhook)
  - [`src/app/(app)/subscription/page.tsx`](file:///c:/Users/shanm/Downloads/project/src/app/(app)/subscription/page.tsx)
- **Security Enhancements:**
  - **Firebase ID Token Verification:** API endpoints extract and verify `Authorization: Bearer <token>` using Firebase Admin SDK. Unauthenticated requests are rejected with 401 Unauthorized.
  - **Server-Side Pricing Control:** Order creation hardcodes amount to ₹99 (9900 paise, INR). Client-submitted amounts are disregarded.
  - **HMAC SHA256 Signature Verification:** Constant-time buffer comparison (`crypto.timingSafeEqual`) ensures no tampering or timing attacks.
  - **Idempotent Subscription Activation:** Payments are recorded in Firestore collection `/payments/{paymentId}` with status `'captured'`. If the client or webhook replays an identical payment ID, the server acknowledges it without extending the subscription twice.
  - **Expiration Stacking:** If an active subscriber renews before expiration, the $+30$ days stack on top of `currentExpiry` rather than resetting from `now`.

### 3.3 Premium Test Access & Free Trial Protection
- **Files Modified:**
  - [`src/lib/subscription-utils.ts`](file:///c:/Users/shanm/Downloads/project/src/lib/subscription-utils.ts)
  - [`src/app/(app)/test/[slug]/page.tsx`](file:///c:/Users/shanm/Downloads/project/src/app/(app)/test/[slug]/page.tsx)
- **Remediation:**
  - The previous check `if (!isPremium && hasExpired)` evaluated to `false` for new users where `subscriptionExpires` was `null`.
  - Replaced with `const { isExpired, status } = getSubscriptionStatus(userProfile)`.
  - Unpaid or expired users trying to open a paid test are blocked and redirected to `/subscription` with a notification: `"An active ₹99 monthly subscription is required to access full tests."`.
  - Intended free demo tests (slugs beginning with `demo-`, `sample-`, or `free-`) remain accessible for prospective students.

### 3.4 Unlocking Student Textbook Reference Access
- **Files Modified:**
  - [`src/components/mcq-test.tsx`](file:///c:/Users/shanm/Downloads/project/src/components/mcq-test.tsx)
  - [`src/app/(app)/pdf-viewer/page.tsx`](file:///c:/Users/shanm/Downloads/project/src/app/(app)/pdf-viewer/page.tsx)
- **Remediation:**
  - In `mcq-test.tsx:680`, the "புத்தகத்தைப் பார்க்க" (View Reference PDF) button was locked behind `{userProfile?.isAdmin && ...}`.
  - Updated to `{(userProfile?.isAdmin || hasActiveSubscription(userProfile)) && ...}`.
  - In `pdf-viewer/page.tsx:28`, the admin check that redirected non-admins to `/dashboard` was updated to grant access to any user with an active subscription.
  - Existing `referencePage`, `referenceUrl`, and `referencePageOffset` fields were strictly preserved without modification.

### 3.5 Eliminating Automatic AI LLM Invocations ($0.00 Unit Economics)
- **Files Modified:**
  - [`src/lib/deterministic-analytics.ts`](file:///c:/Users/shanm/Downloads/project/src/lib/deterministic-analytics.ts) (New mathematical calculation engine)
  - [`src/app/(app)/performance/page.tsx`](file:///c:/Users/shanm/Downloads/project/src/app/(app)/performance/page.tsx)
  - [`src/app/(app)/admin/users/[userId]/performance/page.tsx`](file:///c:/Users/shanm/Downloads/project/src/app/(app)/admin/users/[userId]/performance/page.tsx)
- **Remediation:**
  - Removed HTTP fetch to `/api/genkit/performanceAnalysisFlow` that triggered Google Gemini 1.5 Flash on every performance page load.
  - Replaced with client-side deterministic analysis:
    - Strengths: Subjects/units with $\ge 75\%$ proficiency.
    - Weaknesses: Topics with $< 65\%$ proficiency.
    - Actionable recommendations: Targeted revision advice in English and Tamil.
    - Encouraging summary based on attempt volume.
  - The standard ₹99 MCQ tier now operates with **$0.00 / ₹0.00 external AI inference overhead**.

---

## 4. Verification & Validation Summary

| Test Domain | Target | Result | Evidence |
| :--- | :--- | :---: | :--- |
| **Type Integrity** | Modified core files & payment routes | **PASSED** | 0 TypeScript errors across all Phase 2 files. |
| **Production Build** | Next.js 14 App Router production bundle | **PASSED** | `npm run build` exited with code 0 (51 pages generated). |
| **Subscription Tests** | Free, expired, premium, demo test matrix | **PASSED** | All 5 tier gating tests passed. |
| **Payment Security** | Signature check, tampering, replay attack | **PASSED** | All 5 payment validation tests passed. |
| **Deterministic Math** | Performance analysis without LLM | **PASSED** | Accurate bilingual output in 0ms. |
| **Textbook Access** | Student vs expired access permissions | **PASSED** | Subscribed students authorized; expired blocked. |

---

## 5. Next Steps

With Phase 2 core security and hardening completed and validated on branch `phase-2-core-security-hardening`, the codebase is prepared for human deployment review. Proceed to review test results in [TNPSC99_PHASE2_SECURITY_TEST_RESULTS.md](file:///c:/Users/shanm/Downloads/project/TNPSC99_PHASE2_SECURITY_TEST_RESULTS.md) and deployment instructions in [TNPSC99_PHASE2_DEPLOYMENT_AND_ROLLBACK_PLAN.md](file:///c:/Users/shanm/Downloads/project/TNPSC99_PHASE2_DEPLOYMENT_AND_ROLLBACK_PLAN.md).
