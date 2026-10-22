# TNPSC99 — Firebase Emulator Security & Trusted Scoring Results

**Date:** October 22, 2026  
**Environment:** Firebase Local Emulator Suite (Firestore: 127.0.0.1:8080, Auth: 127.0.0.1:9099)  
**Security Target:** `firestore.rules` & `src/firestore.rules` (Strictly Synchronized)  
**Test Suite:** `scripts/test-firestore-rules-emulator.ts`  
**Execution Status:** **100% PASS (All 12 Attack Vectors & Edge Cases Verified)**  

---

## 1. Executive Summary of Implemented Security Controls

Prior to this fix, student clients computed their own final scores and directly updated attempt documents with `status: 'completed'` and `score: N`. Furthermore, a legacy wildcard fallback (`match /{allSubcollections=**}`) unintentionally permitted student clients to bypass specific subcollection restrictions.

This implementation delivers complete end-to-end trusted test finalization:
1. **Server-Authoritative Finalization Endpoint (`/api/test/submit`):**
   - Authenticated via Firebase ID token (`Bearer <token>`).
   - Retrieves authentic questions from trusted Firestore storage.
   - Calculates the score strictly by comparing student answers against authoritative `correctAnswer` values.
   - Client-supplied scores are completely ignored and prohibited.
2. **Wildcard Fallback Removal & Rule Hardening:**
   - Removed `match /{allSubcollections=**}` from Firestore rules.
   - Subcollections under `/users/{userId}` are strictly enumerated (`testAttempts`, `mistakeVault`, `bookmarkedQuestions`, `credit_ledger`).
   - Regular students can ONLY create in-progress attempts with `score == 0`.
   - Regular students are strictly forbidden from setting `status: 'completed'`, writing `score`, modifying `examDeadline`, or writing `completedAt`.
   - Once completed, attempts cannot be updated or deleted by students.
3. **Mistake Vault Mastery Protection:**
   - Mistake Vault writes (`/users/{userId}/mistakeVault/{questionId}`) are restricted to `isAdmin()`.
   - Mastery transitions (`unresolved` $\rightarrow$ `revised` $\rightarrow$ `mastered`) are derived strictly on the server during trusted completed attempts. Direct client manipulation is completely blocked.
4. **Idempotent Atomic Transactions:**
   - Multi-device and concurrent submissions are processed inside a Firestore transaction.
   - If an attempt is already marked `status: 'completed'`, the server returns the existing authentic score idempotently without rescoring or double-incrementing Mistake Vault counters.
5. **Leaderboard Protection:**
   - Public leaderboard `/scores` collection restricted to `allow write: if isAdmin()`. Forged score injection is rejected.

---

## 2. Actual Firebase Emulator Test Logs & Evidence

The following output was captured during automated execution of `scripts/test-firestore-rules-emulator.ts` running inside the real Firebase Emulator Suite (`npx firebase emulators:exec --only firestore,auth`):

```text
i  emulators: Starting emulators: auth, firestore
i  firestore: Firestore Emulator logging to firestore-debug.log
+  firestore: Firestore Emulator UI websocket is running on 9150.
i  Running script: npx tsx scripts/test-firestore-rules-emulator.ts
========================================================================
TNPSC99 — FIREBASE EMULATOR SECURITY RULES & ATTEMPT INTEGRITY SUITE
========================================================================

[1/6] Creating & Authenticating Student Sessions in Auth Emulator...
  ✅ PASS: Authenticated as student_malicious_007

[2/6] Seeding Trusted Questions in Firestore Question Bank...
  ✅ Trusted questions seeded: q_unit1_01, q_unit1_02

[3/6] Executing Adversarial Attack Vectors (Malicious Client Testing)...
  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L67:26 for 'create' @ L67, false for 'create' @ L67
  🛡️ REJECTED (Expected): Malicious client forged completed attempt on create

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L67:26 for 'create' @ L67, false for 'create' @ L67
  🛡️ REJECTED (Expected): Malicious client injected non-zero score on attempt create

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L67:26 for 'create' @ L67, false for 'create' @ L67
  🛡️ REJECTED (Expected): Malicious client injected completedAt timestamp on create

  ✅ Legitimate in-progress attempt successfully created

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L81:26 for 'update' @ L81, false for 'update' @ L81
  🛡️ REJECTED (Expected): Malicious client directly transitioned status to completed via updateDoc

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L81:26 for 'update' @ L81, false for 'update' @ L81
  🛡️ REJECTED (Expected): Malicious client modified authoritative score via updateDoc

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L81:26 for 'update' @ L81, false for 'update' @ L81
  🛡️ REJECTED (Expected): Malicious client extended exam deadline via updateDoc

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L67:26 for 'create' @ L67, false for 'create' @ L67
  🛡️ REJECTED (Expected): Cross-user attack: Student A wrote into Student B testAttempts

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L103:25 for 'create' @ L103, false for 'create' @ L103
  🛡️ REJECTED (Expected): Malicious client forged "mastered" status in Mistake Vault directly

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L176:23 for 'create' @ L176, false for 'create' @ L176
  🛡️ REJECTED (Expected): Malicious client injected forged score into public Leaderboard

[4/6] Testing Server-Authoritative Finalization & Scoring...
  ✅ Student updated answers [0, 0] (Q1: correct, Q2: wrong)
  ✅ PASS: Server calculated exact trusted score: 1 / 2
  ✅ PASS: q_unit1_01 verified as correct
  ✅ PASS: q_unit1_02 verified as wrong
  ✅ PASS: Duplicate submission idempotently recognized without re-scoring
  ✅ PASS: Duplicate submission preserves original authentic score
  ✅ PASS: Attempt status is verified completed
  ✅ PASS: Completed attempt score is strictly 1
  ✅ PASS: Failed question Q2 exists in Mistake Vault
  ✅ PASS: Q2 status is "unresolved"
  ✅ PASS: Q2 failureCount is 1

[5/6] Testing Post-Completion Immutability (Client Lockdown)...
  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L81:26 for 'update' @ L81, false for 'update' @ L81
  🛡️ REJECTED (Expected): Client modified score on a completed attempt

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L81:26 for 'update' @ L81, false for 'update' @ L81
  🛡️ REJECTED (Expected): Client changed answers on a completed attempt

  @firebase/firestore: Firestore: GrpcConnection RPC 'Write' stream error. Code: 7 Message: 7 PERMISSION_DENIED: 
  evaluation error at L96:26 for 'delete' @ L96, false for 'delete' @ L96
  🛡️ REJECTED (Expected): Client deleted a completed attempt

[6/6] Testing 3-Stage Mastery Transitions on Subsequent Revision Attempt...
  ✅ PASS: Pre-condition: Q2 status is unresolved
  ✅ PASS: Stage 1: 1st correct revision moved status to "revised" (NOT "mastered")
  ✅ PASS: Stage 1: failureCount preserved as 1
  ✅ PASS: Pre-condition: Q2 status is revised
  ✅ PASS: Stage 2: 2nd correct revision moved status to "mastered"
  ✅ PASS: Demotion: Subsequent failure reset status to "unresolved"
  ✅ PASS: Demotion: failureCount incremented from 1 to 2

========================================================================
🎉 ALL EMULATOR RULES & TRUSTED FINALIZATION TESTS PASSED SUCCESSFULLY!
========================================================================
+  Script exited successfully (code 0)
i  emulators: Shutting down emulators.
```

---

## 3. Attack Vector & Mitigation Proof Matrix

| Attack Vector ID | Adversarial Action | Tested Payload | Result in Real Emulator | Security Status |
| :---: | :--- | :--- | :---: | :---: |
| **V-01** | Create attempt with `status: 'completed'` | `{ status: 'completed', score: 100 }` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-02** | Create attempt with non-zero score | `{ status: 'in-progress', score: 50 }` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-03** | Create attempt with client `completedAt` | `{ completedAt: '2026-10-22T...' }` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-04** | Direct transition to completed on update | `updateDoc({ status: 'completed' })` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-05** | Modify score on in-progress attempt | `updateDoc({ score: 10 })` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-06** | Extend exam countdown deadline | `updateDoc({ examDeadline: '2099-...' })`| **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-07** | Cross-student document write | `setDoc(users/victim/testAttempts/...)` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-08** | Fabricate mastery state in Mistake Vault | `setDoc(mistakeVault/q1, { status: 'mastered' })`| **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-09** | Inject forged score to Leaderboard | `addDoc(scores, { score: 9999 })` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-10** | Mutate score on completed attempt | `updateDoc({ score: 2 })` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-11** | Mutate answers on completed attempt | `updateDoc({ answers: [0, 1] })` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |
| **V-12** | Delete completed attempt | `deleteDoc(completedAttemptRef)` | **Code 7: PERMISSION_DENIED** | **BLOCKED** |

---

## 4. Remaining Security Risks & Recommended Operational Measures

1. **Service Account Secret Management (Production Deployment):**
   - While the local emulator functions with standard project IDs, Firebase App Hosting production deployment requires `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` to be configured as App Hosting environment secrets.
2. **Network Clock Skew Tolerance:**
   - The `/api/test/submit` endpoint incorporates a 60-second grace buffer to tolerate mobile student latency on slow 3G/4G connections. Exceeding 60 seconds flags the exam as auto-submitted / time-expired.
