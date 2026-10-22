# TNPSC99 — Phase 3B Security & Session Architecture Review

**Date:** October 22, 2026  
**Git Branch:** `phase-3b-testing-engine-dual-modes`  
**Git Commit:** `19bf6ed`  
**Security Status:** HARDENED & AUDITED  

---

## 1. Executive Security Architecture Summary

Phase 3B testing engine introduces advanced client-side state mechanics while strictly maintaining the server-side authorization boundaries, cryptographic verification, and tamper-resistance established in Phase 2. The dual-mode testing engine strictly isolates practice experimentation from timed exam compliance.

---

## 2. Threat Vector & Countermeasure Matrix

| Threat / Attack Vector | Vulnerability Description | Phase 3B Security Countermeasure | Verification Status |
|---|---|---|:---:|
| **Client Clock Tampering** | Manipulating system clock to extend exam duration. | Strict ISO timestamp comparison against stored `examDeadline`. The remaining time is derived via `(deadlineMs - Date.now())`. Expired timestamps auto-promote to `completed` upon any save. | **HARDENED** |
| **Tab Backgrounding Interval Drift** | Browser throttling `setInterval` during tab switches or device sleep to gain extra exam time. | Bound `visibilitychange` listener recalculates remaining time immediately upon focus; timer math uses absolute epoch time rather than cumulative ticks. | **HARDENED** |
| **Practice Mode Score Padding** | Clicking multiple options on the same question to discover the correct answer and artificially boost score. | State map `practiceAnswered[currentIndex]` immediately locks question upon first selection. Re-scoring attempts are rejected at the handler level. | **HARDENED** |
| **Post-Deadline Answer Modification** | Attempting to submit or modify answers after time expired via developer console or stale tabs. | Guard `isExamExpired()` added to `handleAnswerSelect`, `handleClearAnswer`, and `toggleMarkForReview`. Server save automatically converts expired attempts to `completed`. | **HARDENED** |
| **Duplicate / Concurrent Submissions** | Multiple rapid clicks on "Submit" or multi-device sync corrupting score or double-writing attempts. | Re-entrant lock (`isSubmittingRef.current = true`) executes synchronously before any async operations; Firestore writes use deterministic `doc(collection, attemptId)` with `{ merge: true }`. | **HARDENED** |
| **Unauthorized Textbook Reference Scraping** | Unsubscribed or guest users attempting direct access to PDF textbook citations. | Inline Reference Drawer evaluates user subscription tier using `getSubscriptionStatus(userProfile)`. Access is blocked unless active subscriber or admin; drawer strictly concealed during active Exam Mode. | **HARDENED** |
| **Direct Route Bypass on Paid Tests** | Unauthenticated or expired users navigating directly to `/test/[slug]`. | Access control pre-check in `src/app/(app)/test/[slug]/page.tsx` validates subscription before loading questions. Redirects unauthorized users to `/subscription`. Free demos whitelist `demo-*`, `sample-*`, `free-*`. | **HARDENED** |

---

## 3. Session Persistence & Resumption Architecture

### 3.1 Data Flow Diagram
```
[User Selects Test]
        │
        ▼
[Check Existing In-Progress Attempt in Firestore]
        ├─── None Found ───────► Prompt Mode Selection Dialog (Practice vs Exam)
        │                                 │
        └─── Found Attempt ───────────────► User Chooses: Resume or Start Fresh
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
       [PRACTICE MODE]                                                        [EXAM MODE]
- Self-paced                                                           - Compute absolute deadline
- Lock on click                                                        - Conceal answers & citations
- Immediate feedback                                                   - Enable Question Palette
- Inline Textbook Drawer                                               - Listen to visibilitychange
        │                                                                   │
        └─────────────────────────────────┬─────────────────────────────────┘
                                          ▼
                         [Idempotent Save / Auto-Submit]
                                          │
                                          ▼
              [users/{uid}/testAttempts/{attemptId} (merge: true)]
```

### 3.2 State Preservation Schema
Each test session document contains:
- `testId`: String identifier of curriculum test.
- `mode`: `'practice'` or `'exam'` (safely defaults to `'practice'` for legacy records).
- `answers`: Array of option indices (`-1` indicates unattempted).
- `currentQuestionIndex`: Restores exact question candidate was on.
- `markedForReviewIds`: Array of question IDs flagged for review.
- `examDeadline`: ISO timestamp establishing strict exam expiry.
- `timeSpentSeconds`: Wall-clock active seconds consumed.
- `status`: `'in-progress'` or `'completed'`.

---

## 4. Idempotency & Concurrency Guarantees

1. **Deterministic Attempt ID:** The client generates or binds to an explicit Firestore document ID (`attemptId ? doc(col, attemptId) : doc(col)`). Subsequent updates always target this specific document.
2. **Re-entrant Lock:** `isSubmittingRef` is set synchronously upon initiation of final submission. Concurrent invocation attempts (such as double-clicking "Submit" or triggering auto-submit simultaneously with manual submit) are rejected immediately.
3. **Save-in-Progress Lock:** `isSavingRef` prevents interleaved background writes. If a save is already in-flight, subsequent requests wait or coalesce into the next snapshot.

---

## 5. Phase 2 Continuity & Pricing Integrity

- **Razorpay Integration:** Payment verification endpoints (`/api/razorpay/verify` and `/api/razorpay/webhook`) continue to enforce HMAC-SHA256 signature checks.
- **₹99 Monthly Subscription:** No changes have been made to pricing tokens, database schemas, or billing routes.
- **Deterministic Analytics:** Student performance reporting continues to operate without external LLM API calls, preserving 100% margin and eliminating token costs.
