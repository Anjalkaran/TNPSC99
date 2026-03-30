import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay configuration missing');
      return NextResponse.json(
        { error: 'Subscription service misconfigured. Please try again later.' },
        { status: 500 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const body = await req.json();
    const { amount, currency = 'INR', receipt = `rcpt_${Date.now()}` } = body;

    const options = {
      amount: Math.round(Number(amount) * 100), // amount in the smallest currency unit
      currency,
      receipt,
    };

    console.log('Creating Razorpay Order with options:', options);
    const order = await instance.orders.create(options);
    console.log('Razorpay Order Created successfully:', order.id);

    // Return a clean object to ensure proper serialization
    return NextResponse.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating payment order' },
      { status: 500 }
    );
  }
}
