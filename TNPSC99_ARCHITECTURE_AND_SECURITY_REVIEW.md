# TNPSC99 — Deep Architecture & Security Review
**Document ID:** `TNPSC99-SEC-REV-001`  
**Assessment Date:** October 2026  
**Audited Repository:** `c:\Users\shanm\Downloads\project`  
**Severity Classification:** CRITICAL | HIGH | MEDIUM | LOW

---

## 1. Executive Summary

A comprehensive architectural and security review was conducted on the TNPSC99 application repository. While the foundational framework (Next.js 14 App Router, Tailwind CSS, Firebase Client/Admin SDKs) is well structured, **five critical security and architectural flaws** exist that prevent safe commercial operation:

1. **Privilege Escalation:** Students can grant themselves Admin rights and lifetime Premium subscriptions via direct Firestore writes.
2. **Storage Vulnerability:** Government textbook PDFs stored in Firebase Storage can be deleted or overwritten by any unauthenticated visitor.
3. **Insecure Payment Verification:** Razorpay verification relies on client-submitted `userId` with no Firebase Auth verification and lacks an idempotent server webhook.
4. **Subscription Bypass:** Logic flaw in test access gating permits new free users unlimited access to all tests.
5. **Unmetered AI Cost Exposure:** Student performance dashboard triggers an unmetered, unauthenticated Google Gemini LLM flow on page load.
6. **Feature Lockout:** The textbook reference viewer is accidentally restricted to Admins, blocking paying students from the core value proposition.

This document details each flaw, the threat model, impact, and exact remediation code.

---

## 2. Vulnerability Catalog

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CRITICAL SECURITY & OPERATIONAL VULNERABILITIES                            │
├────┬─────────────────────────────┬──────────┬────────────────────────────────┤
│ ID │ Vulnerability               │ Severity │ Affected Components            │
├────┼─────────────────────────────┼──────────┼────────────────────────────────┤
│ 01 │ User Privilege Escalation   │ CRITICAL │ firestore.rules                │
│ 02 │ Open Storage Bucket         │ CRITICAL │ storage.rules                  │
│ 03 │ Insecure Payment Verify     │ CRITICAL │ /api/razorpay/verify           │
│ 04 │ Subscription Gating Bypass  │ HIGH     │ src/app/(app)/test/[slug]      │
│ 05 │ Unmetered AI LLM Leak       │ HIGH     │ src/app/(app)/performance      │
│ 06 │ Student Reference Lockout   │ HIGH     │ mcq-test.tsx, pdf-viewer       │
│ 07 │ Question Answer Key Leak    │ MEDIUM   │ firestore.rules                │
└────┴─────────────────────────────┴──────────┴────────────────────────────────┘
```

---

## 3. In-Depth Technical Analysis & Remediations

### 3.1 Vulnerability 01: User Privilege Escalation in Firestore Rules
- **Location:** `src/firebase/firestore.rules` (Lines 8–18)
- **Severity:** **CRITICAL**
- **Existing Vulnerable Code:**
  ```javascript
  match /users/{userId} {
    allow read, write: if isOwner(userId) || isAdmin();
  }
  
  function isAdmin() {
    return isSignedIn() && (
      request.auth.token.email.matches('.*@tnpsc99\\.com$') ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true
    );
  }
  ```
- **Exploit Scenario:**
  Any authenticated student can open their browser developer console or use Postman/cURL with their Firebase token to issue a write:
  ```javascript
  import { doc, updateDoc } from 'firebase/firestore';
  await updateDoc(doc(db, 'users', auth.currentUser.uid), {
    isAdmin: true,
    role: 'admin',
    subscriptionStatus: 'premium',
    subscriptionExpires: new Date('2099-01-01')
  });
  ```
  The rule `allow write: if isOwner(userId)` evaluates to `true` because the student owns the document. The student immediately gains permanent admin access, question upload capabilities, and lifetime premium status.
  
  Additionally, the email pattern `.*@tnpsc99\.com$` allows anyone who registers an email under that domain to become an administrator, even if the domain is not protected or properly verified.

- **Remediation:**
  Split user document permissions into `create`, `update`, and `delete`. Restrict `update` so that students can **only** edit safe profile fields (`displayName`, `phoneNumber`, `photoURL`, `updatedAt`), strictly forbidding modification of `isAdmin`, `role`, `subscriptionStatus`, or `subscriptionExpires`. Only backend Cloud Functions or Admin SDK (via Firebase Admin) may update privileged fields.

  ```javascript
  match /users/{userId} {
    allow read: if isOwner(userId) || isAdmin();
    allow create: if isOwner(userId)
                  && request.resource.data.role == 'student'
                  && request.resource.data.subscriptionStatus == 'free'
                  && request.resource.data.isAdmin == false;
    allow update: if (isOwner(userId) 
                      && !request.resource.data.diff(resource.data).affectedKeys()
                          .hasAny(['role', 'isAdmin', 'subscriptionStatus', 'subscriptionExpires', 'email']))
                  || isAdmin();
    allow delete: if isAdmin();
  }
  ```

---

### 3.2 Vulnerability 02: Open Firebase Storage Bucket
- **Location:** `storage.rules` (Lines 1–6)
- **Severity:** **CRITICAL**
- **Existing Vulnerable Code:**
  ```javascript
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /{allPaths=**} {
        allow read, write: if true;
      }
    }
  }
  ```
- **Exploit Scenario:**
  Any unauthenticated person on the internet can make a simple HTTP PUT or DELETE request to the Firebase Storage bucket endpoint. An attacker could delete all textbook PDFs or replace legitimate Tamil textbooks with malicious files or altered content.

- **Remediation:**
  Enforce strict read-only access for authenticated users to textbook PDFs, and restrict upload/delete permissions strictly to verified Admins:
  ```javascript
  rules_version = '2';
  service firebase.storage {
    match /b/{bucket}/o {
      match /textbooks/{allPaths=**} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && 
          firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      }
      match /users/{userId}/{allPaths=**} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```

---

### 3.3 Vulnerability 03: Insecure Payment Verification Architecture
- **Location:** `src/app/api/razorpay/verify/route.ts` & `src/app/api/razorpay/order/route.ts`
- **Severity:** **CRITICAL**
- **Existing Vulnerabilities:**
  1. **Unauthenticated Caller & Client-Supplied `userId`:**
     In `/api/razorpay/verify/route.ts`:
     ```typescript
     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = await req.json();
     ```
     The endpoint accepts `userId` directly from the request body without verifying the caller's Firebase Auth JWT. Any user could provide someone else's `userId` or their own.
  2. **Lack of Idempotency & Replay Vulnerability:**
     The endpoint does not check if `razorpay_payment_id` has already been processed. A user or script could replay the same verification request multiple times, extending the subscription by $+30$ days on each call.
  3. **No Webhook Support:**
     If a student completes payment on the Razorpay gateway but closes the browser before the client script posts to `/api/razorpay/verify`, the payment is captured by Razorpay, but the student's Firestore subscription is never activated.

- **Remediation:**
  1. Authenticate the caller using Firebase Admin `auth().verifyIdToken(token)` extracted from the `Authorization: Bearer <token>` header.
  2. Store payment records in a `/payments/{paymentId}` collection in Firestore. Check for existence before extending subscription (idempotent write).
  3. Implement a server-to-server Razorpay Webhook handler at `/api/razorpay/webhook` that verifies `x-razorpay-signature` against a dedicated webhook secret.

---

### 3.4 Vulnerability 04: Subscription Gating Logic Bypass
- **Location:** `src/app/(app)/test/[slug]/page.tsx` (Lines 74–79)
- **Severity:** **HIGH**
- **Existing Vulnerable Code:**
  ```typescript
  const isPremium = userProfile?.subscriptionStatus === 'premium';
  const hasExpired = userProfile?.subscriptionExpires 
    ? new Date(userProfile.subscriptionExpires.seconds * 1000) < new Date() 
    : false;

  if (!isPremium && hasExpired) {
    router.push('/subscription');
  }
  ```
- **Exploit Scenario:**
  When a new user signs up, `userProfile.subscriptionStatus` is `'free'` and `userProfile.subscriptionExpires` is `null`.
  - `isPremium` = `false`
  - `hasExpired` = `false`
  - Condition `(!isPremium && hasExpired)` evaluates to `(true && false) === false`.
  The redirection is **never triggered**. Free users can take all paid tests indefinitely without ever paying the ₹99 subscription fee!

- **Remediation:**
  Strictly check whether the user has active premium access. Free users should only be permitted to access explicit free trial chapters:
  ```typescript
  const isPremium = userProfile?.subscriptionStatus === 'premium' && 
    userProfile?.subscriptionExpires && 
    new Date(userProfile.subscriptionExpires.seconds * 1000) > new Date();

  const isFreeTest = slug.startsWith('demo-') || slug === 'sample-test';

  if (!isPremium && !isFreeTest) {
    router.push('/subscription');
    return;
  }
  ```

---

### 3.5 Vulnerability 05: Unmetered AI LLM Leak in Performance Dashboard
- **Location:** `src/app/(app)/performance/page.tsx` (Lines 102–120)
- **Severity:** **HIGH**
- **Flaw Description:**
  On component mount, `performance/page.tsx` executes:
  ```typescript
  fetch('/api/genkit/performanceAnalysisFlow', {
    method: 'POST',
    body: JSON.stringify({ tests: testHistory })
  })
  ```
  This invokes Gemini 1.5 Flash via Genkit.
  - There is no rate limit.
  - There is no credit check.
  - Every page refresh triggers a live LLM inference call.
  - In a system with 1,000 active students checking their stats daily, this results in 30,000+ unnecessary LLM calls per month, violating the business rule that the ₹99 MCQ tier must incur $0.00 in AI costs.

- **Remediation:**
  Remove the Genkit flow call from the performance dashboard entirely. Implement a deterministic client/server analytical engine that computes:
  - Subject accuracy %
  - Topic-wise error frequency
  - Standard deviation in time per question
  This delivers instant, zero-cost, accurate analytics without LLM hallucinations or billing exposure.

---

### 3.6 Vulnerability 06: Student Reference Lockout
- **Location:** `src/components/mcq-test.tsx` (Line 679) and `src/app/(app)/pdf-viewer/page.tsx` (Lines 28–31)
- **Severity:** **HIGH**
- **Flaw Description:**
  1. In `src/components/mcq-test.tsx`:
     ```tsx
     {userProfile?.isAdmin && currentQ.referencePage && (
       <Button onClick={handleOpenReference}>
         புத்தகத்தைப் பார்க்க
       </Button>
     )}
     ```
     The button is wrapped in `userProfile?.isAdmin`. Subscribed students cannot see or click the button.
  2. In `src/app/(app)/pdf-viewer/page.tsx`:
     ```tsx
     useEffect(() => {
       if (!userProfile?.isAdmin) {
         router.push('/dashboard');
       }
     }, [userProfile]);
     ```
     Non-admins are booted out of the PDF viewer to the dashboard.

- **Remediation:**
  Change authorization check from `isAdmin` to `isPremium || isAdmin`. Paying students must have full access to textbook reference citations.

---

### 3.7 Vulnerability 07: Question Answer Key & Explanation Leak
- **Location:** `src/firebase/firestore.rules` (Lines 20–23)
- **Severity:** **MEDIUM**
- **Flaw Description:**
  ```javascript
  match /questions/{questionId} {
    allow read: if true;
    allow write: if isAdmin();
  }
  ```
  Anyone can scrape the entire question bank, including `correctAnswer` and `explanation`, directly from the client without taking tests.

- **Remediation:**
  In production, questions served for "Exam Mode" should be fetched via a Next.js API route that sanitizes out `correctAnswer` and `explanation` until test submission, or at minimum require `isSignedIn() && isSubscribed()` in Firestore rules.
