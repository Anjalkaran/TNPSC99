import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { 
  verifyFirebaseBearerToken, 
  TNPSC99_MCQ_PRICE_PAISE, 
  TNPSC99_CURRENCY 
} from '@/lib/server-payment';

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller with Firebase ID token
    const caller = await verifyFirebaseBearerToken(req);
    if (!caller) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid Firebase authentication required to create orders.' },
        { status: 401 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('[Razorpay Config] Missing Razorpay credentials in server environment.');
      return NextResponse.json(
        { error: 'Subscription service temporarily unavailable. Please try again later.' },
        { status: 500 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receipt = `rcpt_${caller.uid.slice(0, 8)}_${Date.now()}`;

    // 2. Strict server-side enforcement of ₹99 monthly subscription pricing
    const options = {
      amount: TNPSC99_MCQ_PRICE_PAISE, // strictly 9900 paise = ₹99
      currency: TNPSC99_CURRENCY,      // strictly INR
      receipt,
      notes: {
        userId: caller.uid,
        plan: 'monthly_mcq',
      },
    };

    console.log(`[Razorpay Order] Creating order for user ${caller.uid} (${options.amount / 100} ${options.currency})`);
    const order = await instance.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    });
  } catch (error: any) {
    console.error('[Razorpay Order Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating payment order' },
      { status: 500 }
    );
  }
}
