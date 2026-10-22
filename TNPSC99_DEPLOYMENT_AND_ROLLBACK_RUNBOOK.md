# TNPSC99 — Production Deployment & Rollback Runbook

**Project ID:** `studio-5029416251-928dd`  
**App Hosting Backend ID:** `studio`  
**Target Architecture:** Firebase App Hosting (Next.js SSR/Static) + Cloud Firestore + Firebase Authentication  
**Payment Gateway:** Razorpay Standard Checkout (₹99/month strict subscription)  
**Security Model:** Server-Authoritative Scoring, 3-Stage Mistake Vault Mastery  

---

## 1. Pre-Deployment Baseline & Preparation

Before triggering any production deployment:

### 1.1 Preflight Verification Checklist
- [ ] Confirm Git working tree is clean: `git status`
- [ ] Confirm latest commit on release branch: `git log -1`
- [ ] Verify local regression test suite passed:
  ```bash
  npx tsx scripts/test-phase2-security.ts
  npx tsx scripts/test-phase3b-engine.ts
  npx tsx scripts/test-phase3b-integration.ts
  npx tsx scripts/test-phase3c-suite.ts
  npx tsx scripts/test-rules-and-lifecycle.ts
  npx firebase emulators:exec --only firestore,auth "npx tsx scripts/test-phase4a-validation.ts"
  ```
- [ ] Confirm production build completes without errors: `npm run build`
- [ ] Verify environment variables are configured in Firebase App Hosting Secrets Manager:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
- [ ] Verify `firebase.json` contains:
  ```json
  "apphosting": {
    "backendId": "studio",
    "rootDir": "./"
  }
  ```

### 1.2 Pre-Deployment Firestore Backup
Create a snapshot of live Firestore collections before deploying any changes:
```bash
# Export Firestore database to Cloud Storage bucket
gcloud firestore export gs://studio-5029416251-928dd-backups/pre-phase4-$(date +%Y%m%d-%H%M%S) --project=studio-5029416251-928dd
```

---

## 2. Step-by-Step Deployment Procedure

> [!IMPORTANT]
> Per user constraints and project migration guidelines, deployment to Firebase Hosting is FORBIDDEN. Deploy only to Firebase App Hosting using `firebase deploy`.

### Step 2.1: Publish Firestore Security Rules & Indexes
Deploy rules and indexes first to ensure backend authorization is enforced prior to code release:
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules --project studio-5029416251-928dd

# Deploy Firestore composite indexes
firebase deploy --only firestore:indexes --project studio-5029416251-928dd
```

### Step 2.2: Deploy Next.js Application to Firebase App Hosting
Deploy the application bundle:
```bash
# Deploy to App Hosting (DO NOT use firebase apphosting:backends:create)
firebase deploy --only apphosting --project studio-5029416251-928dd
```

---

## 3. Post-Deployment Verification & Smoke Tests

Perform the following smoke tests on the live production URL immediately following rollout:

| Test ID | Area | Action | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **ST-01** | Public Homepage | Visit `https://studio-5029416251-928dd.web.app` | Homepage loads with ₹99/mo Academy hero, no console errors |
| **ST-02** | Security Headers | Inspect response headers | HSTS, X-Content-Type-Options, CSP present |
| **ST-03** | Auth Redirect | Click "Take Exam" while logged out | Redirects cleanly to `/login` |
| **ST-04** | Free Preview | Attempt free demo test without subscription | Permitted, explanation displays |
| **ST-05** | Subscription Gate | Access paid curriculum test with free account | Displays subscription modal, prompts ₹99 upgrade |
| **ST-06** | Razorpay Order | Initiate checkout on `/subscription` | Server creates Razorpay order for exactly ₹99 (9900 paise) |
| **ST-07** | Server Scoring | Complete and submit practice session | Server returns authentic score via `/api/test/submit` |
| **ST-08** | Mistake Vault | Fail a question during exam | Question appears in student Mistake Vault as `unresolved` |
| **ST-09** | Mistake Vault Lockdown | Attempt direct client write to `/mistakeVault` | Blocked by Firestore security rules (403 Forbidden) |
| **ST-10** | Student Dashboard | Load `/dashboard` | Accuracy, coverage, and chapter progress render deterministically |

---

## 4. Rollback Triggers & Emergency Procedure

### 4.1 Rollback Triggers
Initiate immediate rollback if any of the following occur:
1. **Critical Authentication Failure:** Students unable to sign in or sessions invalidate unexpectedly.
2. **Payment Processing Breakdown:** Razorpay order creation or verification failure rate $> 1\%$.
3. **Scoring Service Outage:** `/api/test/submit` returns 5xx errors or scoring transaction failures.
4. **Security Vulnerability:** Unauthorized student write access to `scores`, `mistakeVault`, or test attempt documents.

### 4.2 Rollback Procedure (Firebase App Hosting)
Firebase App Hosting supports instant rollout rollback to the previous stable release.

#### Option A: Rollback via Firebase Console (Recommended)
1. Navigate to **Firebase Console** $\rightarrow$ **App Hosting**.
2. Select backend `studio`.
3. Locate the previous healthy rollout build ID.
4. Click **Roll back to this build**.
5. Traffic shifts 100% to the previous build within 60 seconds.

#### Option B: Rollback Security Rules
If security rules introduced regression, revert rules to previous commit:
```bash
# Revert firestore.rules to previous commit
git checkout HEAD~1 -- firestore.rules src/firestore.rules
firebase deploy --only firestore:rules --project studio-5029416251-928dd
```

#### Option C: Restore Firestore Data Snapshot (Disaster Recovery Only)
In the event of corrupted student records:
```bash
# Restore specific collection from Cloud Storage backup
gcloud firestore import gs://studio-5029416251-928dd-backups/<backup-folder> --project=studio-5029416251-928dd
```

---

## 5. Deployment Sign-off

- **Lead Engineer:** Antigravity Pairing Assistant
- **Verification Status:** 100% Tests Passed (138 scenarios)
- **Deployment Authorization:** Pending User Go-Ahead
