# TNPSC99 — Vision Module Completion Matrix
**Document ID:** `TNPSC99-MATRIX-MOD-001`  
**Assessment Date:** October 2026  
**Audited Repository:** `c:\Users\shanm\Downloads\project`  
**Classification Standard:** COMPLETE | PARTIAL | MISSING | BLOCKED

---

## 1. Summary Matrix Overview

| Module # | Vision Module Name | Status | Primary Source Paths | Core Blockers / Gaps |
| :---: | :--- | :---: | :--- | :--- |
| **01** | Student Registration & Login | **COMPLETE** | `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `src/context/auth-context.tsx` | Production ready. Email/password & Google Auth operational. |
| **02** | Student Profiles | **PARTIAL** | `src/app/(app)/profile/page.tsx`, `src/context/auth-context.tsx` | Basic profile exists; target exam, district, education, language preference missing. |
| **03** | ₹99 Monthly MCQ Subscription UI | **PARTIAL** | `src/app/(app)/subscription/page.tsx`, `src/lib/subscription-utils.ts` | ₹99 UI & benefits displayed, but client gating has edge-case loopholes. |
| **04** | Payment Processing & Renewal | **PARTIAL** | `src/app/api/razorpay/order/route.ts`, `verify/route.ts` | Razorpay works, but lacks webhooks, token verification, and replay protection. |
| **05** | Practice Mode | **PARTIAL** | `src/components/mcq-test.tsx`, `src/app/(app)/test/[slug]/page.tsx` | Instant feedback & answer reveal works; lacks explicit toggle between practice & exam. |
| **06** | Exam Mode (Timer & Results) | **PARTIAL** | `src/components/mcq-test.tsx` | Countdown timer and score summary exist; lacks simulated negative marking & review state. |
| **07** | Explanations & Textbook PDF References | **BLOCKED** | `src/components/mcq-test.tsx`, `src/app/(app)/pdf-viewer/page.tsx` | **Admin-gated!** Button hidden behind `isAdmin`; students cannot open textbook references. |
| **08** | Student Performance Dashboard | **PARTIAL** | `src/app/(app)/performance/page.tsx` | Tests & accuracy chart rendered; unmetered Genkit AI call triggered on load. |
| **09** | Subject-wise & Chapter-wise Progress | **PARTIAL** | `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/performance/page.tsx` | Shows overall stats; detailed syllabus hierarchy tree and completion % missing. |
| **10** | Weak-Area Identification | **MISSING** | `src/app/(app)/performance/page.tsx` | Relies on speculative Genkit AI flow; no deterministic rule-based weak topic engine. |
| **11** | Revision & Mock Tests | **MISSING** | `src/app/(app)/mock-test/` (Not implemented) | No targeted revision queue for incorrectly answered questions or full mock tests. |
| **12** | Separate AI Tutor | **MISSING** | `src/app/(app)/ask-your-doubt/page.tsx` | Placeholder page stating "This page is under construction". No backend flow. |
| **13** | AI Credit Wallet & Accounting | **MISSING** | N/A | No wallet schema, recharge mechanism, transaction ledger, or token deduction. |
| **14** | Administrator Dashboard | **PARTIAL** | `src/app/(admin)/admin/page.tsx`, `src/app/(admin)/admin/users/page.tsx` | User management & stats present; lacks financial reporting & audit logging. |
| **15** | MCQ JSON Upload & Management | **COMPLETE** | `src/app/(admin)/admin/upload/page.tsx`, `questions/page.tsx` | Bulk JSON validation, upload, question browsing, and editing fully operational. |
| **16** | Subscription Administration | **PARTIAL** | `src/app/(admin)/admin/users/page.tsx` | Manual toggle of premium status works; lacks expiration extension or refund logging. |
| **17** | Security, Authorization & Firebase Rules | **BLOCKED** | `src/firebase/firestore.rules`, `storage.rules` | **Critical Security Holes:** User document self-escalation, open Storage write. |
| **18** | Responsive Mobile Experience | **PARTIAL** | `src/components/mcq-test.tsx`, `src/components/ui/` | Tailwind layout responsive, but split PDF viewer/MCQ layout breaks on small screens. |
| **19** | Analytics & Operational Monitoring | **MISSING** | N/A | No Sentry/logging, error tracking, API performance monitoring, or drop-off metrics. |

---

## 2. Detailed Module Assessment

### Module 01: Student Registration and Login
- **Classification:** **COMPLETE**
- **File Locations:**
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/signup/page.tsx`
  - `src/context/auth-context.tsx`
- **Existing Behavior:**
  - Full email/password sign-in and sign-up with Firebase Auth.
  - Google Sign-In popup integration.
  - Automatically initializes `/users/{uid}` on signup with default role `'student'` and `'free'` status.
  - Error state handling and toast notifications.
- **Missing Functionality:** Password reset email flow (`sendPasswordResetEmail`).
- **Dependencies:** Firebase Auth client SDK.
- **Required Tests:** Auth state persistence across page refreshes; duplicate email signup rejection.

---

### Module 02: Student Profiles
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(app)/profile/page.tsx`
  - `src/context/auth-context.tsx`
- **Existing Behavior:**
  - Displays user name, email, subscription status, and phone number.
  - Allows editing display name and phone number.
- **Missing Functionality:**
  - TNPSC-specific profile fields: Target Group (Group 1, Group 2/2A, Group 4, VAO), Medium of Instruction (Tamil / English), District, Educational Qualification.
  - Avatar / profile image upload.
- **Dependencies:** User document in Firestore.
- **Required Tests:** Validation of phone number format; preventing students from modifying `role` or `subscriptionStatus` via profile form.

---

### Module 03: ₹99 Monthly MCQ Subscription
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(app)/subscription/page.tsx`
  - `src/lib/subscription-utils.ts`
  - `src/app/(app)/test/[slug]/page.tsx`
- **Existing Behavior:**
  - Clear presentation of ₹99/month pricing with feature list (Unlimited questions, textbook references, detailed explanations).
  - Razorpay checkout integration with live payment modal.
- **Missing Functionality / Defects:**
  - In `test/[slug]/page.tsx`, logic `if (!isPremium && hasExpired)` has a logic bug: for new free users, `subscriptionExpires` is `null`, resulting in `hasExpired = false`. New users can take all paid tests without paying!
  - No clear notification or warning when subscription is expiring in $\le 3$ days.
- **Dependencies:** Razorpay Client script, Firestore `users/{uid}`.
- **Required Tests:** Verification that expired users and new unpaying users are strictly redirected to `/subscription`.

---

### Module 04: Payment Processing and Subscription Renewal
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/api/razorpay/order/route.ts`
  - `src/app/api/razorpay/verify/route.ts`
- **Existing Behavior:**
  - Server-side Razorpay order generation using `razorpay.orders.create`.
  - Cryptographic signature verification using `crypto.createHmac('sha256', secret)`.
  - Firebase Admin SDK updates `subscriptionStatus: 'premium'` and sets `subscriptionExpires` to $+30$ days.
- **Missing Functionality / Security Flaws:**
  - `/api/razorpay/verify` relies on client-provided `userId` without validating `request.headers.authorization` Bearer token.
  - Lacks Razorpay Webhook endpoint (`/api/razorpay/webhook`) to handle asynchronous payment success or dropped client connections.
  - No transaction record (`/payments/{paymentId}`) stored in Firestore for idempotency and audit trails. Replaying the verify call extends the subscription repeatedly.
- **Dependencies:** Razorpay API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`), Firebase Admin SDK.
- **Required Tests:** Webhook signature verification, replay attack prevention, idempotent transaction handling.

---

### Module 05: Practice Mode
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/components/mcq-test.tsx`
  - `src/app/(app)/test/[slug]/page.tsx`
- **Existing Behavior:**
  - Question rendering with 4 options.
  - Instant visual feedback on selection: Green highlight for correct, Red for incorrect.
  - Shows textbook explanation directly upon selection.
- **Missing Functionality:**
  - No dedicated mode toggle between "Practice Mode" (immediate feedback + explanation) and "Exam Mode" (timed, no instant feedback, batch submission).
  - No option to retry missed questions immediately.
- **Dependencies:** `questions` collection in Firestore.
- **Required Tests:** Instant feedback accuracy; correct score tracking on first-attempt basis.

---

### Module 06: Exam Mode with Timer and Results
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/components/mcq-test.tsx`
- **Existing Behavior:**
  - Real-time countdown timer running in UI.
  - Auto-submission when timer reaches 0.
  - Final results card showing: Total Questions, Correct Answers, Wrong Answers, Percentage Score, and Time Elapsed.
- **Missing Functionality:**
  - TNPSC exam simulation mode (e.g., 200 questions, 180 minutes, OMR-style review grid).
  - Ability to mark questions for review ("Mark for Review").
  - Detailed post-exam review screen comparing user answer vs correct answer for all questions in one scrollable view.
- **Dependencies:** Timer hook, `tests` collection save handler.
- **Required Tests:** Auto-submit on timer expiry; state preservation if browser tab is accidentally refreshed.

---

### Module 07: Explanations and Textbook PDF References
- **Classification:** **BLOCKED**
- **File Locations:**
  - `src/components/mcq-test.tsx` (Lines 679–693)
  - `src/app/(app)/pdf-viewer/page.tsx` (Lines 28–31)
- **Existing Behavior:**
  - Question documents contain `explanation`, `referencePage`, `referencePageOffset`, and `pdfUrl`.
  - PDF viewer page embeds PDF with `#page=${targetPage}`.
- **Why It Is BLOCKED:**
  - **Hardcoded Admin Check:** In `mcq-test.tsx:679`, the "புத்தகத்தைப் பார்க்க" (View Reference PDF) button is wrapped in `{userProfile?.isAdmin && (...)}`.
  - **Redirect in PDF Viewer:** In `pdf-viewer/page.tsx:28`, any non-admin user navigating to the viewer is redirected immediately to `/dashboard`.
  - **Impact:** Subscribed students are **100% blocked** from using the core differentiator of the platform!
- **Dependencies:** Firebase Storage textbook PDFs, verified page offset mapping.
- **Required Tests:** Subscribed students can click reference button and directly open the exact textbook page in a modal or split pane without admin rights.

---

### Module 08: Student Performance Dashboard
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(app)/performance/page.tsx`
- **Existing Behavior:**
  - Fetches past test results from `/tests` filtered by `userId`.
  - Computes and displays overall tests taken, average score percentage, and total practice time.
  - Bar/Line charts rendering accuracy over time.
- **Critical Flaw:**
  - Calls `/api/genkit/performanceAnalysisFlow` on every page load, invoking Gemini 1.5 Flash without user request or credit check, incurring unmetered LLM API costs.
- **Missing Functionality:**
  - Zero-cost deterministic analytics engine to replace the Genkit call.
- **Dependencies:** Firestore `tests` collection.
- **Required Tests:** Dashboard renders cleanly with 0 test records (cold start) and with 100+ test records without invoking external AI APIs.

---

### Module 09: Subject-wise and Chapter-wise Progress
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(app)/dashboard/page.tsx`
  - `src/app/(app)/performance/page.tsx`
- **Existing Behavior:**
  - Tests group scores by subject string (e.g., "Tamil", "General Studies").
- **Missing Functionality:**
  - Standardized TNPSC syllabus hierarchy (Subject $\rightarrow$ Standard/Class $\rightarrow$ Term $\rightarrow$ Chapter/இயல்).
  - Visual completion tracker (e.g., "Class 10 Tamil: 12/24 chapters completed").
  - Mastery status badges (Needs Revision, Proficient, Mastered).
- **Dependencies:** Question metadata taxonomy.
- **Required Tests:** Hierarchical aggregation queries by `subject`, `class`, and `lesson`.

---

### Module 10: Weak-Area Identification
- **Classification:** **MISSING**
- **File Locations:**
  - `src/app/(app)/performance/page.tsx` (Stubbed to AI)
- **Existing Behavior:**
  - Relies solely on Genkit LLM to guess weak areas from prompt text.
- **Missing Functionality:**
  - Deterministic analytics calculating error rate per topic:
    $$\text{Error Rate} = \frac{\text{Incorrect Attempts}}{\text{Total Attempts}} \times 100\%$$
  - Flagging any topic with $> 35\%$ error rate as a "Weak Area".
  - One-click action button: "Practice Weak Areas Now".
- **Dependencies:** Question metadata taxonomy and test attempt history.
- **Required Tests:** Algorithmic ranking of weak areas from test history with 0 LLM calls.

---

### Module 11: Revision and Mock Tests
- **Classification:** **MISSING**
- **File Locations:**
  - `src/app/(app)/mock-test/` (Does not exist or empty)
- **Existing Behavior:**
  - Only individual chapter tests exist (`/test/[slug]`).
- **Missing Functionality:**
  - "Mistake Vault" / Revision Queue: Automatically aggregates questions previously answered incorrectly by the student.
  - Full-length Mock Tests: 100-question or 200-question full-length TNPSC simulation tests combining General Tamil and General Studies.
  - State preservation across long mock tests.
- **Dependencies:** Student attempt logs, composite question query.
- **Required Tests:** Generating revision sets excluding correctly answered questions.

---

### Module 12: Separate AI Tutor ("Ask Your Doubt")
- **Classification:** **MISSING**
- **File Locations:**
  - `src/app/(app)/ask-your-doubt/page.tsx`
- **Existing Behavior:**
  - Displays placeholder banner: "This page is under construction".
- **Missing Functionality:**
  - Conversational question-answering UI.
  - RAG grounding restricted strictly to TNPSC Samacheer Kalvi textbooks to prevent hallucinations.
  - Guardrail preventing student from asking off-topic questions.
  - Clear separation from the base ₹99 subscription.
- **Dependencies:** Genkit RAG flow, AI credit wallet balance.
- **Required Tests:** Query rejection when credit balance is 0; accurate textbook citation in answer.

---

### Module 13: AI Credit Wallet, Recharge and Usage Accounting
- **Classification:** **MISSING**
- **File Locations:**
  - N/A (No implementation in codebase)
- **Existing Behavior:** None.
- **Missing Functionality:**
  - Wallet balance field in user profile (`aiCredits: number`).
  - Transaction history subcollection (`/users/{uid}/credit_transactions`).
  - Recharge microtransactions (e.g., ₹20 for 50 AI queries).
  - Atomic Firestore transaction decrementing credits upon AI query completion.
- **Dependencies:** Razorpay micro-order route, Firestore atomic transactions.
- **Required Tests:** Atomic credit decrement; prevention of negative credit balance under concurrent queries.

---

### Module 14: Administrator Dashboard
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(admin)/admin/page.tsx`
  - `src/app/(admin)/admin/layout.tsx`
- **Existing Behavior:**
  - High-level metric cards: Total Users, Total Questions, Active Subscriptions.
  - Navigation sidebar linking to Upload, Questions, and Users.
- **Missing Functionality:**
  - Revenue analytics (Total revenue, MRR, churn rate).
  - System health indicators (Storage quota, error logs).
  - Audit trail of admin actions.
- **Dependencies:** Admin role check in layout and context.
- **Required Tests:** Non-admin redirection to `/dashboard`.

---

### Module 15: MCQ JSON Upload and Management
- **Classification:** **COMPLETE**
- **File Locations:**
  - `src/app/(admin)/admin/upload/page.tsx`
  - `src/app/(admin)/admin/questions/page.tsx`
- **Existing Behavior:**
  - Drag-and-drop or file selector for JSON MCQ files.
  - Schema validation for required fields (`id`, `questionText`, `options`, `correctAnswer`, `referencePage`, etc.).
  - Batch Firestore write with chunking (batches of $\le 450$ documents).
  - Searchable question list with pagination, subject filters, and inline editing.
- **Missing Functionality:** Bulk deletion by lesson/subject.
- **Dependencies:** Firestore Admin/Client SDK.
- **Required Tests:** Validation error handling for malformed JSON or missing options array.

---

### Module 16: Subscription Administration
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/app/(admin)/admin/users/page.tsx`
- **Existing Behavior:**
  - Table of all registered users with email, name, role, and subscription status.
  - Admin button to manually toggle subscription between `'free'` and `'premium'`.
- **Missing Functionality:**
  - Ability to specify custom subscription expiry dates (e.g., grant $+7$ days for support resolution).
  - Payment transaction ID lookup and refund status sync.
- **Dependencies:** Admin permissions on `/users` collection.
- **Required Tests:** Admin updates reflect instantly on student session context.

---

### Module 17: Security, Authorization and Firebase Rules
- **Classification:** **BLOCKED**
- **File Locations:**
  - `src/firebase/firestore.rules`
  - `storage.rules`
- **Existing Behavior:**
  - Basic rule file structure exists.
- **Why It Is BLOCKED:**
  - Critical privilege escalation vulnerability in Firestore rules:
    ```javascript
    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
    ```
    Students can write `isAdmin: true` or extend `subscriptionExpires` arbitrarily.
  - Textbook PDFs in Storage are completely unprotected:
    ```javascript
    match /{allPaths=**} {
      allow read, write: if true;
    }
    ```
- **Dependencies:** Firebase Security Rules compiler and Admin custom claims.
- **Required Tests:** Security rules unit tests using `@firebase/rules-unit-testing`.

---

### Module 18: Responsive Mobile Experience
- **Classification:** **PARTIAL**
- **File Locations:**
  - `src/components/mcq-test.tsx`
  - `src/app/(app)/dashboard/page.tsx`
- **Existing Behavior:**
  - Dashboard and landing pages are fully responsive on mobile devices using Tailwind breakpoints (`sm:`, `md:`, `lg:`).
  - Mobile bottom navigation and collapsible sidebars.
- **Missing Functionality / Defects:**
  - In `mcq-test.tsx`, opening the textbook PDF viewer on mobile screens obstructs the question interface, making it difficult to answer while viewing the reference. Needs a responsive bottom sheet or collapsible drawer.
- **Dependencies:** Tailwind CSS, Radix UI Sheet component.
- **Required Tests:** Viewport testing on $360\text{px}$ to $414\text{px}$ mobile screens.

---

### Module 19: Analytics and Operational Monitoring
- **Classification:** **MISSING**
- **File Locations:**
  - N/A
- **Existing Behavior:** None.
- **Missing Functionality:**
  - Application error tracking (Sentry or Firebase Crashlytics).
  - User journey event tracking (Sign-up, checkout initiated, checkout completed, test started, test completed).
  - Real-time alert notifications for payment webhook failures.
- **Dependencies:** Logging SDK / Analytics SDK.
- **Required Tests:** Verifying zero performance degradation when analytics tracking is enabled.
