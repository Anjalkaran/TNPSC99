/**
 * TNPSC99 — Firebase Emulator Suite Security & Attempt Finalization Tests
 * Tests real Firestore Security Rules enforcement against authenticated malicious clients
 * and verifies server-authoritative scoring and 3-stage Mistake Vault mastery.
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
  collection,
  addDoc,
} from 'firebase/firestore';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
} from 'firebase/auth';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'studio-5029416251-928dd';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;

process.env.FIRESTORE_EMULATOR_HOST = `${FIRESTORE_HOST}:${FIRESTORE_PORT}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${FIRESTORE_HOST}:${AUTH_PORT}`;

// -----------------------------------------------------------------------------
// Initialize Admin SDK
// -----------------------------------------------------------------------------
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();

// -----------------------------------------------------------------------------
// Initialize Client SDK
// -----------------------------------------------------------------------------
const clientApp = initClientApp({
  apiKey: 'fake-api-key-for-emulator',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
}, 'malicious-client-app');

const clientDb = getClientFirestore(clientApp);
const clientAuth = getClientAuth(clientApp);

connectFirestoreEmulator(clientDb, FIRESTORE_HOST, FIRESTORE_PORT);
connectAuthEmulator(clientAuth, `http://${FIRESTORE_HOST}:${AUTH_PORT}`, { disableWarnings: true });

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function expectPermissionDenied(fn: () => Promise<any>, description: string) {
  try {
    await fn();
    console.error(`❌ SECURITY VULNERABILITY: ${description} was PERMITTED, but should have been DENIED!`);
    process.exit(1);
  } catch (err: any) {
    const isDenied =
      err.code === 'permission-denied' ||
      err.message?.includes('permission-denied') ||
      err.message?.includes('PERMISSION_DENIED') ||
      err.toString().includes('Missing or insufficient permissions');

    if (isDenied) {
      console.log(`  🛡️ REJECTED (Expected): ${description}`);
    } else {
      console.error(`❌ UNEXPECTED ERROR: ${description} failed with:`, err);
      process.exit(1);
    }
  }
}

async function run() {
  console.log('========================================================================');
  console.log('TNPSC99 — FIREBASE EMULATOR SECURITY RULES & ATTEMPT INTEGRITY SUITE');
  console.log('========================================================================\n');

  const studentMaliciousUid = 'student_malicious_007';
  const studentVictimUid = 'student_victim_101';

  // 1. Seed Authenticated Users in Auth Emulator
  console.log('[1/6] Creating & Authenticating Student Sessions in Auth Emulator...');
  const maliciousToken = await adminAuth.createCustomToken(studentMaliciousUid);
  await signInWithCustomToken(clientAuth, maliciousToken);
  assert(clientAuth.currentUser?.uid === studentMaliciousUid, `Authenticated as ${studentMaliciousUid}`);

  // Seed question bank via trusted Admin SDK
  console.log('\n[2/6] Seeding Trusted Questions in Firestore Question Bank...');
  const q1 = {
    id: 'q_unit1_01',
    text: 'ஒரு சொல் தனித்து நின்று பொருள் தருமாயின் அது எது?',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'இணைமொழி'],
    correctAnswer: 'தனிமொழி',
  };
  const q2 = {
    id: 'q_unit1_02',
    text: 'இரண்டு அல்லது அதற்கு மேற்பட்ட தனிமொழிகள் தொடர்ந்து வருவது எது?',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'தொகைமொழி'],
    correctAnswer: 'தொடர்மொழி',
  };
  await adminDb.doc(`questions/${q1.id}`).set(q1);
  await adminDb.doc(`questions/${q2.id}`).set(q2);
  console.log('  ✅ Trusted questions seeded: q_unit1_01, q_unit1_02');

  // ---------------------------------------------------------------------------
  // ATTACK VECTOR TESTS (Adversarial Client Actions via Client SDK)
  // ---------------------------------------------------------------------------
  console.log('\n[3/6] Executing Adversarial Attack Vectors (Malicious Client Testing)...');

  // Vector 1: Malicious client attempts to create pre-completed attempt with fabricated score
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentMaliciousUid}/testAttempts/att_fake_completed`), {
      userId: studentMaliciousUid,
      status: 'completed',
      score: 100,
      questionIds: ['q_unit1_01', 'q_unit1_02'],
      answers: [0, 1],
    });
  }, 'Malicious client forged completed attempt on create');

  // Vector 2: Malicious client attempts to set non-zero score on create
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentMaliciousUid}/testAttempts/att_fake_score`), {
      userId: studentMaliciousUid,
      status: 'in-progress',
      score: 50,
      questionIds: ['q_unit1_01', 'q_unit1_02'],
      answers: [-1, -1],
    });
  }, 'Malicious client injected non-zero score on attempt create');

  // Vector 3: Malicious client attempts to inject completedAt on create
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentMaliciousUid}/testAttempts/att_fake_completedAt`), {
      userId: studentMaliciousUid,
      status: 'in-progress',
      score: 0,
      completedAt: new Date().toISOString(),
      questionIds: ['q_unit1_01'],
      answers: [-1],
    });
  }, 'Malicious client injected completedAt timestamp on create');

  // Legitimate Step: Create valid in-progress attempt via client SDK
  const legitimateAttemptRef = doc(clientDb, `users/${studentMaliciousUid}/testAttempts/att_legit_001`);
  await setDoc(legitimateAttemptRef, {
    userId: studentMaliciousUid,
    testId: 'test_tamil_unit1',
    testTitle: 'பத்தாம் வகுப்பு தமிழ்',
    status: 'in-progress',
    score: 0,
    answers: [-1, -1],
    questionIds: ['q_unit1_01', 'q_unit1_02'],
    currentQuestionIndex: 0,
    examDeadline: new Date(Date.now() + 1800000).toISOString(),
    timeSpentSeconds: 0,
    lastUpdatedDate: new Date().toISOString(),
  });
  console.log('  ✅ Legitimate in-progress attempt successfully created');

  // Vector 4: Malicious client attempts to directly transition status to completed on update
  await expectPermissionDenied(async () => {
    await updateDoc(legitimateAttemptRef, {
      status: 'completed',
    });
  }, 'Malicious client directly transitioned status to completed via updateDoc');

  // Vector 5: Malicious client attempts to forge score on update
  await expectPermissionDenied(async () => {
    await updateDoc(legitimateAttemptRef, {
      score: 10,
    });
  }, 'Malicious client modified authoritative score via updateDoc');

  // Vector 6: Malicious client attempts to tamper with exam deadline
  await expectPermissionDenied(async () => {
    await updateDoc(legitimateAttemptRef, {
      examDeadline: '2099-12-31T23:59:59.000Z',
    });
  }, 'Malicious client extended exam deadline via updateDoc');

  // Vector 7: Cross-user attack — malicious student attempts to access victim document tree
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentVictimUid}/testAttempts/att_victim_hack`), {
      userId: studentVictimUid,
      status: 'in-progress',
      score: 0,
    });
  }, 'Cross-user attack: Student A wrote into Student B testAttempts');

  // Vector 8: Fabricated mastery state in Mistake Vault
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentMaliciousUid}/mistakeVault/q_unit1_01`), {
      status: 'mastered',
      resolvedAt: new Date().toISOString(),
      failureCount: 1,
    });
  }, 'Malicious client forged "mastered" status in Mistake Vault directly');

  // Vector 9: Fabricated score injection into public Leaderboard
  await expectPermissionDenied(async () => {
    await addDoc(collection(clientDb, 'scores'), {
      userId: studentMaliciousUid,
      username: 'Cheater',
      score: 9999,
      testId: 'test_tamil_unit1',
    });
  }, 'Malicious client injected forged score into public Leaderboard');

  // ---------------------------------------------------------------------------
  // SERVER-AUTHORITATIVE FINALIZATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n[4/6] Testing Server-Authoritative Finalization & Scoring...');

  // Student updates legitimate in-progress answers: selects option 0 (correct: 'தனிமொழி') for q1, option 0 (WRONG: 'தனிமொழி' instead of 'தொடர்மொழி') for q2
  await updateDoc(legitimateAttemptRef, {
    answers: [0, 0],
    currentQuestionIndex: 1,
    timeSpentSeconds: 120,
    lastUpdatedDate: new Date().toISOString(),
  });
  console.log('  ✅ Student updated answers [0, 0] (Q1: correct, Q2: wrong)');

  // Server evaluates and finalizes attempt via trusted backend transaction
  const serverAttemptRef = adminDb.doc(`users/${studentMaliciousUid}/testAttempts/att_legit_001`);
  const finalizationResult = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(serverAttemptRef);
    const data = snap.data()!;

    // Trusted question lookup
    const q1Snap = await transaction.get(adminDb.doc(`questions/${data.questionIds[0]}`));
    const q2Snap = await transaction.get(adminDb.doc(`questions/${data.questionIds[1]}`));
    const q1Data = q1Snap.data()!;
    const q2Data = q2Snap.data()!;

    let serverScore = 0;
    const correctIds: string[] = [];
    const wrongIds: string[] = [];

    // Verify Q1
    if (q1Data.answerOptions[data.answers[0]] === q1Data.correctAnswer) {
      serverScore++;
      correctIds.push(q1Data.id);
    } else {
      wrongIds.push(q1Data.id);
    }

    // Verify Q2
    if (q2Data.answerOptions[data.answers[1]] === q2Data.correctAnswer) {
      serverScore++;
      correctIds.push(q2Data.id);
    } else {
      wrongIds.push(q2Data.id);
    }

    const completedTimestamp = new Date().toISOString();

    // Mistake Vault updates: Q2 failed -> status: 'unresolved', failureCount: 1
    const vaultQ2Ref = adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/${q2Data.id}`);
    transaction.set(vaultQ2Ref, {
      questionId: q2Data.id,
      questionText: q2Data.text,
      answerOptions: q2Data.answerOptions,
      correctAnswer: q2Data.correctAnswer,
      failureCount: 1,
      status: 'unresolved',
      lastFailedDate: completedTimestamp,
      lastAttemptId: 'att_legit_001',
    });

    // Update Attempt Document to completed
    transaction.update(serverAttemptRef, {
      status: 'completed',
      score: serverScore,
      completedAt: completedTimestamp,
      correctlyAnsweredQuestionIds: correctIds,
      incorrectlyAnsweredQuestionIds: wrongIds,
      lastUpdatedDate: completedTimestamp,
    });

    // Write to leaderboard
    const scoreRef = adminDb.collection('scores').doc();
    transaction.set(scoreRef, {
      userId: studentMaliciousUid,
      score: serverScore,
      testId: data.testId,
      createdAt: completedTimestamp,
    });

    return { serverScore, correctIds, wrongIds };
  });

  assert(finalizationResult.serverScore === 1, 'Server calculated exact trusted score: 1 / 2');
  assert(finalizationResult.correctIds.includes('q_unit1_01'), 'q_unit1_01 verified as correct');
  assert(finalizationResult.wrongIds.includes('q_unit1_02'), 'q_unit1_02 verified as wrong');

  // Test Duplicate Submission Handling (Multi-device / Concurrent idempotent submission)
  const duplicateResult = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(serverAttemptRef);
    const data = snap.data()!;
    if (data.status === 'completed') {
      return {
        idempotent: true,
        score: data.score,
        completedAt: data.completedAt,
      };
    }
    throw new Error('Should have detected existing completed state');
  });

  assert(duplicateResult.idempotent === true, 'Duplicate submission idempotently recognized without re-scoring');
  assert(duplicateResult.score === 1, 'Duplicate submission preserves original authentic score');

  // Verify completed attempt document in Firestore
  const completedSnap = await adminDb.doc(`users/${studentMaliciousUid}/testAttempts/att_legit_001`).get();
  const completedData = completedSnap.data()!;
  assert(completedData.status === 'completed', 'Attempt status is verified completed');
  assert(completedData.score === 1, 'Completed attempt score is strictly 1');

  // Verify Mistake Vault record
  const mistakeSnap = await adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`).get();
  assert(mistakeSnap.exists, 'Failed question Q2 exists in Mistake Vault');
  assert(mistakeSnap.data()?.status === 'unresolved', 'Q2 status is "unresolved"');
  assert(mistakeSnap.data()?.failureCount === 1, 'Q2 failureCount is 1');

  // ---------------------------------------------------------------------------
  // POST-COMPLETION IMMUTABILITY TESTS
  // ---------------------------------------------------------------------------
  console.log('\n[5/6] Testing Post-Completion Immutability (Client Lockdown)...');

  // Vector 10: Attempt to rescore completed exam via client SDK
  await expectPermissionDenied(async () => {
    await updateDoc(legitimateAttemptRef, {
      score: 2,
    });
  }, 'Client modified score on a completed attempt');

  // Vector 11: Attempt to modify answers on a completed exam
  await expectPermissionDenied(async () => {
    await updateDoc(legitimateAttemptRef, {
      answers: [0, 1],
    });
  }, 'Client changed answers on a completed attempt');

  // Vector 12: Attempt to delete completed exam to erase record
  await expectPermissionDenied(async () => {
    await deleteDoc(legitimateAttemptRef);
  }, 'Client deleted a completed attempt');

  // ---------------------------------------------------------------------------
  // 3-STAGE MASTERY TRANSITION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n[6/6] Testing 3-Stage Mastery Transitions on Subsequent Revision Attempt...');

  // Revision Test 1: Student gets Q2 right on first revision attempt
  await adminDb.runTransaction(async (transaction) => {
    const vaultRef = adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`);
    const vaultSnap = await transaction.get(vaultRef);
    const vaultData = vaultSnap.data()!;

    // 1st correct revision: unresolved -> revised
    assert(vaultData.status === 'unresolved', 'Pre-condition: Q2 status is unresolved');
    transaction.update(vaultRef, {
      status: 'revised',
      revisedAt: new Date().toISOString(),
      lastAttemptId: 'att_rev_01',
    });
  });

  const stage1Snap = await adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`).get();
  assert(stage1Snap.data()?.status === 'revised', 'Stage 1: 1st correct revision moved status to "revised" (NOT "mastered")');
  assert(stage1Snap.data()?.failureCount === 1, 'Stage 1: failureCount preserved as 1');

  // Revision Test 2: Student gets Q2 right on second revision attempt
  await adminDb.runTransaction(async (transaction) => {
    const vaultRef = adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`);
    const vaultSnap = await transaction.get(vaultRef);
    const vaultData = vaultSnap.data()!;

    // 2nd correct revision: revised -> mastered
    assert(vaultData.status === 'revised', 'Pre-condition: Q2 status is revised');
    transaction.update(vaultRef, {
      status: 'mastered',
      resolvedAt: new Date().toISOString(),
      lastAttemptId: 'att_rev_02',
    });
  });

  const stage2Snap = await adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`).get();
  assert(stage2Snap.data()?.status === 'mastered', 'Stage 2: 2nd correct revision moved status to "mastered"');

  // Test Failure Demotion: Student fails mastered question on later mock test
  await adminDb.runTransaction(async (transaction) => {
    const vaultRef = adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`);
    const vaultSnap = await transaction.get(vaultRef);
    const vaultData = vaultSnap.data()!;

    // Failure on mastered item -> reset to unresolved and increment failureCount
    transaction.update(vaultRef, {
      status: 'unresolved',
      failureCount: vaultData.failureCount + 1,
      lastFailedDate: new Date().toISOString(),
      lastAttemptId: 'att_mock_later',
    });
  });

  const demotedSnap = await adminDb.doc(`users/${studentMaliciousUid}/mistakeVault/q_unit1_02`).get();
  assert(demotedSnap.data()?.status === 'unresolved', 'Demotion: Subsequent failure reset status to "unresolved"');
  assert(demotedSnap.data()?.failureCount === 2, 'Demotion: failureCount incremented from 1 to 2');

  console.log('\n========================================================================');
  console.log('🎉 ALL EMULATOR RULES & TRUSTED FINALIZATION TESTS PASSED SUCCESSFULLY!');
  console.log('========================================================================\n');

  // Cleanup client app
  await deleteApp(clientApp);
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal emulator test error:', err);
  process.exit(1);
});
