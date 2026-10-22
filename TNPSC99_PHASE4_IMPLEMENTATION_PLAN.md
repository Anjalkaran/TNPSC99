# TNPSC99 — Phase 4 Production Deployment & Operations Blueprint

**Target Phase:** Phase 4: Production Deployment, Live Firebase Configuration & Post-Deployment Auditing  
**Current Branch:** `phase-3c-learning-progress-mistake-vault`  
**Authorization Status:** **ON HOLD (PENDING USER AUTHORIZATION)**  
**Notice:** Production deployment, live Firebase security rule publication, and live Firestore modifications remain unauthorized at this stage.

---

## 1. Overview & Objectives

Phase 4 defines the comprehensive operational strategy to promote the hardened TNPSC99 codebase (Phases 2, 3A, 3B, and 3C) into production using Firebase App Hosting, publish the synchronized Firestore security rules, configure production webhooks, and execute end-to-end post-deployment verification.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 4 GATEWAY STATUS                          │
│                                                                        │
│   Phase 2: Security & Hardening               ✅ APPROVED & AUDITED    │
│   Phase 3A: Homepage & Design System          ✅ APPROVED & AUDITED    │
│   Phase 3B: Dual-Mode Testing Engine          ✅ APPROVED & AUDITED    │
│   Phase 3C: Progress & Mistake Vault          ✅ APPROVED & AUDITED    │
│   Phase 4: Production Deployment              ⏸ PAUSED (AWAITING AUTH)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Step-by-Step Deployment Architecture

### Step 1 — Pre-Deployment & Baseline Validation
1. **Git Merge & Tagging:**
   - Merge `phase-3c-learning-progress-mistake-vault` into `main` after user approval.
   - Tag release: `git tag -a v1.0.0-phase3c -m "Hardened Production Release v1.0.0"`.
   - Confirm clean working tree with zero untracked or modified artifacts.
2. **Environment Variable Configuration Audit:**
   - Verify production environment secrets in Firebase App Hosting / Secret Manager:
     - `RAZORPAY_KEY_ID` (Live key `rzp_live_...`)
     - `RAZORPAY_KEY_SECRET` (Live secret)
     - `RAZORPAY_WEBHOOK_SECRET` (Secret for verifying payment events)
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY`
   - Confirm `NEXT_PUBLIC_APP_URL` points to the canonical production domain.
   - Ensure `NODE_ENV=production` is strictly enforced to activate dev preview route lockdowns.

### Step 2 — Live Firebase Security Rules Deployment
1. **Rule File Validation:**
   - Re-confirm `firestore.rules` and `src/firestore.rules` equality.
   - Run local linting / compilation check on rules syntax.
2. **Targeted Deployment Command:**
   ```bash
   firebase deploy --only firestore:rules
   ```
3. **Verification:**
   - Inspect Firebase Console rules tab to confirm rules are active.
   - Test rule enforcement by attempting an unauthenticated read on `/questions` (must be denied).

### Step 3 — Application Deployment (Firebase App Hosting)
1. **Pre-Deployment Build Verification:**
   - Run `npm run build` locally to verify 55/55 routes compile cleanly.
2. **App Hosting Configuration:**
   - Verify `firebase.json` contains a valid `apphosting` block with `backendId` and `rootDir`.
3. **Targeted Deployment Command:**
   ```bash
   firebase deploy
   ```
   *(Per user rules: DO NOT use `firebase apphosting:backends:create` or `firebase apphosting:rollouts:create`. DO NOT deploy to legacy Firebase Hosting).*

---

## 3. Post-Deployment Smoke Testing & Acceptance Checklist

Upon authorized deployment, the following 10-step smoke test must be executed on live staging/production:

| Check # | Test Procedure | Expected Outcome | Pass/Fail |
| :---: | :--- | :--- | :---: |
| **01** | Visit homepage at desktop and mobile viewports | ₹99/month subscription clearly presented; zero unsupported claims; AI Tutor teaser properly styled. | [ ] |
| **02** | Student registration and sign-in flow | Clean authentication; default `role: 'student'`, `subscriptionStatus: 'free'`, zero privilege escalation. | [ ] |
| **03** | Initiate ₹99 Razorpay checkout | Order API returns valid `orderId` with exact ₹9900 (9900 paise); signature verification completes. | [ ] |
| **04** | Webhook processing | Webhook securely activates subscription to `premium` with +30 days expiration; idempotency verified. | [ ] |
| **05** | Launch Practice Mode test | Immediate answer feedback; textbook reference drawer opens with correct page offset; re-scoring blocked. | [ ] |
| **06** | Launch Exam Mode test | Timer counts down accurately; answers freely changeable; question palette updates; clean auto-submit. | [ ] |
| **07** | Attempt immutability check | Completed attempt cannot be modified, deleted, or rescored via direct Firestore API calls. | [ ] |
| **08** | Mistake Vault population | Incorrect questions appear in Mistake Vault; unresolved count updates on student dashboard. | [ ] |
| **09** | 3-Stage Revision progression | Revision test advances unresolved question to `revised`; subsequent correct revision advances to `mastered`. | [ ] |
| **10** | Production route lockdown | Direct navigation to `/phase3c-preview` and `/test-preview` returns HTTP 404 (Not Found). | [ ] |

---

## 4. Rollback & Contingency Plan

If any critical issue arises during deployment:
1. **Application Rollback:**
   - Revert commit on `main` or deploy previous approved commit baseline (`91b3f28` / `67331fd`).
   - Trigger immediate re-deployment via `firebase deploy`.
2. **Security Rules Rollback:**
   - Restore previous `firestore.rules` snapshot from version control and re-run `firebase deploy --only firestore:rules`.
3. **Database Safeguards:**
   - All historical student attempts, payment audit receipts, and user profiles remain immutable and unaffected by client rollbacks.

---

## 5. Next Actions

Execution of Phase 4 remains completely paused. Please provide authorization when ready to proceed with production deployment.
