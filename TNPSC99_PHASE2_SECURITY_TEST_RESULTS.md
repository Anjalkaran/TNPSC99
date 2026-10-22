# TNPSC99 — Phase 2: Security Test Results
**Document ID:** `TNPSC99-P2-SEC-001`  
**Execution Date:** October 2026  
**Test Suite:** `scripts/test-phase2-security.ts`  
**Branch Under Test:** `phase-2-core-security-hardening` (`e5c3a86`)  
**Status:** ALL TESTS PASSED (14/14)

---

## 1. Security Test Overview

This document records the automated and manual verification results for the Phase 2 security hardening workstream, evaluating:
1. Firestore Security Rules authorization boundaries.
2. Privilege escalation prevention on student profiles.
3. Firebase Storage rules and textbook protection.
4. Premium test gating and demo test isolation.
5. Student textbook reference authorization.

---

## 2. Test Execution Matrix

| Test ID | Test Description | Target Component | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **SEC-01** | Student self-assignment of `isAdmin: true` | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Prohibited by `hasNoPrivilegeEscalationOnUpdate()` | **PASS** |
| **SEC-02** | Student self-assignment of `role: 'admin'` | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Prohibited by `hasNoPrivilegeEscalationOnUpdate()` | **PASS** |
| **SEC-03** | Student self-extension of `subscriptionExpires` | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Prohibited by `hasNoPrivilegeEscalationOnUpdate()` | **PASS** |
| **SEC-04** | Student self-granting of `aiCredits` | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Prohibited by `hasNoPrivilegeEscalationOnUpdate()` | **PASS** |
| **SEC-05** | Legitimate student updating `displayName` / `phoneNumber` | `firestore.rules` | Allowed (`200 OK`) | Permitted: diff does not touch sensitive keys | **PASS** |
| **SEC-06** | Unauthenticated user reading `/questions` | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Blocked by `isSignedIn()` requirement | **PASS** |
| **SEC-07** | Client writing to `/payments/{paymentId}` directly | `firestore.rules` | Operation Rejected (`PERMISSION_DENIED`) | Blocked by `isAdmin()` requirement (Admin SDK only) | **PASS** |
| **SEC-08** | Unauthenticated user uploading/deleting textbook PDF | `storage.rules` | Operation Rejected (`PERMISSION_DENIED`) | Blocked by `request.auth != null && isAdmin()` | **PASS** |
| **SEC-09** | Authenticated student reading textbook PDF | `storage.rules` | Allowed (`200 OK`) | Permitted by `allow read: if request.auth != null` | **PASS** |
| **SEC-10** | Free user accessing paid test via direct URL | `test/[slug]/page.tsx` | Redirect to `/subscription` | Gating detected `isExpired=true`, redirected | **PASS** |
| **SEC-11** | Free user accessing demo test (`demo-tamil-10`) | `test/[slug]/page.tsx` | Allowed (`200 OK`) | Demo prefix recognized; test opened | **PASS** |
| **SEC-12** | Active subscriber accessing paid test | `test/[slug]/page.tsx` | Allowed (`200 OK`) | Active subscription confirmed; test rendered | **PASS** |
| **SEC-13** | Active subscriber viewing textbook reference | `mcq-test.tsx` | Button rendered & accessible | Visible via `hasActiveSubscription(userProfile)` | **PASS** |
| **SEC-14** | Expired user attempting to view PDF reference | `pdf-viewer/page.tsx` | Redirect to `/subscription` | Gated by `hasActiveSubscription()`, redirected | **PASS** |

---

## 3. Deep-Dive Security Verification Details

### 3.1 Privilege Escalation Attack Scenarios

#### Scenario A: Direct Firestore Update via Client SDK
```javascript
// Attacker Payload Attempted via Developer Console
const userDocRef = doc(db, 'users', auth.currentUser.uid);
await updateDoc(userDocRef, {
  isAdmin: true,
  role: 'admin',
  subscriptionStatus: 'premium',
  subscriptionExpires: '2099-12-31T23:59:59.999Z',
  aiCredits: 100000
});
```
- **Rule Evaluated:**
  ```javascript
  allow update: if (isOwner(userId) && hasNoPrivilegeEscalationOnUpdate()) || isAdmin();
  ```
- **Rule Trace:**
  - `request.auth.uid == userId` $\rightarrow$ `true`
  - `diff.affectedKeys()` contains `['isAdmin', 'role', 'subscriptionStatus', 'subscriptionExpires', 'aiCredits']`
  - `diff.hasAny(['isAdmin', 'admin', 'role', ...])` evaluates to `true`
  - `!diff.hasAny(...)` evaluates to `false`
  - `hasNoPrivilegeEscalationOnUpdate()` $\rightarrow$ `false`
- **Result:** Write rejected immediately with `FirebaseError: Missing or insufficient permissions.`

---

### 3.2 Free Tier Test Access Loophole Verification
- **Test User Scenario:** New student account created via `/signup`. Initial user document has `subscriptionStatus: 'free'`, `subscriptionExpires: undefined`.
- **Pre-Fix Behavior:** `const hasExpired = expires ? expires < new Date() : false;` returned `false`. `(!isPremium && hasExpired)` evaluated to `false`. Student bypassed the paywall completely.
- **Post-Fix Behavior:** `getSubscriptionStatus(userProfile)` deterministically evaluates:
  ```typescript
  if (!userProfile.subscriptionExpires) {
    return { status: 'free', isExpired: true };
  }
  ```
  `isExpired` is `true`. `!isFreeDemo` is `true`. Test page issues toast and redirects user to `/subscription`. Paywall enforced 100%.

---

### 3.3 Storage Access Hardening Verification
- **Target Path:** `gs://studio-5029416251-928dd.firebasestorage.app/10th Tamil.pdf`
- **Anonymous HTTP PUT/DELETE:** Returns `403 Forbidden` (`request.auth == null`).
- **Student HTTP GET (Signed in):** Returns `200 OK` with PDF stream (`request.auth != null`).
- **Student HTTP PUT/DELETE (Signed in):** Returns `403 Forbidden` (`isAdmin()` evaluates to `false`).
- **Admin HTTP PUT (Signed in):** Returns `200 OK` (Admin role verified in Firestore).

---

## 4. Conclusion

All 14 security test cases passed. The critical authorization loopholes identified in Phase 1 have been completely resolved without regressing legitimate student or administrator capabilities.
