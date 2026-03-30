import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      plan 
    } = body;

    // VERIFICATION DIAGNOSTIC
    console.log('Razorpay Verification Check:', { 
      hasOrderId: !!razorpay_order_id, 
      hasPaymentId: !!razorpay_payment_id, 
      hasSignature: !!razorpay_signature,
      hasUserId: !!userId,
      userId: userId
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      console.error('Missing required payment details in request body:', body);
      return NextResponse.json({ 
        error: 'Missing required payment details',
        received: { 
          orderId: !!razorpay_order_id, 
          paymentId: !!razorpay_payment_id, 
          signature: !!razorpay_signature,
          userId: !!userId
        }
      }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET missing during verification');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify the payment signature
    const generated_signature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('Invalid signature match:', { generated: generated_signature, received: razorpay_signature });
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Payment is verified, update the user's subscription in Firestore
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        console.error('User document not found during verification:', userId);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    let newExpiry = new Date();
    const currentExpiryStr = userData?.subscriptionExpires;
    
    if (currentExpiryStr) {
      const currentExpiry = new Date(currentExpiryStr);
      if (currentExpiry > new Date()) {
        newExpiry = currentExpiry;
      }
    }

    newExpiry.setMonth(newExpiry.getMonth() + 1);

    await userRef.update({
      subscriptionStatus: 'premium',
      subscriptionExpires: newExpiry.toISOString(),
      lastPaymentId: razorpay_payment_id,
      lastOrderId: razorpay_order_id,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Subscription activated successfully' });
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
