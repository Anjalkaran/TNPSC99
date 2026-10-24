import * as admin from 'firebase-admin';
import { execSync } from 'child_process';
import { initializeApp as initClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  getAuth as getClientAuth, 
  signInWithCustomToken, 
  signOut 
} from 'firebase/auth';

const PROJECT_ID = 'tnpsc99-staging';
const firebaseConfig = {
  projectId: PROJECT_ID,
  appId: "1:162149048616:web:c1358875dd93591fb9f01d",
  storageBucket: "tnpsc99-staging.firebasestorage.app",
  apiKey: "AIzaSyARSDGnuLZ2jQ5AxRsR1p1g7-tFWoBUFV8",
  authDomain: "tnpsc99-staging.firebaseapp.com",
  messagingSenderId: "162149048616"
};

// 1. Initialize Admin SDK
const privateKey = execSync('gcloud secrets versions access latest --secret=FIREBASE_PRIVATE_KEY --project=tnpsc99-staging', { encoding: 'utf8' }).trim();
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: PROJECT_ID,
      clientEmail: 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com',
      privateKey,
    })
  });
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();

// 2. Initialize Client SDK targeting live tnpsc99-staging
const clientApp = initClientApp(firebaseConfig, 'liveStagingTestApp');
const clientDb = getClientFirestore(clientApp);
const clientAuth = getClientAuth(clientApp);

let passedCount = 0;
let failedCount = 0;

function check(testName: string, passed: boolean, details: string) {
  if (passed) {
    passedCount++;
    console.log(`[✓ PASS] ${testName}`);
    console.log(`         Details: ${details}`);
  } else {
    failedCount++;
    console.error(`[✗ FAIL] ${testName}`);
    console.error(`         Details: ${details}`);
  }
}

async function runLiveRulesAudit() {
  console.log('========================================================================');
  console.log('GATE 2: LIVE FIRESTORE SECURITY RULES AUDIT (TARGET: tnpsc99-staging)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  // Step A: Seed test probe documents via Admin SDK
  console.log('[Setup] Seeding test documents via Admin SDK...');
  await adminDb.collection('currentAffairsQuestions').doc('ca_test_premium_01').set({
    id: 'ca_test_premium_01',
    status: 'PUBLISHED',
    accessLevel: 'premium',
    isFree: false,
    isRetracted: false,
    question_en: 'Premium Question Content'
  });

  await adminDb.collection('currentAffairsQuestions').doc('ca_test_retracted_01').set({
    id: 'ca_test_retracted_01',
    status: 'PUBLISHED',
    accessLevel: 'premium',
    isFree: false,
    isRetracted: true,
    question_en: 'Retracted Content'
  });

  await adminDb.collection('currentAffairsQuestions').doc('ca_test_missing_access').set({
    id: 'ca_test_missing_access',
    status: 'PUBLISHED',
    isRetracted: false,
    // accessLevel intentionally omitted
    // isFree intentionally omitted
    question_en: 'Missing Access Content'
  });

  await adminDb.collection('currentAffairsQuestions').doc('ca_test_inconsistent').set({
    id: 'ca_test_inconsistent',
    status: 'PUBLISHED',
    isFree: true,
    accessLevel: 'premium', // Inconsistent: isFree true but premium accessLevel
    isRetracted: false,
    question_en: 'Contradictory Metadata Content'
  });

  // Ensure user profiles exist in Firestore
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  await adminDb.collection('users').doc('user_free_01').set({
    role: 'student',
    subscriptionStatus: 'inactive'
  }, { merge: true });

  await adminDb.collection('users').doc('user_sub_01').set({
    role: 'student',
    subscriptionStatus: 'active',
    subscriptionExpires: admin.firestore.Timestamp.fromDate(future)
  }, { merge: true });

  await adminDb.collection('users').doc('user_expired_01').set({
    role: 'student',
    subscriptionStatus: 'expired',
    subscriptionExpires: admin.firestore.Timestamp.fromDate(past)
  }, { merge: true });

  await adminDb.collection('users').doc('user_admin_01').set({
    role: 'admin',
    isAdmin: true
  }, { merge: true });

  // Generate custom tokens
  const freeToken = await adminAuth.createCustomToken('user_free_01');
  const subToken = await adminAuth.createCustomToken('user_sub_01');
  const expiredToken = await adminAuth.createCustomToken('user_expired_01');
  const adminToken = await adminAuth.createCustomToken('user_admin_01', { admin: true, role: 'admin' });

  // ---------------------------------------------------------------------------
  // PERSONA 1: ANONYMOUS VISITOR
  // ---------------------------------------------------------------------------
  console.log('\n--- Persona 1: Anonymous Visitor ---');
  await signOut(clientAuth);

  // 1.1 Read explicitly free published question -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_pub_01'));
    check('Anonymous can read explicitly free published question', snap.exists() && snap.data()?.isFree === true, 'Successfully read ca_pub_01');
  } catch (err: any) {
    check('Anonymous can read explicitly free published question', false, err.message);
  }

  // 1.2 Read premium published question -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_premium_01'));
    check('Anonymous blocked from reading premium question', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Anonymous blocked from reading premium question', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // 1.3 Read quarantined draft -> DENY
  try {
    await getDoc(doc(clientDb, 'ca_drafts_quarantine', 'draft_review_01'));
    check('Anonymous blocked from reading quarantined review draft', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Anonymous blocked from reading quarantined review draft', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // 1.4 Write to currentAffairsQuestions -> DENY
  try {
    await setDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_pub_01'), { question_en: 'hacked' }, { merge: true });
    check('Anonymous blocked from modifying question content', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Anonymous blocked from modifying question content', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // ---------------------------------------------------------------------------
  // PERSONA 2: REGISTERED FREE STUDENT
  // ---------------------------------------------------------------------------
  console.log('\n--- Persona 2: Registered Free Student ---');
  await signInWithCustomToken(clientAuth, freeToken);

  // 2.1 Read free published question -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_pub_01'));
    check('Free student can read explicitly free published question', snap.exists(), 'Successfully read ca_pub_01');
  } catch (err: any) {
    check('Free student can read explicitly free published question', false, err.message);
  }

  // 2.2 Read premium question -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_premium_01'));
    check('Free student blocked from reading premium question', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Free student blocked from reading premium question', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // 2.3 Privilege escalation: attempt to elevate subscriptionStatus -> DENY
  try {
    await updateDoc(doc(clientDb, 'users', 'user_free_01'), { subscriptionStatus: 'premium' });
    check('Free student blocked from self-elevating subscription status', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Free student blocked from self-elevating subscription status', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // ---------------------------------------------------------------------------
  // PERSONA 3: ACTIVE PREMIUM SUBSCRIBER
  // ---------------------------------------------------------------------------
  console.log('\n--- Persona 3: Active Premium Subscriber ---');
  await signInWithCustomToken(clientAuth, subToken);

  // 3.1 Read free question -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_pub_01'));
    check('Active subscriber can read free question', snap.exists(), 'Successfully read ca_pub_01');
  } catch (err: any) {
    check('Active subscriber can read free question', false, err.message);
  }

  // 3.2 Read premium question -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_premium_01'));
    check('Active subscriber can read premium question', snap.exists() && snap.data()?.accessLevel === 'premium', 'Successfully read ca_test_premium_01');
  } catch (err: any) {
    check('Active subscriber can read premium question', false, err.message);
  }

  // 3.3 Read retracted question -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_retracted_01'));
    check('Active subscriber blocked from reading retracted question', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Active subscriber blocked from reading retracted question', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // ---------------------------------------------------------------------------
  // PERSONA 4: EXPIRED SUBSCRIBER
  // ---------------------------------------------------------------------------
  console.log('\n--- Persona 4: Expired Subscriber ---');
  await signInWithCustomToken(clientAuth, expiredToken);

  // 4.1 Read free question -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_pub_01'));
    check('Expired subscriber can read free question', snap.exists(), 'Successfully read ca_pub_01');
  } catch (err: any) {
    check('Expired subscriber can read free question', false, err.message);
  }

  // 4.2 Read premium question -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_premium_01'));
    check('Expired subscriber blocked from reading premium question', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Expired subscriber blocked from reading premium question', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // ---------------------------------------------------------------------------
  // FAIL-CLOSED ATTRIBUTE INTEGRITY CHECKS
  // ---------------------------------------------------------------------------
  console.log('\n--- Fail-Closed Attribute Integrity ---');
  // 5.1 Read missing access metadata -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_missing_access'));
    check('Missing access metadata denies access fail-closed', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Missing access metadata denies access fail-closed', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // 5.2 Read contradictory access metadata (isFree: true, accessLevel: 'premium') -> DENY
  try {
    await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_inconsistent'));
    check('Contradictory access metadata denies access fail-closed', false, 'Allowed unexpectedly');
  } catch (err: any) {
    check('Contradictory access metadata denies access fail-closed', err.code === 'permission-denied', `Denied: ${err.code}`);
  }

  // ---------------------------------------------------------------------------
  // PERSONA 5: EDITORIAL ADMIN
  // ---------------------------------------------------------------------------
  console.log('\n--- Persona 5: Editorial Admin ---');
  await signInWithCustomToken(clientAuth, adminToken);

  // 6.1 Admin can read quarantined draft -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'ca_drafts_quarantine', 'draft_review_01'));
    check('Admin can read quarantined review drafts', snap.exists(), 'Successfully read draft_review_01');
  } catch (err: any) {
    check('Admin can read quarantined review drafts', false, err.message);
  }

  // 6.2 Admin can read retracted item -> ALLOW
  try {
    const snap = await getDoc(doc(clientDb, 'currentAffairsQuestions', 'ca_test_retracted_01'));
    check('Admin can read retracted questions', snap.exists(), 'Successfully read ca_test_retracted_01');
  } catch (err: any) {
    check('Admin can read retracted questions', false, err.message);
  }

  // Step C: Cleanup test probe documents
  console.log('\n[Teardown] Cleaning up test probe documents via Admin SDK...');
  await adminDb.collection('currentAffairsQuestions').doc('ca_test_premium_01').delete();
  await adminDb.collection('currentAffairsQuestions').doc('ca_test_retracted_01').delete();
  await adminDb.collection('currentAffairsQuestions').doc('ca_test_missing_access').delete();
  await adminDb.collection('currentAffairsQuestions').doc('ca_test_inconsistent').delete();

  console.log('\n========================================================================');
  console.log(`LIVE FIRESTORE RULES AUDIT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLiveRulesAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
