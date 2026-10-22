# TNPSC99 — Vision Baseline Architecture Audit
**Document ID:** `TNPSC99-AUDIT-ARCH-001`  
**Assessment Date:** October 2026  
**Audited Repository:** `c:\Users\shanm\Downloads\project`  
**Firebase Project ID:** `studio-5029416251-928dd`  
**Audit Classification:** READ-ONLY Architectural & Security Assessment

---

## 1. Executive Summary

This document establishes the comprehensive architectural baseline of the **TNPSC99** preparation platform. TNPSC99 is designed to provide high-quality Tamil Nadu Public Service Commission (TNPSC) exam preparation centered on a **₹99/month unlimited MCQ practice subscription**, anchored by verified textbook source references, with an optional separate credit-metered AI tutor.

This assessment reviewed the complete codebase across frontend, backend, Firebase configurations, payment workflows, and AI integrations to determine production readiness and uncover architectural blockers.

---

## 2. Technology Stack & Framework Inventory

| Component | Technology | Version | Location / Configuration | Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `14.2.35` | `package.json`, `src/app/` | Uses Next.js App Router with server/client components. |
| **UI Library** | React / React DOM | `18.3.1` | `package.json` | Client hooks (`useState`, `useEffect`) and context providers. |
| **Component Styling** | Tailwind CSS + Radix UI | Tailwind `3.4.1`, Radix primitives | `tailwind.config.ts`, `src/components/ui/` | Lucide React icons (`0.378.0`), Shadcn-style UI components. |
| **Client Firebase SDK** | Firebase JS SDK | `11.9.1` | `src/firebase/client.ts`, `src/context/auth-context.tsx` | Modular Firebase SDK (Auth, Firestore, Storage). |
| **Server Firebase SDK** | Firebase Admin SDK | `12.1.0` | `src/firebase/admin.ts` | Service account initialization in API routes. |
| **AI Framework** | Genkit | `^1.1.0` | `src/ai/`, `src/app/api/genkit/` | Google Genkit with `@genkit-ai/googleai` (`Gemini 1.5 Flash`). |
| **Payment Gateway** | Razorpay Node / Checkout | `2.9.6` | `src/app/api/razorpay/`, Razorpay standard checkout | Order generation & manual client verification routes. |
| **Hosting Platform** | Firebase App Hosting | Next.js dynamic runtime | `apphosting.yaml`, `firebase.json` | Node.js 20 environment configured. |
| **PDF Rendering** | Native iframe / embed | N/A | `src/app/(app)/pdf-viewer/page.tsx` | Direct PDF iframe embedding with URL page fragments (`#page=X`). |

---

## 3. Directory & Routing Architecture

The codebase adheres to the Next.js App Router structure with dedicated route groups:

```
src/
├── ai/                          # Genkit AI flows and configuration
│   ├── dev.ts                   # Development flow runner
│   ├── index.ts                 # Genkit export registry
│   └── flows/                   # Flow definitions (e.g., performance analysis)
├── app/
│   ├── (admin)/                 # Route group for administrative features
│   │   ├── admin/
│   │   │   ├── page.tsx         # Admin dashboard summary
│   │   │   ├── questions/       # Question management & editing
│   │   │   ├── upload/          # JSON MCQ bulk uploader
│   │   │   └── users/           # User listing & subscription control
│   │   └── layout.tsx           # Admin layout with navigation sidebar
│   ├── (app)/                   # Route group for authenticated student workflows
│   │   ├── ask-your-doubt/      # AI Tutor stub (Under construction)
│   │   ├── dashboard/           # Student home / study dashboard
│   │   ├── pdf-viewer/          # Textbook PDF viewer (Restricted to admin currently)
│   │   ├── performance/         # Student performance & analytics
│   │   ├── profile/             # Student profile settings
│   │   ├── subscription/        # ₹99 plan details & Razorpay checkout
│   │   ├── test/
│   │   │   └── [slug]/          # Active MCQ test interface (slug = subject/topic)
│   │   └── layout.tsx           # Student application layout
│   ├── (auth)/                  # Route group for authentication
│   │   ├── login/               # Student & Admin sign-in
│   │   └── signup/              # Student account registration
│   ├── api/                     # Backend Next.js Route Handlers
│   │   ├── genkit/              # Genkit flow execution endpoints
│   │   └── razorpay/
│   │       ├── order/           # Razorpay order generation
│   │       └── verify/          # Razorpay payment signature verification
│   ├── globals.css              # Global styles & Tailwind variables
│   ├── layout.tsx               # Root application layout & AuthProvider wrapper
│   └── page.tsx                 # Public landing page (Hero, features, CTA)
├── components/                  # Reusable UI & business logic components
│   ├── mcq-test.tsx             # Core interactive test engine
│   └── ui/                      # Base primitives (button, card, dialog, etc.)
├── context/
│   └── auth-context.tsx         # Firebase Auth listener & UserProfile context
├── firebase/
│   ├── admin.ts                 # Firebase Admin initialization
│   ├── client.ts                # Firebase Client initialization
│   └── firestore.rules          # Firestore Security Rules definition
└── lib/
    ├── subscription-utils.ts    # Date calculations & subscription check helpers
    └── utils.ts                 # Classname utility helpers
```

---

## 4. Database & Storage Architecture

### 4.1 Firestore Collections
1. **`users` (`/users/{userId}`)**
   - **Fields:** `uid`, `email`, `displayName`, `phoneNumber`, `role` (`'student'` | `'admin'`), `isAdmin` (boolean), `subscriptionStatus` (`'free'` | `'premium'`), `subscriptionExpires` (Firestore Timestamp), `createdAt`, `updatedAt`.
   - **Access Pattern:** Read by client on login to establish session context; updated upon profile save or subscription purchase.

2. **`questions` (`/questions/{questionId}`)**
   - **Fields:** `id`, `questionText`, `options` (array of 4 strings), `correctAnswer` (0-indexed integer or matching string), `explanation`, `subject`, `standard` / `class`, `term`, `lesson` / `chapter`, `referencePage`, `referencePageOffset`, `referenceUrl`, `pdfUrl`, `createdAt`.
   - **Access Pattern:** Queried by `mcq-test.tsx` filtered by lesson/subject.

3. **`tests` (`/tests/{testId}`)**
   - **Fields:** `userId`, `testSlug`, `subject`, `score`, `totalQuestions`, `answers` (map of questionId to selected option), `timeTakenSeconds`, `completedAt`.
   - **Access Pattern:** Written upon test completion; queried by `/performance` to calculate student accuracy.

### 4.2 Firebase Storage
- **Bucket:** `studio-5029416251-928dd.firebasestorage.app`
- **Stored Assets:** Textbook PDFs (e.g., Tamil Standard 10 Term 1-3 textbooks) referenced by MCQ questions for instant visual page navigation.

---

## 5. Security & Isolation Architecture

The baseline inspection identified multiple critical vulnerabilities in the current setup:

1. **Client-Controlled User Document Writes:**
   - In `firestore.rules`, `match /users/{userId} { allow read, write: if isOwner(userId) || isAdmin(); }` grants users unrestricted write access to their own user documents. A student can send a Firestore `setDoc` or `updateDoc` payload setting `isAdmin: true` or `subscriptionStatus: 'premium'` directly from browser dev tools.
2. **Answer Key & Explanation Exposure:**
   - In `firestore.rules`, `match /questions/{questionId} { allow read: if true; }` allows unauthenticated clients to read all questions with correct answers and explanations directly, bypassing exam integrity.
3. **Completely Open Firebase Storage:**
   - `storage.rules` contains `match /{allPaths=**} { allow read, write: if true; }`. Any internet user can delete or overwrite government textbook PDFs.
4. **Subscription Check Loophole:**
   - In `src/app/(app)/test/[slug]/page.tsx`, the logic `if (!isPremium && hasExpired)` fails to block users whose `subscriptionExpires` is `null` or `undefined` (new free accounts), granting free unrestricted access to all tests.
5. **Direct Client Payment Verification:**
   - The `/api/razorpay/verify` endpoint accepts an unauthenticated `userId` string directly from the client JSON body rather than verifying the caller's Firebase Auth JWT. Furthermore, no server webhook exists to process payments if a user closes the browser during redirect.

---

## 6. AI Integration & Cost Posture

- **Current Implementation:** `src/app/api/genkit/` exposes AI flows using Genkit and Gemini 1.5 Flash.
- **Unmetered AI Cost Exposure:** In `src/app/(app)/performance/page.tsx:102`, loading the performance dashboard triggers an automatic call to `/api/genkit/performanceAnalysisFlow`. This calls Gemini 1.5 Flash on every single dashboard load for free users and subscribers alike with **zero credit metering, zero rate limiting, and zero caching**.
- **AI Tutor Status:** `src/app/(app)/ask-your-doubt/page.tsx` is completely unimplemented (a placeholder page). There is no wallet, credit ledger, or recharge system.

---

## 7. Baseline Conclusion

The TNPSC99 application has a solid Next.js 14 / Tailwind UI foundation and active Firebase connectivity. However, before deploying or scaling, **Phase 2 must resolve critical security vulnerabilities in Firestore rules, lock down Storage, fix payment verification, and replace unmetered AI performance analysis with deterministic zero-cost analytics**.
