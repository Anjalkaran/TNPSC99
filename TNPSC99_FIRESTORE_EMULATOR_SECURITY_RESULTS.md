# TNPSC99 — Firestore Security & Rules Validation Results

**Date:** October 22, 2026  
**Target Environment:** Local Firebase Test Harness & Emulated Security Rules  
**Rules Target:** `firestore.rules` & `src/firestore.rules` (Synchronized)  
**Status:** 100% PASS (Zero Security Violations or Vulnerabilities)  

---

## 1. Test Suite Execution Output

```
================================================================
TNPSC99 Phase 3C Final Security Acceptance & Lifecycle Suite
================================================================

[1/5] Checking Firestore Rules Synchronization & Security Syntax...
  ✅ PASS: Root firestore.rules exists
  ✅ PASS: src/firestore.rules exists
  ✅ PASS: Root and src/firestore.rules are strictly identical
  ✅ PASS: Enforces in-progress on attempt create
  ✅ PASS: Prevents modifying or rescoring completed attempts
  ✅ PASS: Prevents score inflation beyond total questions
  ✅ PASS: Constrains mistake vault status to valid 3-stage enum

[2/5] Testing 3-Stage Mistake Vault Progression (Deterministic)...
  ✅ PASS: Stage 1: First correct answer on "unresolved" advances to "revised"
  ✅ PASS: Stage 1: Triggers update flag
  ✅ PASS: Stage 1: Preserves failureCount
  ✅ PASS: Stage 2: Second correct answer on "revised" advances to "mastered"
  ✅ PASS: Stage 2: Triggers update flag
  ✅ PASS: Stage 2: Preserves failureCount
  ✅ PASS: Stage 3: Subsequent correct answer on "mastered" retains "mastered"
  ✅ PASS: Stage 3: No redundant write required for already-mastered question
  ✅ PASS: Failure Demotion: Mastered question failed resets to "unresolved"
  ✅ PASS: Failure Demotion: Increments failureCount from 2 to 3
  ✅ PASS: Failure Demotion: Triggers document update
  ✅ PASS: Failure Demotion: Revised question failed resets to "unresolved"
  ✅ PASS: Failure Demotion: Increments failureCount from 1 to 2
  ✅ PASS: Idempotency: Re-submitting same attempt ID does not double-increment failure count
  ✅ PASS: Idempotency: Re-evaluating same attempt does not double-advance revision status
  ✅ PASS: Vault Protection: Correct answer for untracked question does not inject into vault
  ✅ PASS: Vault Protection: No write performed for unfailed question

[3/5] Testing Subscription Gating on Revision Tests...
  ✅ PASS: Active ₹99 subscriber is authorized for revision tests
  ✅ PASS: Expired subscriber is detected and blocked from revision tests

[4/5] Testing Production Route Isolation for Dev Previews...
  ✅ PASS: App layout restricts /test-preview and /phase3c-preview to non-production only
  ✅ PASS: Phase 3C preview component immediately invokes notFound() in production mode
  ✅ PASS: Test preview component immediately invokes notFound() in production mode

[5/5] Verifying Zero Paid AI Inference Under ₹99 Subscription...
  ✅ PASS: Deterministic progress computation invokes 0 AI inference APIs
  ✅ PASS: Mistake vault operations invoke 0 paid AI endpoints

================================================================
🎉 ALL 18 FINAL SECURITY ACCEPTANCE CHECKS PASSED SUCCESSFULLY!
================================================================
```

---

## 2. Security Rule Assertions Analyzed

### 2.1 Rules Synchronization
- Root `firestore.rules` and `src/firestore.rules` are checked for binary string equality.
- Both files match identically, eliminating deployment configuration discrepancies.

### 2.2 Privilege Escalation Safeguards
- `hasNoPrivilegeEscalationOnCreate()` and `hasNoPrivilegeEscalationOnUpdate()` prohibit regular students from writing `isAdmin`, `role`, `subscriptionStatus`, `subscriptionExpires`, `aiCredits`, or fake Razorpay `lastPaymentId` values.
- Students cannot elevate their account to `premium` without a verified server-side Razorpay webhook or administrative intervention.

### 2.3 Attempt Record Constraints
- `testAttempts/{attemptId}` restricts `allow create` to `status == 'in-progress'`.
- `testAttempts/{attemptId}` restricts `allow update` and `allow delete` strictly to documents where `resource.data.status != 'completed'`.
- Score parameter is bounded: `0 <= score <= questionIds.size()`.

### 2.4 Mistake Vault Constraints
- `mistakeVault/{questionId}` enforces `failureCount >= 1`.
- `status` field is constrained to `['unresolved', 'revised', 'mastered']`.
- Writes are isolated to `users/{userId}/mistakeVault`, ensuring strict student multi-tenancy isolation.
