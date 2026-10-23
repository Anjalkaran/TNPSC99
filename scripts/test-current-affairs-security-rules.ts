/**
 * TNPSC99 — Staging Security Verification: Current Affairs Rules & Multi-Tier Access
 * Tests multi-tier access against real Firestore Security Rules:
 *  - Anonymous (Unauthenticated)
 *  - Normal Authenticated Student (Free)
 *  - Subscribed Student (Premium)
 *  - Administrative User (Admin)
 */

import { initializeApp as initClientApp, deleteApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'studio-5029416251-928dd';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;

process.env.FIRESTORE_EMULATOR_HOST = `${FIRESTORE_HOST}:${FIRESTORE_PORT}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${FIRESTORE_HOST}:${AUTH_PORT}`;

// Initialize Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();

// Initialize Client App
const clientApp = initClientApp({
  apiKey: 'fake-api-key-for-emulator',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
}, 'ca-security-client-app');

const clientDb = getClientFirestore(clientApp);
const clientAuth = getClientAuth(clientApp);

connectFirestoreEmulator(clientDb, FIRESTORE_HOST, FIRESTORE_PORT);
connectAuthEmulator(clientAuth, `http://${FIRESTORE_HOST}:${AUTH_PORT}`, { disableWarnings: true });

interface RuleCheckResult {
  id: string;
  tier: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: RuleCheckResult[] = [];

function recordResult(tier: string, id: string, name: string, passed: boolean, details: string) {
  results.push({ id, tier, name, passed, details });
}

async function expectAllowed(fn: () => Promise<any>, description: string): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (err: any) {
    console.error(`  ❌ Expected ALLOWED but got DENIED: ${description}`, err.message);
    return false;
  }
}

async function expectDenied(fn: () => Promise<any>, description: string): Promise<boolean> {
  try {
    await fn();
    console.error(`  ❌ SECURITY DEFECT: Expected DENIED but was PERMITTED: ${description}`);
    return false;
  } catch (err: any) {
    const isDenied =
      err.code === 'permission-denied' ||
      err.message?.includes('permission-denied') ||
      err.message?.includes('PERMISSION_DENIED') ||
      err.toString().includes('Missing or insufficient permissions');

    if (isDenied) {
      return true;
    }
    console.error(`  ❌ Unexpected error during denied check: ${description}`, err);
    return false;
  }
}

async function runCurrentAffairsSecuritySuite() {
  console.log('========================================================================');
  console.log('TNPSC99 — CURRENT AFFAIRS FIRESTORE SECURITY RULES VERIFICATION');
  console.log('Scope: Multi-Tier Matrix (Anonymous, Free, Subscribed, Admin)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  // Test User IDs
  const studentFreeUid = 'student_free_user_001';
  const studentSubscribedUid = 'student_subscribed_user_002';
  const adminUid = 'admin_editor_user_003';

  // Seed Profiles in Firestore & Auth
  console.log('[Phase 1] Seeding Test Profiles in Auth & Firestore...');
  
  await adminDb.doc(`users/${studentFreeUid}`).set({
    uid: studentFreeUid,
    displayName: 'Free Student',
    role: 'student',
    subscriptionStatus: 'free',
  });

  await adminDb.doc(`users/${studentSubscribedUid}`).set({
    uid: studentSubscribedUid,
    displayName: 'Subscribed Aspirant',
    role: 'student',
    subscriptionStatus: 'premium',
  });

  await adminDb.doc(`users/${adminUid}`).set({
    uid: adminUid,
    displayName: 'Chief Editorial Admin',
    role: 'admin',
    isAdmin: true,
  });

  // Seed Test Documents in Firestore
  console.log('[Phase 2] Seeding Current Affairs Questions & Manifests...');
  
  // 1. Published Free Question
  await adminDb.doc('currentAffairsQuestions/ca_pub_free_01').set({
    status: 'PUBLISHED',
    isFree: true,
    accessLevel: 'free',
    question_en: 'Which Indian state launched the Naan Mudhalvan scheme?',
    question_ta: 'நான் முதல்வன் திட்டத்தை தொடங்கிய இந்திய மாநிலம் எது?',
    correctOptionIndex: 0,
  });

  // 2. Published Premium Question
  await adminDb.doc('currentAffairsQuestions/ca_pub_prem_02').set({
    status: 'PUBLISHED',
    isFree: false,
    accessLevel: 'premium',
    question_en: 'What is the revised capital expenditure outlay for TN industrial parks?',
    correctOptionIndex: 1,
  });

  // 3. Draft Question (Unpublished)
  await adminDb.doc('currentAffairsQuestions/ca_draft_03').set({
    status: 'DRAFT',
    isFree: true,
    question_en: 'Draft question awaiting editorial pipeline.',
  });

  // 4. Review-Required Question (Uncertified)
  await adminDb.doc('currentAffairsQuestions/ca_review_04').set({
    status: 'REVIEW_REQUIRED',
    isFree: true,
    question_en: 'Candidate question undergoing fact verification.',
  });

  // 5. Rejected Question (Quarantined)
  await adminDb.doc('currentAffairsQuestions/ca_rejected_05').set({
    status: 'REJECTED',
    isFree: true,
    question_en: 'Question rejected due to primary source URL mismatch.',
  });

  // 6. Manifests
  await adminDb.doc('ca_manifests/manifest_published_free').set({
    type: 'daily',
    status: 'published',
    isFree: true,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_free_01'],
  });

  await adminDb.doc('ca_manifests/manifest_draft_internal').set({
    type: 'daily',
    status: 'draft',
    isFree: true,
    periodEnd: '2026-10-24',
    questionIds: ['ca_draft_03'],
  });

  // 7. Internal Staging Pipeline Collection
  await adminDb.doc('ca_draft_questions/staging_draft_01').set({
    rawDocumentId: 'pib_doc_9921',
    internalNotes: 'Editorial review notes',
  });

  // ---------------------------------------------------------------------------
  // TIER 1: ANONYMOUS (UNAUTHENTICATED) CLIENT
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 3] Testing TIER 1: Anonymous (Unauthenticated) Access...');
  await signOut(clientAuth);

  const anonPubFree = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Anonymous reading published free question');
  recordResult('Tier 1: Anonymous', 'ANON-01', 'Read published free CA question', anonPubFree, 'Public access to free approved MCQs');

  const anonPubPrem = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'));
  }, 'Anonymous reading published premium question');
  recordResult('Tier 1: Anonymous', 'ANON-02', 'Blocked from published premium CA question', anonPubPrem, 'Subscription authorization enforced');

  const anonReview = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
  }, 'Anonymous reading REVIEW_REQUIRED question');
  recordResult('Tier 1: Anonymous', 'ANON-03', 'Blocked from REVIEW_REQUIRED question', anonReview, 'Zero exposure of unverified drafts');

  const anonRejected = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_rejected_05'));
  }, 'Anonymous reading REJECTED question');
  recordResult('Tier 1: Anonymous', 'ANON-04', 'Blocked from REJECTED question', anonRejected, 'Quarantined drafts remain sealed');

  const anonWrite = await expectDenied(async () => {
    await setDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'), { question_en: 'Hacked question' }, { merge: true });
  }, 'Anonymous writing to question');
  recordResult('Tier 1: Anonymous', 'ANON-05', 'Write/modify blocked for anonymous users', anonWrite, 'Zero privilege escalation');

  const anonStaging = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'ca_draft_questions/staging_draft_01'));
  }, 'Anonymous accessing ca_draft_questions');
  recordResult('Tier 1: Anonymous', 'ANON-06', 'Internal staging collection blocked', anonStaging, 'Internal pipeline sealed');

  // ---------------------------------------------------------------------------
  // TIER 2: AUTHENTICATED FREE STUDENT
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 4] Testing TIER 2: Authenticated Free Student Access...');
  const freeToken = await adminAuth.createCustomToken(studentFreeUid);
  await signInWithCustomToken(clientAuth, freeToken);

  const freePubFree = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Free student reading published free question');
  recordResult('Tier 2: Free Student', 'FREE-01', 'Read published free CA question', freePubFree, 'Free access granted');

  const freePubPrem = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'));
  }, 'Free student reading published premium question');
  recordResult('Tier 2: Free Student', 'FREE-02', 'Blocked from published premium CA question', freePubPrem, 'Requires subscription upgrade');

  const freeDraft = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
  }, 'Free student reading DRAFT question');
  recordResult('Tier 2: Free Student', 'FREE-03', 'Blocked from DRAFT question', freeDraft, 'Drafts sealed from students');

  const freeReview = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
  }, 'Free student reading REVIEW_REQUIRED question');
  recordResult('Tier 2: Free Student', 'FREE-04', 'Blocked from REVIEW_REQUIRED question', freeReview, 'Uncertified drafts sealed');

  const freeAnswerTamper = await expectDenied(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'), {
      correctOptionIndex: 3,
    });
  }, 'Free student modifying answer key');
  recordResult('Tier 2: Free Student', 'FREE-05', 'Direct answer-key modification blocked', freeAnswerTamper, 'Authoritative key integrity protected');

  // ---------------------------------------------------------------------------
  // TIER 3: SUBSCRIBED ASPIRANT (PREMIUM ₹99/MO TIER)
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 5] Testing TIER 3: Subscribed Aspirant (Premium) Access...');
  const subToken = await adminAuth.createCustomToken(studentSubscribedUid);
  await signInWithCustomToken(clientAuth, subToken);

  const subPubFree = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Subscribed student reading free question');
  recordResult('Tier 3: Subscribed Aspirant', 'SUB-01', 'Read published free question', subPubFree, 'Full access to free tier');

  const subPubPrem = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Subscribed student reading premium question');
  recordResult('Tier 3: Subscribed Aspirant', 'SUB-02', 'Read published premium question', subPubPrem, 'Subscription authorization successful');

  const subDraft = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
  }, 'Subscribed student reading DRAFT question');
  recordResult('Tier 3: Subscribed Aspirant', 'SUB-03', 'Blocked from DRAFT question', subDraft, 'Editorial drafts strictly withheld from subscribers');

  const subReview = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
  }, 'Subscribed student reading REVIEW_REQUIRED question');
  recordResult('Tier 3: Subscribed Aspirant', 'SUB-04', 'Blocked from REVIEW_REQUIRED question', subReview, 'Uncertified content withheld from subscribers');

  const subWrite = await expectDenied(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'), { correctOptionIndex: 2 });
  }, 'Subscribed student modifying question');
  recordResult('Tier 3: Subscribed Aspirant', 'SUB-05', 'Answer-key modification blocked for subscribers', subWrite, 'Zero privilege escalation');

  // ---------------------------------------------------------------------------
  // TIER 4: ADMINISTRATIVE EDITORIAL USER
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 6] Testing TIER 4: Administrative User (Editorial Workbench)...');
  const adminToken = await adminAuth.createCustomToken(adminUid, { admin: true });
  await signInWithCustomToken(clientAuth, adminToken);

  const adminReadDraft = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading DRAFT question');
  recordResult('Tier 4: Administrator', 'ADM-01', 'Full read access to DRAFT questions', adminReadDraft, 'Editorial review workbench access');

  const adminReadReview = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading REVIEW_REQUIRED question');
  recordResult('Tier 4: Administrator', 'ADM-02', 'Full read access to REVIEW_REQUIRED questions', adminReadReview, 'Editorial review workbench access');

  const adminReadRejected = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_rejected_05'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading REJECTED question');
  recordResult('Tier 4: Administrator', 'ADM-03', 'Full read access to REJECTED questions', adminReadRejected, 'Audit and provenance inspection');

  const adminWriteQuestion = await expectAllowed(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'), {
      status: 'REVIEW_REQUIRED',
    });
  }, 'Admin updating question status');
  recordResult('Tier 4: Administrator', 'ADM-04', 'Admin write/approval permission', adminWriteQuestion, 'Editorial approval authorized');

  const adminStagingAccess = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'ca_draft_questions/staging_draft_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin accessing internal staging collection');
  recordResult('Tier 4: Administrator', 'ADM-05', 'Admin staging collection access', adminStagingAccess, 'Internal pipeline management');

  // Print Summary Table
  console.log('\n========================================================================');
  console.log('CURRENT AFFAIRS MULTI-TIER FIRESTORE SECURITY AUDIT SUMMARY');
  console.log('========================================================================');

  let passedTotal = 0;
  results.forEach((r) => {
    const mark = r.passed ? '[✓ PASS]' : '[✗ FAIL]';
    console.log(`${mark} ${r.tier} (${r.id}) -> ${r.name}`);
    console.log(`       Policy: ${r.details}`);
    if (r.passed) passedTotal++;
  });

  console.log('========================================================================');
  console.log(`TOTAL SECURITY AUDITS: ${results.length} | PASSED: ${passedTotal} | FAILED: ${results.length - passedTotal}`);
  console.log('========================================================================\n');

  if (passedTotal === results.length) {
    console.log('ALL CURRENT AFFAIRS SECURITY RULES AUDITS PASSED WITH ZERO VULNERABILITIES!');
    process.exit(0);
  } else {
    console.error('CRITICAL: ONE OR MORE SECURITY AUDITS FAILED!');
    process.exit(1);
  }
}

runCurrentAffairsSecuritySuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
