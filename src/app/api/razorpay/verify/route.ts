import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyFirebaseBearerToken, 
  verifyRazorpaySignature, 
  processSubscriptionActivation,
  TNPSC99_MCQ_PRICE_PAISE,
  TNPSC99_CURRENCY
} from '@/lib/server-payment';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller with Firebase ID token
    const caller = await verifyFirebaseBearerToken(req);
    if (!caller) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid Firebase authentication required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters.' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('[Razorpay Verify] RAZORPAY_KEY_SECRET missing in server environment.');
      return NextResponse.json(
        { error: 'Payment service configuration error.' },
        { status: 500 }
      );
    }

    // 2. Cryptographic signature check
    const isValidSignature = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isValidSignature) {
      console.error(`[Razorpay Verify] Invalid signature for payment ${razorpay_payment_id}`);
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // 3. Atomically activate subscription with idempotent execution
    // Note: userId is taken strictly from the verified Firebase ID token (caller.uid)
    const result = await processSubscriptionActivation({
      userId: caller.uid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: TNPSC99_MCQ_PRICE_PAISE / 100, // ₹99
      currency: TNPSC99_CURRENCY,
      source: 'client_verify',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to activate subscription.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      alreadyProcessed: result.alreadyProcessed,
      subscriptionExpires: result.subscriptionExpires,
    });
  } catch (error: any) {
    console.error('[Razorpay Verify Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
