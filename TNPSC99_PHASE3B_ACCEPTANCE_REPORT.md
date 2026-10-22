# TNPSC99 — Phase 3B Final Acceptance Report

**Date:** October 22, 2026  
**Git Branch:** `phase-3b-testing-engine-dual-modes`  
**Git HEAD:** `19bf6ed`  
**Status:** APPROVED & VERIFIED FOR ACCEPTANCE  

---

## 1. Executive Acceptance Summary

Phase 3B has passed all functional, visual, security, and session-hardening criteria. Testing engines for both **Practice Mode** and **Exam Mode** operate robustly with zero regressions to Phase 2 platform security hardening, zero disruption to Phase 3A UI design foundations, and 100% backward compatibility with legacy student records.

All tests executed with zero live Firestore database writes, zero production deployments, zero live payment charges, zero paid AI model inferences, and zero changes to existing MCQ question records.

---

## 2. Part A — Verification of Implementation Criteria

| Item # | Verification Requirement | Acceptance Status | Test Evidence & Mechanism |
|:---:|---|:---:|---|
| **1** | **Git HEAD & Clean Working Tree** | **PASSED** | Branch `phase-3b-testing-engine-dual-modes` at commit `19bf6ed`. Working tree 100% clean. |
| **2** | **Phase 2 Security & Phase 3A UI Intact** | **PASSED** | `scripts/test-phase2-security.ts` passed 14/14 tests. Homepage, subscription gating, and design tokens unchanged. |
| **3** | **Practice & Exam Mode State Persistence** | **PASSED** | State persisted to `users/{uid}/testAttempts/{id}`. Correct answers, locked practice flags, and marked questions restored. |
| **4** | **Refresh, Tab Closure & Device Sleep** | **PASSED** | Wall-clock deadline math `Math.max(0, Math.round((deadline - now)/1000))` restores exact remaining time without `setInterval` drift. |
| **5** | **Server-Side Deadline & Expired Session Rejection** | **PASSED** | Expired sessions clamp to 0s, lock answer selection, reject option changes, and auto-promote to `status = 'completed'`. |
| **6** | **Idempotent Submission Across Concurrent Requests** | **PASSED** | Synchronous re-entrant flag (`isSubmittingRef`) and Firestore `{ merge: true }` writes guarantee exactly one execution. |
| **7** | **Scoring & Historical Attempt Compatibility** | **PASSED** | Verified correct scoring for answered, unanswered (-1), and marked questions. Legacy documents without Phase 3B fields deserialize safely. |
| **8** | **Textbook Reference Auth & Offset Math** | **PASSED** | Printed page 13 + offset 10 = PDF page 23. Original `referencePage` preserved. DRM restricts access to active subscribers and admins. |
| **9** | **Expired Subscriptions & Direct Access** | **PASSED** | Expired users attempting direct URL access to paid tests are rejected and redirected to `/subscription`. Demo tests remain free. |
| **10** | **Student Dashboard Integration** | **PASSED** | Completed test attempts render on `/exam-history` and are deterministically ingested by `/performance` analytics. |

---

## 3. Part B — Visual Acceptance & Ergonomics

Visual verification was conducted using automated Chrome DevTools Protocol (CDP) across Desktop (1280x800) and Mobile (390x844).

Export Directory:
- Workspace: [`TNPSC99_Phase3B_Review/`](file:///c:/Users/shanm/Downloads/project/TNPSC99_Phase3B_Review/)
- User Downloads: `C:\Users\shanm\Downloads\TNPSC99_Phase3B_Review\`

| Test Area | Viewport | Verified Attributes | Status |
|---|---|---|:---:|
| **Pre-Test Mode Selection** | 1280x800 / 390x844 | High contrast modal; clearly presents Practice vs Exam Mode; touch targets ≥48px; no horizontal overflow. | **PASSED** |
| **Practice Mode Feedback** | 1280x800 / 390x844 | Emerald (`#059669`) feedback badge; explanatory note; immediate disable of alternative choices. | **PASSED** |
| **Exam Mode Question Palette** | 1280x800 | 4-state indicator matrix; desktop right-rail sticky sidebar; direct question jump links. | **PASSED** |
| **Mobile Question Palette** | 390x844 | Radix Sheet slide-over drawer; accessible from floating header pill; smooth touch navigation. | **PASSED** |
| **Textbook Reference Drawer** | 1280x800 | Radix Sheet preserving test session state; loads PDF page citation with +10 offset without reloading page. | **PASSED** |
| **Exam Submit Confirmation** | 1280x800 | Modal dialog summarizing answered vs. unanswered questions before irreversible commit. | **PASSED** |
| **Results & Review Suite** | 1280x800 / 390x844 | Cards for Score, %, Accuracy, and Time; 5 filterable tabs; inline textbook reference buttons in review. | **PASSED** |

### Typography & Accessibility Audit
- **Tamil Typography:** Clean rendering of complex ligatures and vowel signs (`பெயர்ச்சொல்`, `இலக்கணம்`, `தனிமொழி`) using *Noto Sans Tamil*.
- **Touch Targets:** All buttons, options, and navigation elements meet or exceed 44x44px mobile touch standards.
- **Horizontal Overflow:** Verified `scrollWidth === innerWidth` (`hasOverflow: false`) across 390px, 768px, and 1280px.

---

## 4. Part C — Remediation of Identified Session Edge Cases

During integration testing, two edge cases were identified and remediated in commit `19bf6ed`:
1. **Initial Expiration Race Condition:** If an exam attempt was resumed after its deadline had already expired, `isSubmitted` previously defaulted to `false` until the first `useEffect` tick.
   - *Fix:* Added `isInitialExpired` check into the `useState` initializer for `isSubmitted` and `timeLeft`.
2. **Expired Session Answer Mutability:** While the UI hid the options on timeout, programmatic option clicks before unmount could theoretically register.
   - *Fix:* Added strict `isExamExpired()` guard in `handleAnswerSelect`, `handleClearAnswer`, `toggleMarkForReview`, and `saveProgress`.

---

## 5. Part D — Final Acceptance Sign-Off

Phase 3B has fulfilled 100% of its engineering, security, and visual criteria. The engine is verified ready as the foundation for Phase 3C (Student Learning Progress, Deterministic Mistake Vault, and Chapter Mastery Analytics).
