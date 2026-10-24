/**
 * TNPSC99 — Multi-Tier Current Affairs Firestore Security Verification Suite
 * Tests 5 personas: Anonymous, Registered Free Student, Active Premium Subscriber,
 * Expired Subscriber, and Editorial Admin.
 * Verifies fail-closed access rules, missing access fields, contradictory access fields,
 * retracted items, uncertified drafts, and answer-key tampering.
 */

import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

import { initializeApp as initClientApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';

const PROJECT_ID = 'studio-5029416251-928dd';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;

process.env.FIRESTORE_EMULATOR_HOST = `${FIRESTORE_HOST}:${FIRESTORE_PORT}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${FIRESTORE_HOST}:${AUTH_PORT}`;

// 1. Initialize Admin SDK
const adminApp =
  getAdminApps().length === 0
    ? initAdminApp({ projectId: PROJECT_ID })
    : getAdminApps()[0];

const adminDb = getAdminFirestore(adminApp);
const adminAuth = getAdminAuth(adminApp);

// 2. Initialize Client SDK
const clientApp = initClientApp({
  apiKey: 'fake-api-key-for-emulator',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
});

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
  console.log('TNPSC99 — FAIL-CLOSED CURRENT AFFAIRS SECURITY VERIFICATION');
  console.log('Scope: 5 Personas (Anonymous, Free, Active Premium, Expired, Admin)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  // Test User IDs
  const studentFreeUid = 'student_free_user_001';
  const studentActiveSubUid = 'student_active_sub_user_002';
  const studentExpiredSubUid = 'student_expired_sub_user_003';
  const adminUid = 'admin_editor_user_004';

  // Seed Profiles in Firestore & Auth
  console.log('[Phase 1] Seeding Test Profiles in Auth & Firestore...');
  
  // 1. Free Student
  await adminDb.doc(`users/${studentFreeUid}`).set({
    uid: studentFreeUid,
    displayName: 'Free Student',
    role: 'student',
    subscriptionStatus: 'free',
  });

  // 2. Active Premium Subscriber
  await adminDb.doc(`users/${studentActiveSubUid}`).set({
    uid: studentActiveSubUid,
    displayName: 'Active Premium Subscriber',
    role: 'student',
    subscriptionStatus: 'premium',
  });

  // 3. Expired Subscriber
  await adminDb.doc(`users/${studentExpiredSubUid}`).set({
    uid: studentExpiredSubUid,
    displayName: 'Expired Subscriber',
    role: 'student',
    subscriptionStatus: 'expired',
  });

  // 4. Admin
  await adminDb.doc(`users/${adminUid}`).set({
    uid: adminUid,
    displayName: 'Chief Editorial Admin',
    role: 'admin',
    isAdmin: true,
  });

  // Seed Test Documents in Firestore
  console.log('[Phase 2] Seeding Current Affairs Questions & Manifests...');
  
  // 1. Valid Published Free Question
  await adminDb.doc('currentAffairsQuestions/ca_pub_free_01').set({
    status: 'PUBLISHED',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    question_en: 'Which Indian state launched the Naan Mudhalvan scheme?',
    question_ta: 'நான் முதல்வன் திட்டத்தை தொடங்கிய இந்திய மாநிலம் எது?',
    correctOptionIndex: 0,
  });

  // 2. Valid Published Premium Question
  await adminDb.doc('currentAffairsQuestions/ca_pub_prem_02').set({
    status: 'PUBLISHED',
    isFree: false,
    accessLevel: 'premium',
    isRetracted: false,
    question_en: 'What is the revised capital expenditure outlay for TN industrial parks?',
    correctOptionIndex: 1,
  });

  // 3. Draft Question (Unpublished)
  await adminDb.doc('currentAffairsQuestions/ca_draft_03').set({
    status: 'DRAFT',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    question_en: 'Draft question awaiting editorial pipeline.',
  });

  // 4. Review-Required Question (Uncertified)
  await adminDb.doc('currentAffairsQuestions/ca_review_04').set({
    status: 'REVIEW_REQUIRED',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    question_en: 'Candidate question undergoing fact verification.',
  });

  // 5. Rejected Question (Quarantined)
  await adminDb.doc('currentAffairsQuestions/ca_rejected_05').set({
    status: 'REJECTED',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    question_en: 'Question rejected due to primary source URL mismatch.',
  });

  // 6. Retracted Question (Was published, but revoked)
  await adminDb.doc('currentAffairsQuestions/ca_retracted_06').set({
    status: 'PUBLISHED',
    isFree: true,
    accessLevel: 'free',
    isRetracted: true,
    question_en: 'Question retracted due to post-publishing factual revision.',
  });

  // 7. Missing accessLevel Question (Invalid metadata)
  await adminDb.doc('currentAffairsQuestions/ca_missing_access_07').set({
    status: 'PUBLISHED',
    isFree: true,
    // accessLevel intentionally omitted
    isRetracted: false,
    question_en: 'Question with missing accessLevel field.',
  });

  // 8. Contradictory Question A: isFree: true, accessLevel: 'premium'
  await adminDb.doc('currentAffairsQuestions/ca_contradictory_08').set({
    status: 'PUBLISHED',
    isFree: true,
    accessLevel: 'premium',
    isRetracted: false,
    question_en: 'Question with conflicting isFree:true and accessLevel:premium.',
  });

  // 9. Contradictory Question B: isFree: false, accessLevel: 'free'
  await adminDb.doc('currentAffairsQuestions/ca_contradictory_09').set({
    status: 'PUBLISHED',
    isFree: false,
    accessLevel: 'free',
    isRetracted: false,
    question_en: 'Question with conflicting isFree:false and accessLevel:free.',
  });

  // 10. Manifests
  // Valid Published Free Manifest
  await adminDb.doc('ca_manifests/manifest_pub_free_01').set({
    type: 'daily',
    status: 'published',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_free_01'],
  });

  // Valid Published Premium Manifest
  await adminDb.doc('ca_manifests/manifest_pub_prem_02').set({
    type: 'daily',
    status: 'published',
    isFree: false,
    accessLevel: 'premium',
    isRetracted: false,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_prem_02'],
  });

  // Retracted Manifest
  await adminDb.doc('ca_manifests/manifest_retracted_03').set({
    type: 'daily',
    status: 'published',
    isFree: true,
    accessLevel: 'free',
    isRetracted: true,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_free_01'],
  });

  // Manifest with missing accessLevel
  await adminDb.doc('ca_manifests/manifest_missing_access_04').set({
    type: 'daily',
    status: 'published',
    isFree: true,
    isRetracted: false,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_free_01'],
  });

  // Manifest with contradictory access metadata
  await adminDb.doc('ca_manifests/manifest_contradictory_05').set({
    type: 'daily',
    status: 'published',
    isFree: true,
    accessLevel: 'premium',
    isRetracted: false,
    periodEnd: '2026-10-23',
    questionIds: ['ca_pub_free_01'],
  });

  // Draft Internal Manifest
  await adminDb.doc('ca_manifests/manifest_draft_internal').set({
    type: 'daily',
    status: 'draft',
    isFree: true,
    accessLevel: 'free',
    isRetracted: false,
    periodEnd: '2026-10-24',
    questionIds: ['ca_draft_03'],
  });

  // Internal Staging Pipeline Collection
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
  }, 'Anonymous reading valid published free question');
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

  const anonRetracted = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_retracted_06'));
  }, 'Anonymous reading retracted question');
  recordResult('Tier 1: Anonymous', 'ANON-05', 'Blocked from retracted question', anonRetracted, 'Retracted items denied fail-closed');

  const anonMissingAccess = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_missing_access_07'));
  }, 'Anonymous reading question with missing accessLevel');
  recordResult('Tier 1: Anonymous', 'ANON-06', 'Blocked from question missing accessLevel', anonMissingAccess, 'Never defaults missing field to free');

  const anonContradictory = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_contradictory_08'));
  }, 'Anonymous reading contradictory question');
  recordResult('Tier 1: Anonymous', 'ANON-07', 'Blocked from contradictory accessLevel question', anonContradictory, 'Inconsistent metadata rejected');

  const anonPubManifest = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'ca_manifests/manifest_pub_free_01'));
    if (!snap.exists()) throw new Error('Manifest not found');
  }, 'Anonymous reading published free manifest');
  recordResult('Tier 1: Anonymous', 'ANON-08', 'Read published free manifest', anonPubManifest, 'Public access to approved daily manifest');

  const anonPremManifest = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'ca_manifests/manifest_pub_prem_02'));
  }, 'Anonymous reading premium manifest');
  recordResult('Tier 1: Anonymous', 'ANON-09', 'Blocked from premium manifest', anonPremManifest, 'Premium manifest requires subscription');

  const anonRetractedManifest = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'ca_manifests/manifest_retracted_03'));
  }, 'Anonymous reading retracted manifest');
  recordResult('Tier 1: Anonymous', 'ANON-10', 'Blocked from retracted manifest', anonRetractedManifest, 'Retracted manifests blocked');

  const anonWrite = await expectDenied(async () => {
    await setDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'), { question_en: 'Hacked question' }, { merge: true });
  }, 'Anonymous writing to question');
  recordResult('Tier 1: Anonymous', 'ANON-11', 'Write/modify blocked for anonymous users', anonWrite, 'Zero privilege escalation');

  const anonStaging = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'ca_draft_questions/staging_draft_01'));
  }, 'Anonymous accessing ca_draft_questions');
  recordResult('Tier 1: Anonymous', 'ANON-12', 'Internal staging collection blocked', anonStaging, 'Internal pipeline sealed');

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

  const freeRetracted = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_retracted_06'));
  }, 'Free student reading retracted question');
  recordResult('Tier 2: Free Student', 'FREE-05', 'Blocked from retracted question', freeRetracted, 'Retracted questions sealed from students');

  const freeMissingAccess = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_missing_access_07'));
  }, 'Free student reading question with missing accessLevel');
  recordResult('Tier 2: Free Student', 'FREE-06', 'Blocked from missing accessLevel question', freeMissingAccess, 'Fail-closed on missing fields');

  const freeAnswerTamper = await expectDenied(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'), {
      correctOptionIndex: 3,
    });
  }, 'Free student modifying answer key');
  recordResult('Tier 2: Free Student', 'FREE-07', 'Direct answer-key modification blocked', freeAnswerTamper, 'Authoritative key integrity protected');

  // ---------------------------------------------------------------------------
  // TIER 3: SUBSCRIBED ASPIRANT (ACTIVE PREMIUM ₹99/MO TIER)
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 5] Testing TIER 3: Subscribed Aspirant (Active Premium) Access...');
  const subToken = await adminAuth.createCustomToken(studentActiveSubUid);
  await signInWithCustomToken(clientAuth, subToken);

  const subPubFree = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Subscribed student reading free question');
  recordResult('Tier 3: Active Subscriber', 'SUB-01', 'Read published free question', subPubFree, 'Full access to free tier');

  const subPubPrem = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Subscribed student reading premium question');
  recordResult('Tier 3: Active Subscriber', 'SUB-02', 'Read published premium question', subPubPrem, 'Subscription authorization successful');

  const subPremManifest = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'ca_manifests/manifest_pub_prem_02'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Subscribed student reading premium manifest');
  recordResult('Tier 3: Active Subscriber', 'SUB-03', 'Read published premium manifest', subPremManifest, 'Subscribed access to premium manifests');

  const subDraft = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
  }, 'Subscribed student reading DRAFT question');
  recordResult('Tier 3: Active Subscriber', 'SUB-04', 'Blocked from DRAFT question', subDraft, 'Editorial drafts strictly withheld from subscribers');

  const subReview = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
  }, 'Subscribed student reading REVIEW_REQUIRED question');
  recordResult('Tier 3: Active Subscriber', 'SUB-05', 'Blocked from REVIEW_REQUIRED question', subReview, 'Uncertified content withheld from subscribers');

  const subRetracted = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_retracted_06'));
  }, 'Subscribed student reading retracted question');
  recordResult('Tier 3: Active Subscriber', 'SUB-06', 'Blocked from retracted question', subRetracted, 'Retracted content denied even to subscribers');

  const subContradictory = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_contradictory_08'));
  }, 'Subscribed student reading contradictory question');
  recordResult('Tier 3: Active Subscriber', 'SUB-07', 'Blocked from contradictory access metadata', subContradictory, 'Inconsistent metadata denied fail-closed');

  const subWrite = await expectDenied(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'), { correctOptionIndex: 2 });
  }, 'Subscribed student modifying question');
  recordResult('Tier 3: Active Subscriber', 'SUB-08', 'Answer-key modification blocked for subscribers', subWrite, 'Zero privilege escalation');

  // ---------------------------------------------------------------------------
  // TIER 4: EXPIRED SUBSCRIBER
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 6] Testing TIER 4: Expired Subscriber Access...');
  const expiredToken = await adminAuth.createCustomToken(studentExpiredSubUid);
  await signInWithCustomToken(clientAuth, expiredToken);

  const expPubFree = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_free_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Expired student reading free question');
  recordResult('Tier 4: Expired Subscriber', 'EXP-01', 'Read published free question', expPubFree, 'Free content accessible to expired users');

  const expPubPrem = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_pub_prem_02'));
  }, 'Expired student reading premium question');
  recordResult('Tier 4: Expired Subscriber', 'EXP-02', 'Blocked from published premium CA question', expPubPrem, 'Expired subscription promptly denied');

  const expPremManifest = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'ca_manifests/manifest_pub_prem_02'));
  }, 'Expired student reading premium manifest');
  recordResult('Tier 4: Expired Subscriber', 'EXP-03', 'Blocked from premium manifest', expPremManifest, 'Expired users denied premium manifests');

  const expDraft = await expectDenied(async () => {
    await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
  }, 'Expired student reading DRAFT question');
  recordResult('Tier 4: Expired Subscriber', 'EXP-04', 'Blocked from DRAFT question', expDraft, 'Drafts sealed from expired subscribers');

  // ---------------------------------------------------------------------------
  // TIER 5: ADMINISTRATIVE EDITORIAL USER
  // ---------------------------------------------------------------------------
  console.log('\n[Phase 7] Testing TIER 5: Administrative User (Editorial Workbench)...');
  const adminToken = await adminAuth.createCustomToken(adminUid, { admin: true });
  await signInWithCustomToken(clientAuth, adminToken);

  const adminReadDraft = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading DRAFT question');
  recordResult('Tier 5: Administrator', 'ADM-01', 'Full read access to DRAFT questions', adminReadDraft, 'Editorial review workbench access');

  const adminReadReview = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_review_04'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading REVIEW_REQUIRED question');
  recordResult('Tier 5: Administrator', 'ADM-02', 'Full read access to REVIEW_REQUIRED questions', adminReadReview, 'Editorial review workbench access');

  const adminReadRejected = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_rejected_05'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading REJECTED question');
  recordResult('Tier 5: Administrator', 'ADM-03', 'Full read access to REJECTED questions', adminReadRejected, 'Audit and provenance inspection');

  const adminReadRetracted = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions/ca_retracted_06'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin reading retracted question');
  recordResult('Tier 5: Administrator', 'ADM-04', 'Full read access to retracted questions', adminReadRetracted, 'Administrative oversight and post-mortem');

  const adminWriteQuestion = await expectAllowed(async () => {
    await updateDoc(doc(clientDb, 'currentAffairsQuestions/ca_draft_03'), {
      status: 'REVIEW_REQUIRED',
    });
  }, 'Admin updating question status');
  recordResult('Tier 5: Administrator', 'ADM-05', 'Admin write/approval permission', adminWriteQuestion, 'Editorial approval authorized');

  const adminStagingAccess = await expectAllowed(async () => {
    const snap = await getDoc(doc(clientDb, 'ca_draft_questions/staging_draft_01'));
    if (!snap.exists()) throw new Error('Doc not found');
  }, 'Admin accessing internal staging collection');
  recordResult('Tier 5: Administrator', 'ADM-06', 'Admin staging collection access', adminStagingAccess, 'Internal pipeline management');

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
