import assert from 'assert';
import crypto from 'crypto';
import { 
  getSubscriptionStatus, 
  hasActiveSubscription, 
  UserProfile 
} from '../src/lib/subscription-utils';
import { 
  verifyRazorpaySignature, 
  verifyRazorpayWebhookSignature,
  TNPSC99_MCQ_PRICE_PAISE,
  TNPSC99_CURRENCY 
} from '../src/lib/server-payment';
import { computeDeterministicPerformance } from '../src/lib/deterministic-analytics';

console.log('====================================================');
console.log('   TNPSC99 PHASE 2 — SECURITY & HARDENING TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

// ==========================================
// 1. SUBSCRIPTION GATING & EXPIRY TESTS
// ==========================================
console.log('--- 1. Subscription Gating & Tier Tests ---');

runTest('Free user with null expiration has isExpired=true', () => {
  const freeProfile: UserProfile = {
    id: 'student_123',
    username: 'Ramesh',
    email: 'ramesh@example.com',
    registrationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    subscriptionStatus: 'free',
    subscriptionExpires: undefined,
    referralCode: 'RAMESH123',
    referralCount: 0,
  };
  const status = getSubscriptionStatus(freeProfile);
  assert.strictEqual(status.status, 'free');
  assert.strictEqual(status.isExpired, true);
  assert.strictEqual(hasActiveSubscription(freeProfile), false);
});

runTest('Active premium user has isExpired=false and status=premium', () => {
  const premiumProfile: UserProfile = {
    id: 'student_456',
    username: 'Kavitha',
    email: 'kavitha@example.com',
    registrationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'premium',
    subscriptionExpires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days future
    referralCode: 'KAVI456',
    referralCount: 0,
  };
  const status = getSubscriptionStatus(premiumProfile);
  assert.strictEqual(status.status, 'premium');
  assert.strictEqual(status.isExpired, false);
  assert.strictEqual(hasActiveSubscription(premiumProfile), true);
  assert(status.daysRemaining && status.daysRemaining > 0);
});

runTest('Expired premium user has isExpired=true', () => {
  const expiredProfile: UserProfile = {
    id: 'student_789',
    username: 'Mani',
    email: 'mani@example.com',
    registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'premium',
    subscriptionExpires: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // expired 2 days ago
    referralCode: 'MANI789',
    referralCount: 0,
  };
  const status = getSubscriptionStatus(expiredProfile);
  assert.strictEqual(status.isExpired, true);
  assert.strictEqual(hasActiveSubscription(expiredProfile), false);
});

runTest('Admin user always bypasses subscription restrictions', () => {
  const adminProfile: UserProfile = {
    id: 'admin_1',
    username: 'Admin',
    email: 'admin@tnpsc99.com',
    registrationDate: new Date().toISOString(),
    isAdmin: true,
    subscriptionStatus: 'free',
    referralCode: 'ADMIN',
    referralCount: 0,
  };
  const status = getSubscriptionStatus(adminProfile);
  assert.strictEqual(status.status, 'admin');
  assert.strictEqual(status.isExpired, false);
  assert.strictEqual(hasActiveSubscription(adminProfile), true);
});

runTest('Free demo tests are permitted, paid tests are blocked for expired users', () => {
  const expiredProfile: UserProfile = {
    id: 'student_789',
    username: 'Mani',
    email: 'mani@example.com',
    registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'free',
    referralCode: 'MANI789',
    referralCount: 0,
  };

  const isAccessAllowed = (slug: string, profile: UserProfile) => {
    const isFreeDemo = slug.startsWith('demo-') || slug.startsWith('sample-') || slug.startsWith('free-');
    const { isExpired } = getSubscriptionStatus(profile);
    return !isExpired || isFreeDemo;
  };

  assert.strictEqual(isAccessAllowed('demo-class-10-tamil', expiredProfile), true, 'Demo test must be allowed');
  assert.strictEqual(isAccessAllowed('sample-history-quiz', expiredProfile), true, 'Sample test must be allowed');
  assert.strictEqual(isAccessAllowed('10_1_g_S', expiredProfile), false, 'Paid chapter test must be blocked');
  assert.strictEqual(isAccessAllowed('group-4-full-mock', expiredProfile), false, 'Paid mock test must be blocked');
});

// ==========================================
// 2. RAZORPAY PAYMENT & SIGNATURE SECURITY
// ==========================================
console.log('\n--- 2. Razorpay Payment Security Tests ---');

runTest('Price and currency enforcement', () => {
  assert.strictEqual(TNPSC99_MCQ_PRICE_PAISE, 9900, 'Price must be strictly ₹99 (9900 paise)');
  assert.strictEqual(TNPSC99_CURRENCY, 'INR', 'Currency must be strictly INR');
});

runTest('Valid Razorpay checkout signature is verified', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA28374928';
  const paymentId = 'pay_9837482934';
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = verifyRazorpaySignature(orderId, paymentId, validSignature, secret);
  assert.strictEqual(isValid, true, 'Valid signature must pass');
});

runTest('Tampered Razorpay checkout signature is rejected', () => {
  const secret = 'test_secret_key_12345';
  const orderId = 'order_DA28374928';
  const paymentId = 'pay_9837482934';
  const invalidSignature = 'tampered_signature_hex_value_0000000000000000000000000000000000000000000000000000000000000000';

  const isValid = verifyRazorpaySignature(orderId, paymentId, invalidSignature, secret);
  assert.strictEqual(isValid, false, 'Tampered signature must fail');
});

runTest('Valid Razorpay webhook signature is verified', () => {
  const secret = 'test_webhook_secret_67890';
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_123', order_id: 'order_456', amount: 9900 } } }
  });
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const isValid = verifyRazorpayWebhookSignature(payload, validSignature, secret);
  assert.strictEqual(isValid, true, 'Valid webhook signature must pass');
});

runTest('Tampered webhook payload or signature is rejected', () => {
  const secret = 'test_webhook_secret_67890';
  const payload = JSON.stringify({ event: 'payment.captured' });
  const tamperedPayload = JSON.stringify({ event: 'payment.captured', extra: 'tampered' });
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const isValid = verifyRazorpayWebhookSignature(tamperedPayload, signature, secret);
  assert.strictEqual(isValid, false, 'Tampered webhook payload must fail verification');
});

// ==========================================
// 3. ZERO-AI DETERMINISTIC ANALYTICS TESTS
// ==========================================
console.log('\n--- 3. Deterministic Performance Analytics Tests ---');

runTest('Deterministic analytics computes correct strengths and weaknesses without LLM', () => {
  const input = {
    subjects: [
      { name: 'Tamil', proficiency: 88, attempts: 12 },
      { name: 'Science', proficiency: 54, attempts: 8 },
      { name: 'History', proficiency: 82, attempts: 10 },
    ],
    categories: [
      { name: 'Ilakkanam', subjectName: 'Tamil', proficiency: 92, attempts: 6 },
    ],
    units: [
      { name: 'Physics Unit 1', className: '10th', subjectName: 'Science', proficiency: 48, attempts: 4 },
    ],
    language: 'ta' as const,
  };

  const result = computeDeterministicPerformance(input);

  // Check strengths
  assert(result.strengths.length > 0, 'Strengths should be populated for items >= 75%');
  assert(result.strengths.some(s => s.includes('Ilakkanam') || s.includes('Tamil')));

  // Check weaknesses
  assert(result.weaknesses.length > 0, 'Weaknesses should be populated for items < 65%');
  assert(result.weaknesses.some(w => w.includes('Physics Unit 1') || w.includes('Science')));

  // Check recommendations
  assert(result.recommendations.length >= 2, 'Actionable recommendations should be generated');

  // Check summary
  assert(result.overallSummary.length > 0, 'Encouraging summary should be generated');
});

runTest('Deterministic analytics handles cold start (zero tests) gracefully', () => {
  const coldInput = {
    subjects: [],
    categories: [],
    units: [],
    language: 'en' as const,
  };

  const result = computeDeterministicPerformance(coldInput);
  assert.strictEqual(result.strengths.length, 0);
  assert.strictEqual(result.weaknesses.length, 0);
  assert(result.overallSummary.includes('Complete more practice tests'));
});

// ==========================================
// 4. TEXTBOOK REFERENCE ACCESS TESTS
// ==========================================
console.log('\n--- 4. Textbook Reference Access Tests ---');

runTest('Subscribed student is authorized to view textbook references', () => {
  const activeStudent: UserProfile = {
    id: 'student_active',
    username: 'Anitha',
    email: 'anitha@example.com',
    registrationDate: new Date().toISOString(),
    subscriptionStatus: 'premium',
    subscriptionExpires: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    referralCode: 'ANITHA',
    referralCount: 0,
  };

  const canViewReference = (profile: UserProfile | null) => {
    return profile?.isAdmin || hasActiveSubscription(profile);
  };

  assert.strictEqual(canViewReference(activeStudent), true, 'Active subscriber must be able to view references');
});

runTest('Unsubscribed expired student is blocked from textbook reference viewer', () => {
  const expiredStudent: UserProfile = {
    id: 'student_expired',
    username: 'Murugan',
    email: 'murugan@example.com',
    registrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'free',
    referralCode: 'MURUGAN',
    referralCount: 0,
  };

  const canViewReference = (profile: UserProfile | null) => {
    return profile?.isAdmin || hasActiveSubscription(profile);
  };

  assert.strictEqual(canViewReference(expiredStudent), false, 'Expired student must be blocked');
});

// ==========================================
// SUMMARY
// ==========================================
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
