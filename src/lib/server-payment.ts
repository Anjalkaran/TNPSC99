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

  // 1. Check idempotency: check if payment record already exists
  const paymentRef = db.collection('payments').doc(paymentId);
  const existingPayment = await paymentRef.get();

  if (existingPayment.exists && existingPayment.data()?.status === 'captured') {
    console.log(`[Payment Idempotency] Payment ${paymentId} already processed.`);
    return {
      success: true,
      message: 'Payment already processed and subscription is active.',
      alreadyProcessed: true,
      subscriptionExpires: existingPayment.data()?.subscriptionExpires,
    };
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

/**
 * Revokes a user's premium subscription upon refund, cancellation, or dispute.
 * Idempotently updates the user profile to 'free' and records the refund in payments.
 */
export async function processSubscriptionRevocation(params: {
  userId: string;
  paymentId: string;
  refundId?: string;
  reason: 'refund' | 'chargeback' | 'cancellation';
}): Promise<void> {
  const { userId, paymentId, refundId, reason } = params;
  if (!db || !userId) return;

  const userRef = db.collection('users').doc(userId);
  const paymentRef = db.collection('payments').doc(paymentId);
  const nowIso = new Date().toISOString();

  const batch = db.batch();
  batch.update(userRef, {
    subscriptionStatus: 'free',
    subscriptionExpires: null,
    updatedAt: nowIso,
  });

  batch.set(paymentRef, {
    status: 'refunded',
    refundId: refundId || null,
    refundReason: reason,
    refundedAt: nowIso,
  }, { merge: true });

  await batch.commit();
  console.log(`[Subscription Revoked] User ${userId} subscription revoked due to ${reason}`);
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

