import crypto from 'crypto';
import { db, adminAuth } from '@/firebase/admin';

export const TNPSC99_MCQ_PRICE_PAISE = 9900; // ₹99.00 in paise
export const TNPSC99_CURRENCY = 'INR';

export interface SubscriptionActivationResult {
  success: boolean;
  message?: string;
  error?: string;
  alreadyProcessed?: boolean;
  subscriptionExpires?: string;
}

/**
 * Verifies a Firebase ID token from the Authorization header.
 * Returns decoded token (with uid) or null if invalid/missing.
 */
export async function verifyFirebaseBearerToken(req: Request): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7).trim();
    if (!token) return null;

    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch (error) {
    console.error('[Payment Auth] Failed to verify bearer token:', error);
    return null;
  }
}

/**
 * Validates the Razorpay payment checkout signature.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    
    if (expected.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (err) {
    console.error('[Razorpay Signature] Verification error:', err);
    return false;
  }
}

/**
 * Validates a Razorpay webhook signature.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expected.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (err) {
    console.error('[Webhook Signature] Verification error:', err);
    return false;
  }
}

/**
 * Atomically activates/extends the ₹99 monthly subscription.
 * Fully idempotent: prevents duplicate entitlements and replay attacks.
 */
export async function processSubscriptionActivation(params: {
  userId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  source: 'client_verify' | 'webhook';
  rawEvent?: any;
}): Promise<SubscriptionActivationResult> {
  const { userId, orderId, paymentId, amount, currency, source } = params;

  if (!userId || !paymentId || !orderId) {
    return { success: false, error: 'Missing mandatory payment identification fields.' };
  }

  // 1. Check idempotency & out-of-order event delivery
  const paymentRef = db.collection('payments').doc(paymentId);
  const existingPayment = await paymentRef.get();

  if (existingPayment.exists) {
    const existingData = existingPayment.data();
    // Out-of-order protection: If payment was already refunded, do not reactivate!
    if (existingData?.status === 'refunded') {
      console.warn(`[Payment Out-of-Order] Payment ${paymentId} was already refunded. Rejecting late activation.`);
      return {
        success: false,
        error: 'Payment has already been refunded.',
        alreadyProcessed: true,
      };
    }

    if (existingData?.status === 'captured') {
      console.log(`[Payment Idempotency] Payment ${paymentId} already processed.`);
      return {
        success: true,
        message: 'Payment already processed and subscription is active.',
        alreadyProcessed: true,
        subscriptionExpires: existingData?.subscriptionExpires,
      };
    }
  }

  // 2. Locate user record
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    console.error(`[Payment Error] Target user ${userId} does not exist in Firestore.`);
    // Record failure in audit log
    await paymentRef.set({
      paymentId,
      orderId,
      userId,
      amount,
      currency,
      status: 'failed',
      failureReason: 'User profile does not exist in Firestore',
      source,
      attemptedAt: new Date().toISOString(),
    }, { merge: true });

    return { success: false, error: 'User account not found.' };
  }

  const userData = userDoc.data();
  const now = new Date();

  // 3. Compute subscription duration (strictly 30 days)
  let baseDate = now;
  if (userData?.subscriptionExpires) {
    const existingExpiry = new Date(userData.subscriptionExpires);
    if (!isNaN(existingExpiry.getTime()) && existingExpiry > now) {
      // User is already active; stack the additional 30 days onto current expiry
      baseDate = existingExpiry;
    }
  }

  const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const newExpiryIso = newExpiry.toISOString();
  const timestampIso = now.toISOString();

  // 4. Atomic write: update user entitlement and record transaction
  const batch = db.batch();

  batch.update(userRef, {
    subscriptionStatus: 'premium',
    subscriptionExpires: newExpiryIso,
    lastPaymentId: paymentId,
    lastOrderId: orderId,
    updatedAt: timestampIso,
  });

  batch.set(paymentRef, {
    paymentId,
    orderId,
    userId,
    amount,
    currency,
    plan: 'monthly_mcq',
    status: 'captured',
    source,
    subscriptionExpires: newExpiryIso,
    createdAt: timestampIso,
  });

  await batch.commit();

  console.log(`[Subscription Activated] User ${userId} granted premium until ${newExpiryIso} via ${source}`);

  return {
    success: true,
    message: 'Subscription successfully activated.',
    alreadyProcessed: false,
    subscriptionExpires: newExpiryIso,
  };
}

export interface SubscriptionRevocationResult {
  success: boolean;
  message?: string;
  alreadyProcessed?: boolean;
  subscriptionRevoked: boolean;
  reason?: string;
}

/**
 * Revokes or adjusts a user's premium subscription upon refund, cancellation, or dispute.
 * Fully audit-trailed, supports full vs partial refunds, older payment renewal protection, and idempotency.
 */
export async function processSubscriptionRevocation(params: {
  userId: string;
  paymentId: string;
  refundId?: string;
  refundAmount?: number;
  isPartialRefund?: boolean;
  reason: 'refund' | 'chargeback' | 'cancellation';
}): Promise<SubscriptionRevocationResult> {
  const { userId, paymentId, refundId, refundAmount, isPartialRefund, reason } = params;
  if (!db || !userId || !paymentId) {
    return { success: false, subscriptionRevoked: false, reason: 'Missing mandatory fields' };
  }

  const userRef = db.collection('users').doc(userId);
  const paymentRef = db.collection('payments').doc(paymentId);
  const nowIso = new Date().toISOString();

  const [userDoc, paymentDoc] = await Promise.all([
    userRef.get(),
    paymentRef.get()
  ]);

  const paymentData = paymentDoc.data();
  // Duplicate refund check (Idempotency)
  if (paymentData?.status === 'refunded' && !isPartialRefund) {
    console.log(`[Refund Idempotency] Payment ${paymentId} already marked as refunded.`);
    return { success: true, alreadyProcessed: true, subscriptionRevoked: false, message: 'Refund already processed.' };
  }

  const batch = db.batch();
  const userData = userDoc.data();
  
  // Check if this payment is the student's current active subscription payment
  // If the student already renewed with a newer payment, lastPaymentId !== paymentId
  const isLatestPayment = !userData?.lastPaymentId || userData.lastPaymentId === paymentId;
  let subscriptionRevoked = false;

  if (isPartialRefund) {
    // Partial refund: student retains subscription, record partial refund in payments
    console.log(`[Partial Refund] Partial refund of ₹${refundAmount} for user ${userId}. Subscription retained.`);
  } else if (!isLatestPayment) {
    // Older payment refunded after successful renewal: student retains current subscription!
    console.log(`[Renewal Protected] Older payment ${paymentId} refunded after user ${userId} renewed via ${userData?.lastPaymentId}. Subscription retained.`);
  } else {
    // Full refund on current payment: revoke active subscription
    batch.update(userRef, {
      subscriptionStatus: 'free',
      subscriptionExpires: null,
      updatedAt: nowIso,
    });
    subscriptionRevoked = true;
    console.log(`[Subscription Revoked] User ${userId} subscription revoked due to full ${reason}`);
  }

  batch.set(paymentRef, {
    status: isPartialRefund ? 'partially_refunded' : 'refunded',
    refundId: refundId || null,
    refundAmount: refundAmount || null,
    isPartialRefund: Boolean(isPartialRefund),
    refundReason: reason,
    refundedAt: nowIso,
  }, { merge: true });

  await batch.commit();

  return {
    success: true,
    alreadyProcessed: false,
    subscriptionRevoked,
  };
}

/**
 * Records failed payment transactions in the payment audit ledger.
 * Ensures failed payments never grant subscription access.
 */
export async function recordFailedPayment(params: {
  userId?: string;
  paymentId: string;
  orderId?: string;
  amount: number;
  currency: string;
  errorDescription?: string;
}): Promise<void> {
  const { userId, paymentId, orderId, amount, currency, errorDescription } = params;
  if (!db || !paymentId) return;

  const paymentRef = db.collection('payments').doc(paymentId);
  await paymentRef.set({
    paymentId,
    orderId: orderId || null,
    userId: userId || null,
    amount,
    currency,
    status: 'failed',
    failureReason: errorDescription || 'Payment transaction failed',
    attemptedAt: new Date().toISOString(),
  }, { merge: true });
}

