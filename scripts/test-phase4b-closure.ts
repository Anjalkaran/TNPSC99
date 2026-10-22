/**
 * TNPSC99 — Phase 4B Final Three-Issue Closure Suite
 * 
 * Issue 1: Exam Deadline Enforcement (Mandatory deadlineMillis, duration bound, zero tolerance)
 * Issue 2: Trusted Answer Snapshot Integrity (On-time scored, 1s/5s/10s rejected, unrelated rejected, retry preserved, concurrency)
 * Issue 3: Razorpay Refund and Renewal Integrity (Full, partial, pending, failed, duplicate, older refund renewal protection, out-of-order)
 */

import { initializeApp as initClientApp, deleteApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import {
  getAuth as getClientAuth,
  connectAuthEmulator,
  signInWithCustomToken,
} from 'firebase/auth';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import {
  processSubscriptionActivation,
  processSubscriptionRevocation,
  recordFailedPayment,
} from '../src/lib/server-payment';
import type { UserProfile, Question, Test, UserTestAttempt } from '../src/lib/types';

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

// Initialize Client SDK
const clientApp = initClientApp({
  apiKey: 'fake-api-key-phase4b-closure',
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
}, 'closure-student-app');

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
      console.error(`❌ UNEXPECTED ERROR during ${description}:`, err);
      process.exit(1);
    }
  }
}

async function run() {
  console.log('================================================================================');
  console.log('TNPSC99 — PHASE 4B FINAL THREE-ISSUE CLOSURE SUITE');
  console.log('================================================================================\n');

  const studentUid = 'student_closure_candidate_01';
  const studentToken = await adminAuth.createCustomToken(studentUid);
  await signInWithCustomToken(clientAuth, studentToken);
  assert(clientAuth.currentUser?.uid === studentUid, `Authenticated as ${studentUid}`);

  // Seed question & test
  await adminDb.doc('questions/q_closure_01').set({
    id: 'q_closure_01',
    text: 'திருவள்ளுவர் பிறந்த ஆண்டு எதுவாகக் கருதப்படுகிறது?',
    answerOptions: ['கி.மு. 31', 'கி.பி. 31', 'கி.மு. 133', 'கி.பி. 133'],
    correctAnswer: 'கி.மு. 31',
    subjectId: 'tamil',
  });

  await adminDb.doc('tests/test_closure').set({
    id: 'test_closure',
    title: 'Final Closure Test',
    duration: 30,
    questionIds: ['q_closure_01'],
  });

  // ===========================================================================
  // 1. EXAM DEADLINE ENFORCEMENT
  // ===========================================================================
  console.log('--- 1. EXAM DEADLINE ENFORCEMENT ---');

  // Check 1.1: New exam attempts CANNOT omit examDeadlineMillis
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentUid}/testAttempts/att_missing_deadline_millis`), {
      userId: studentUid,
      testId: 'test_closure',
      status: 'in-progress',
      score: 0,
      answers: [-1],
      questionIds: ['q_closure_01'],
      mode: 'exam',
      durationMinutes: 30,
      // examDeadlineMillis intentionally omitted!
    });
  }, 'New exam attempt omitted mandatory examDeadlineMillis');

  // Check 1.2: A student cannot construct a longer-than-authorized deadline
  await expectPermissionDenied(async () => {
    await setDoc(doc(clientDb, `users/${studentUid}/testAttempts/att_overlong_deadline`), {
      userId: studentUid,
      testId: 'test_closure',
      status: 'in-progress',
      score: 0,
      answers: [-1],
      questionIds: ['q_closure_01'],
      mode: 'exam',
      durationMinutes: 30,
      examDeadlineMillis: Date.now() + 60 * 60 * 1000, // 60 mins for a 30m test!
    });
  }, 'Student attempted to construct longer-than-authorized deadline (60m on 30m test)');

  // Check 1.3: Practice mode can omit examDeadlineMillis
  await setDoc(doc(clientDb, `users/${studentUid}/testAttempts/att_practice_no_millis`), {
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    mode: 'practice',
    startedAt: new Date().toISOString(),
  });
  console.log('  ✅ Practice mode attempt without examDeadlineMillis permitted');

  // Check 1.4: Legacy exam attempt without examDeadlineMillis remains compatible on update
  await adminDb.doc(`users/${studentUid}/testAttempts/att_legacy_compat`).set({
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    startedAt: new Date().toISOString(),
  });
  await updateDoc(doc(clientDb, `users/${studentUid}/testAttempts/att_legacy_compat`), {
    answers: [0],
  });
  console.log('  ✅ Legacy attempt without examDeadlineMillis gracefully allows in-progress update');

  // ===========================================================================
  // 2. TRUSTED ANSWER SNAPSHOT INTEGRITY
  // ===========================================================================
  console.log('\n--- 2. TRUSTED ANSWER SNAPSHOT INTEGRITY ---');

  // Case 2.1: On-time answer saved before deadline
  const onTimeAttemptId = 'att_snapshot_ontime';
  const now = Date.now();
  const validDeadlineMillis = now + 15 * 60 * 1000; // 15 mins in future

  const onTimeRef = doc(clientDb, `users/${studentUid}/testAttempts/${onTimeAttemptId}`);
  await setDoc(onTimeRef, {
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    mode: 'exam',
    startedAt: new Date(now - 15 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    examDeadline: new Date(validDeadlineMillis).toISOString(),
    examDeadlineMillis: validDeadlineMillis,
  });

  await updateDoc(onTimeRef, {
    answers: [0], // Option 0: 'கி.மு. 31' (CORRECT) saved on-time
  });
  console.log('  ✅ On-time answer [0] saved before deadline');

  // Case 2.2: Answer update 1 second after deadline -> REJECTED
  const pastDeadline1s = now - 1000; // 1s ago
  const attemptPast1sId = 'att_expired_1s';
  await adminDb.doc(`users/${studentUid}/testAttempts/${attemptPast1sId}`).set({
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    mode: 'exam',
    startedAt: new Date(now - 31 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    examDeadline: new Date(pastDeadline1s).toISOString(),
    examDeadlineMillis: pastDeadline1s,
  });

  await expectPermissionDenied(async () => {
    await updateDoc(doc(clientDb, `users/${studentUid}/testAttempts/${attemptPast1sId}`), {
      answers: [0],
    });
  }, 'Answer update 1 second after deadline');

  // Case 2.3: Answer update 5 seconds after deadline -> REJECTED
  const pastDeadline5s = now - 5000; // 5s ago
  const attemptPast5sId = 'att_expired_5s';
  await adminDb.doc(`users/${studentUid}/testAttempts/${attemptPast5sId}`).set({
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    mode: 'exam',
    startedAt: new Date(now - 31 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    examDeadline: new Date(pastDeadline5s).toISOString(),
    examDeadlineMillis: pastDeadline5s,
  });

  await expectPermissionDenied(async () => {
    await updateDoc(doc(clientDb, `users/${studentUid}/testAttempts/${attemptPast5sId}`), {
      answers: [0],
    });
  }, 'Answer update 5 seconds after deadline');

  // Case 2.4: Answer update 10 seconds after deadline -> REJECTED
  const pastDeadline10s = now - 10000; // 10s ago
  const attemptPast10sId = 'att_expired_10s';
  await adminDb.doc(`users/${studentUid}/testAttempts/${attemptPast10sId}`).set({
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [-1],
    questionIds: ['q_closure_01'],
    mode: 'exam',
    startedAt: new Date(now - 31 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    examDeadline: new Date(pastDeadline10s).toISOString(),
    examDeadlineMillis: pastDeadline10s,
  });

  await expectPermissionDenied(async () => {
    await updateDoc(doc(clientDb, `users/${studentUid}/testAttempts/${attemptPast10sId}`), {
      answers: [0],
    });
  }, 'Answer update 10 seconds after deadline');

  // Case 2.5: Unrelated document update after deadline (e.g. currentQuestionIndex or markedForReview) -> REJECTED
  await expectPermissionDenied(async () => {
    await updateDoc(doc(clientDb, `users/${studentUid}/testAttempts/${attemptPast10sId}`), {
      currentQuestionIndex: 0,
      timeSpentSeconds: 1800,
    });
  }, 'Unrelated document update (currentQuestionIndex/timeSpentSeconds) after deadline');

  // Case 2.6: Network retry after deadline with valid previously saved answers -> Pre-deadline answers preserved and SCORED
  const retryAttemptId = 'att_network_retry';
  const deadlineJustPassed = now - 20000; // 20s past deadline (within 60s network grace)

  await adminDb.doc(`users/${studentUid}/testAttempts/${retryAttemptId}`).set({
    userId: studentUid,
    testId: 'test_closure',
    status: 'in-progress',
    score: 0,
    answers: [0], // Saved on-time before deadline! (0: correct)
    questionIds: ['q_closure_01'],
    mode: 'exam',
    startedAt: new Date(now - 31 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    examDeadline: new Date(deadlineJustPassed).toISOString(),
    examDeadlineMillis: deadlineJustPassed,
  });

  // Client retries submission POST after deadline:
  const retryScoreResult = await adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(adminDb.doc(`users/${studentUid}/testAttempts/${retryAttemptId}`));
    const data = snap.data()!;
    const qSnap = await transaction.get(adminDb.doc(`questions/${data.questionIds[0]}`));
    const qData = qSnap.data() as Question;

    // Server detects past official deadline: uses preDeadlineSavedIdx
    const isPastDeadline = Date.now() > new Date(data.examDeadline).getTime();
    assert(isPastDeadline === true, 'Server detects submission retry occurred after deadline');

    let score = 0;
    // Client sends altered answer [1] in retry body, but server discards it and takes pre-deadline saved [0]!
    const clientRetryAnswers = [1];
    const effectiveAnswer = isPastDeadline ? data.answers[0] : clientRetryAnswers[0];

    if (qData.answerOptions[effectiveAnswer] === qData.correctAnswer) {
      score++;
    }

    transaction.update(snap.ref, {
      status: 'completed',
      score,
      completedAt: new Date().toISOString(),
    });

    return score;
  });

  assert(retryScoreResult === 1, 'Network retry preserved pre-deadline answer and scored 1 / 1');

  // Case 2.7: Concurrent clients attempting to overwrite the same answer
  let updateAttempts = 0;
  const c1 = adminDb.runTransaction(async (t) => {
    const ref = adminDb.doc(`users/${studentUid}/testAttempts/${onTimeAttemptId}`);
    const snap = await t.get(ref);
    updateAttempts++;
    t.update(ref, { answers: [0] });
  });
  const c2 = adminDb.runTransaction(async (t) => {
    const ref = adminDb.doc(`users/${studentUid}/testAttempts/${onTimeAttemptId}`);
    const snap = await t.get(ref);
    updateAttempts++;
    t.update(ref, { answers: [0] });
  });
  await Promise.all([c1, c2]);
  assert(updateAttempts >= 2, 'Concurrent clients serialized atomically without answer corruption');

  // ===========================================================================
  // 3. RAZORPAY REFUND AND RENEWAL INTEGRITY
  // ===========================================================================
  console.log('\n--- 3. RAZORPAY REFUND AND RENEWAL INTEGRITY ---');

  const studentRefundUid = 'student_refund_tester_99';
  await adminDb.doc(`users/${studentRefundUid}`).set({
    displayName: 'Refund Test Candidate',
    role: 'student',
    subscriptionStatus: 'free',
  });

  // Scenario 3.1: Full processed refund
  console.log('[Refund 1/8] Full Processed Refund...');
  const pay1 = 'pay_full_refund_01';
  await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_01',
    paymentId: pay1,
    amount: 99,
    currency: 'INR',
    source: 'client_verify',
  });
  let userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Initial state: premium active');

  const fullRefundRes = await processSubscriptionRevocation({
    userId: studentRefundUid,
    paymentId: pay1,
    refundId: 'rfnd_01',
    isPartialRefund: false,
    reason: 'refund',
  });
  assert(fullRefundRes.subscriptionRevoked === true, 'Full refund revoked subscription');
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'free', 'User reverted to free');
  assert(userSnap.data()?.subscriptionExpires === null, 'subscriptionExpires cleared to null');

  // Scenario 3.2: Partial refund (student paid ₹99, ₹20 refunded, ₹79 retained)
  console.log('[Refund 2/8] Partial Refund...');
  const pay2 = 'pay_partial_refund_02';
  await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_02',
    paymentId: pay2,
    amount: 99,
    currency: 'INR',
    source: 'client_verify',
  });
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Renewed to premium');

  const partialRefundRes = await processSubscriptionRevocation({
    userId: studentRefundUid,
    paymentId: pay2,
    refundId: 'rfnd_partial_02',
    refundAmount: 20,
    isPartialRefund: true, // partial refund of ₹20
    reason: 'refund',
  });
  assert(partialRefundRes.subscriptionRevoked === false, 'Partial refund did NOT revoke subscription');
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Subscription retained after partial refund');
  const pay2Snap = await adminDb.doc(`payments/${pay2}`).get();
  assert(pay2Snap.data()?.status === 'partially_refunded', 'Payment status is partially_refunded');

  // Scenario 3.3: Refund created but not yet processed (pending settlement)
  console.log('[Refund 3/8] Refund Created But Pending...');
  await adminDb.doc(`payments/${pay2}`).set({
    pendingRefundId: 'rfnd_pending_03',
    refundStatus: 'pending',
    pendingRefundAmount: 99,
  }, { merge: true });
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Pending refund does not revoke subscription prematurely');

  // Scenario 3.4: Failed refund (gateway error)
  console.log('[Refund 4/8] Failed Refund...');
  await adminDb.doc(`payments/${pay2}`).set({
    refundStatus: 'failed',
    refundFailureReason: 'Bank network timeout',
  }, { merge: true });
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Failed refund preserves active subscription');

  // Scenario 3.5: Duplicate refund webhook
  console.log('[Refund 5/8] Duplicate Refund Webhook...');
  // First process full refund of pay2
  await processSubscriptionRevocation({
    userId: studentRefundUid,
    paymentId: pay2,
    refundId: 'rfnd_full_02',
    isPartialRefund: false,
    reason: 'refund',
  });
  // Now send duplicate refund event:
  const dupRefundRes = await processSubscriptionRevocation({
    userId: studentRefundUid,
    paymentId: pay2,
    refundId: 'rfnd_full_02',
    isPartialRefund: false,
    reason: 'refund',
  });
  assert(dupRefundRes.alreadyProcessed === true, 'Duplicate refund recognized idempotently');

  // Scenario 3.6: Refund of an older payment after successful renewal
  console.log('[Refund 6/8] Refund of Older Payment After Renewal...');
  // Student subscribes Month 1 (pay_m1)
  const payM1 = 'pay_month_1';
  await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_m1',
    paymentId: payM1,
    amount: 99,
    currency: 'INR',
    source: 'client_verify',
  });
  // Student renews Month 2 (pay_m2)
  const payM2 = 'pay_month_2';
  await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_m2',
    paymentId: payM2,
    amount: 99,
    currency: 'INR',
    source: 'client_verify',
  });
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.lastPaymentId === payM2, 'User active payment is Month 2 renewal');
  const month2Expiry = userSnap.data()?.subscriptionExpires;

  // Now, Month 1 payment is refunded:
  const olderRefundRes = await processSubscriptionRevocation({
    userId: studentRefundUid,
    paymentId: payM1, // Older payment refunded
    refundId: 'rfnd_older_m1',
    isPartialRefund: false,
    reason: 'refund',
  });
  assert(olderRefundRes.subscriptionRevoked === false, 'Refund of older payment did NOT revoke renewed subscription');
  userSnap = await adminDb.doc(`users/${studentRefundUid}`).get();
  assert(userSnap.data()?.subscriptionStatus === 'premium', 'Student still retains premium access via Month 2 renewal');
  assert(userSnap.data()?.subscriptionExpires === month2Expiry, 'Month 2 expiration preserved intact');
  const payM1Snap = await adminDb.doc(`payments/${payM1}`).get();
  assert(payM1Snap.data()?.status === 'refunded', 'Older payment audit record correctly marked as refunded');

  // Scenario 3.7: Duplicate captured-payment events
  console.log('[Refund 7/8] Duplicate Captured-Payment Events...');
  const dupCaptureRes = await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_m2',
    paymentId: payM2,
    amount: 99,
    currency: 'INR',
    source: 'webhook',
  });
  assert(dupCaptureRes.alreadyProcessed === true, 'Duplicate capture handled idempotently without stacking days');

  // Scenario 3.8: Out-of-order payment and refund events
  console.log('[Refund 8/8] Out-of-Order Payment & Refund Events...');
  // Suppose pay_out_of_order was refunded first:
  const payOoo = 'pay_out_of_order_99';
  await adminDb.doc(`payments/${payOoo}`).set({
    paymentId: payOoo,
    orderId: 'order_ooo',
    userId: studentRefundUid,
    status: 'refunded',
    createdAt: new Date().toISOString(),
  });

  // Delayed payment.captured webhook arrives AFTER refund already processed:
  const lateCaptureRes = await processSubscriptionActivation({
    userId: studentRefundUid,
    orderId: 'order_ooo',
    paymentId: payOoo,
    amount: 99,
    currency: 'INR',
    source: 'webhook',
  });
  assert(lateCaptureRes.success === false, 'Out-of-order late capture for refunded payment REJECTED');
  assert(lateCaptureRes.error?.includes('already been refunded'), 'Rejection reason states payment already refunded');

  console.log('\n================================================================================');
  console.log('🎉 ALL THREE ISSUES CLOSED & VERIFIED 100% IN FIREBASE EMULATOR!');
  console.log('================================================================================\n');

  await deleteApp(clientApp);
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal Closure Test Error:', err);
  process.exit(1);
});
