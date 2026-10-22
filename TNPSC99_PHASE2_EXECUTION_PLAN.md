# TNPSC99 — Phase 2 Execution Plan
**Document ID:** `TNPSC99-PLAN-PHASE2-001`  
**Phase Title:** Core Platform Security & Hardening  
**Target Execution:** Sprint 1  
**Prerequisites:** Phase 1 Architecture Assessment Approval  

---

## 1. Phase 2 Scope & Objectives

The primary goal of Phase 2 is to transform the TNPSC99 application from a vulnerable prototype into a commercially secure, production-ready foundation. It establishes data security, secures the ₹99 subscription payment pipeline, unlocks the textbook reference viewer for paying students, and eliminates unmetered AI billing leaks.

### In Scope for Phase 2:
1. **Firestore & Storage Security Rules Hardening** (Stop privilege escalation & secure textbook PDFs).
2. **Server-Side Payment Security & Webhook** (JWT verification, idempotent transaction recording, webhook fallback).
3. **Subscription Access Gating Enforcement** (Close free user bypass loophole in test routes).
4. **Student Textbook Reference Unlock** (Remove admin restriction on PDF viewer and citation buttons).
5. **Zero-AI Cost Performance Analytics** (Replace Gemini LLM call with instant deterministic analytics).

### Explicitly Out of Scope for Phase 2:
- Modifying production question text or database contents.
- Implementing the AI Tutor or AI credit wallet (scheduled for Phase 5).
- Price changes (strictly maintaining ₹99/month).

---

## 2. Tactical Work Breakdown & File Operations

### Task 2.1: Hardening Firestore & Storage Security Rules
- **Files Affected:**
  - `src/firebase/firestore.rules`
  - `storage.rules`
- **Implementation Details:**
  1. Update `firestore.rules`:
     - Disallow client modifications to `role`, `isAdmin`, `subscriptionStatus`, and `subscriptionExpires` in `/users/{userId}`.
     - Enforce that test documents in `/tests/{testId}` can only be created with `request.resource.data.userId == request.auth.uid`.
     - Restrict read access to `/questions/{questionId}` to authenticated users.
  2. Update `storage.rules`:
     - Restrict write/delete on `/textbooks/**` strictly to administrators.
     - Allow authenticated users read-only access.
- **Verification Criteria:**
  - Authenticated user attempting `updateDoc(userRef, { isAdmin: true })` receives `PERMISSION_DENIED`.
  - Unauthenticated curl requests to Firebase Storage are rejected with 403 Forbidden.

---

### Task 2.2: Securing Razorpay Payment Verification & Adding Webhook
- **Files Affected:**
  - `src/app/api/razorpay/verify/route.ts`
  - `src/app/api/razorpay/webhook/route.ts` (New file)
  - `src/app/api/razorpay/order/route.ts`
- **Implementation Details:**
  1. In `src/app/api/razorpay/order/route.ts`:
     - Hardcode server-side amount to ₹99 (9900 paise); reject any client-submitted arbitrary amounts.
  2. In `src/app/api/razorpay/verify/route.ts`:
     - Extract `Authorization: Bearer <idToken>` from request headers and verify using `adminAuth.verifyIdToken()`. Use the verified `token.uid` instead of body `userId`.
     - Check if `razorpay_payment_id` already exists in `/payments/{paymentId}`. If so, return success without extending subscription twice (idempotency).
     - Write payment audit record to `/payments/{paymentId}` containing `userId`, `orderId`, `amount`, `status: 'captured'`, `createdAt`.
     - Update user's `subscriptionStatus: 'premium'` and calculate `subscriptionExpires` as $\max(\text{now}, \text{currentExpiry}) + 30\text{ days}$.
  3. Create `src/app/api/razorpay/webhook/route.ts`:
     - Read raw request body buffer and verify `x-razorpay-signature` using `crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)`.
     - On `payment.captured` or `order.paid`, perform the same idempotent subscription extension.
- **Verification Criteria:**
  - Verification succeeds with valid Auth token; fails with 401 when token is omitted.
  - Replaying identical verification payload does not extend expiry date twice.
  - Server successfully handles simulated Razorpay webhook payload.

---

### Task 2.3: Fixing Subscription Access Gate in Test Route
- **Files Affected:**
  - `src/app/(app)/test/[slug]/page.tsx`
  - `src/lib/subscription-utils.ts`
- **Implementation Details:**
  1. Create a robust validation function in `subscription-utils.ts`:
     ```typescript
     export function hasActiveSubscription(userProfile: UserProfile | null): boolean {
       if (!userProfile) return false;
       if (userProfile.isAdmin) return true;
       if (userProfile.subscriptionStatus !== 'premium') return false;
       if (!userProfile.subscriptionExpires) return false;
       return new Date(userProfile.subscriptionExpires.seconds * 1000) > new Date();
     }
     ```
  2. In `src/app/(app)/test/[slug]/page.tsx`:
     - Check `hasActiveSubscription(userProfile)`.
     - If false and slug is not marked as free demo, redirect user immediately to `/subscription` with a toast: `"This test requires an active ₹99 monthly subscription."`.
- **Verification Criteria:**
  - Newly created user account (`subscriptionStatus: 'free'`, `subscriptionExpires: null`) attempting to navigate to paid test is redirected to `/subscription`.
  - Active subscriber can enter and take the test without interruption.

---

### Task 2.4: Unlocking Textbook Reference Viewer for Students
- **Files Affected:**
  - `src/components/mcq-test.tsx`
  - `src/app/(app)/pdf-viewer/page.tsx`
- **Implementation Details:**
  1. In `src/components/mcq-test.tsx`:
     - Modify line 679: Replace `{userProfile?.isAdmin && ...}` with:
       ```tsx
       {(userProfile?.isAdmin || hasActiveSubscription(userProfile)) && currentQ.referencePage && (
         <Button 
           variant="outline" 
           size="sm" 
           onClick={handleOpenReference}
           className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1.5"
         >
           <BookOpen className="w-4 h-4" />
           புத்தகத்தைப் பார்க்க (பக்கம் {currentQ.referencePage})
         </Button>
       )}
       ```
  2. In `src/app/(app)/pdf-viewer/page.tsx`:
     - Allow access if `userProfile.isAdmin || hasActiveSubscription(userProfile)`.
     - Calculate target PDF page dynamically: `page = referencePage + (referencePageOffset || 10)`.
- **Verification Criteria:**
  - Subscribed non-admin student sees the "புத்தகத்தைப் பார்க்க" button upon answering.
  - Clicking the button opens the viewer directly on the exact verified textbook page.

---

### Task 2.5: Deterministic Performance Analytics (Zero AI Leak)
- **Files Affected:**
  - `src/app/(app)/performance/page.tsx`
- **Implementation Details:**
  1. Remove `fetch('/api/genkit/performanceAnalysisFlow')` and associated loading states.
  2. Implement local analytical functions:
     - **Accuracy Rate:** $\frac{\sum \text{Score}}{\sum \text{Total Questions}} \times 100\%$
     - **Speed Metric:** Average seconds spent per question.
     - **Chapter Breakdown:** Group past test attempts by subject and chapter; calculate accuracy percentage per chapter.
     - **Weak-Area Flags:** Highlight chapters where accuracy $< 65\%$ in an amber/red card with recommendations for targeted revision.
- **Verification Criteria:**
  - Dashboard loads instantaneously without making any external API calls.
  - LLM costs remain exactly $0.00.
  - Accuracy stats update immediately upon completing a new test.

---

## 3. Rollout & Validation Checklist

| Step | Action | Method | Pass Condition |
| :---: | :--- | :--- | :--- |
| **01** | Rule Testing | Local emulator / dry run | Self-update of `isAdmin` rejected. |
| **02** | Storage Rule Testing | Unauthenticated PUT attempt | Storage upload returns 403. |
| **03** | Auth on Payment Verify | cURL POST without Bearer header | Returns 401 Unauthorized. |
| **04** | Idempotent Payment | cURL POST duplicate payment ID | Returns 200 without double expiry addition. |
| **05** | Free User Test Access | Navigate to `/test/tamil-10-1` as free user | Redirects to `/subscription`. |
| **06** | Student PDF Reference | Click "புத்தகத்தைப் பார்க்க" as student | Opens PDF viewer to correct page. |
| **07** | Network Inspector | Load `/performance` | Zero network calls to `/api/genkit`. |

---

## 4. Phase 2 Completion Gate

Upon successful execution and validation of all 5 tasks, TNPSC99 will be secure against unauthorized tampering, subscription bypass, data defacement, and unexpected AI bills, clearing the way for Phase 3 (MCQ Test Engine Polish & Exam Mode).
