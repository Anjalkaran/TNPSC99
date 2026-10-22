import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyRazorpayWebhookSignature, 
  processSubscriptionActivation,
  processSubscriptionRevocation,
  recordFailedPayment
} from '@/lib/server-payment';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      console.warn('[Razorpay Webhook] Missing x-razorpay-signature header.');
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('[Razorpay Webhook] Neither RAZORPAY_WEBHOOK_SECRET nor RAZORPAY_KEY_SECRET configured.');
      return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 });
    }

    // Read the raw text body to compute HMAC signature accurately
    const rawBody = await req.text();

    const isValidSignature = verifyRazorpayWebhookSignature(rawBody, signature, secret);
    if (!isValidSignature) {
      console.error('[Razorpay Webhook] Invalid webhook signature verification.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`[Razorpay Webhook] Received validated event: ${event.event}`);

    // 1. Successful payment captures & order settlements
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity || event.payload?.order?.entity;
      
      const paymentId = event.payload?.payment?.entity?.id || paymentEntity?.id;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const amount = (paymentEntity?.amount || 9900) / 100;
      const currency = paymentEntity?.currency || 'INR';
      
      // Extract userId from notes attached during order creation
      const userId = paymentEntity?.notes?.userId || event.payload?.order?.entity?.notes?.userId;

      if (!userId || !paymentId || !orderId) {
        console.warn('[Razorpay Webhook] Missing essential payment metadata (userId, paymentId, or orderId):', {
          userId,
          paymentId,
          orderId,
        });
        return NextResponse.json({ 
          received: true, 
          warning: 'Event acknowledged but missing user entitlement metadata.' 
        });
      }

      console.log(`[Razorpay Webhook] Processing activation for user ${userId}, payment ${paymentId}`);
      
      const result = await processSubscriptionActivation({
        userId,
        orderId,
        paymentId,
        amount,
        currency,
        source: 'webhook',
        rawEvent: event.event,
      });

      console.log(`[Razorpay Webhook] Result for user ${userId}:`, result);
    } 
    // 2. Refund events (immediately revoke subscription and update ledger)
    else if (event.event === 'refund.processed' || event.event === 'refund.created') {
      const paymentEntity = event.payload?.payment?.entity;
      const refundEntity = event.payload?.refund?.entity;
      const paymentId = paymentEntity?.id || refundEntity?.payment_id;
      const userId = paymentEntity?.notes?.userId || refundEntity?.notes?.userId;

      if (userId && paymentId) {
        await processSubscriptionRevocation({
          userId,
          paymentId,
          refundId: refundEntity?.id,
          reason: 'refund',
        });
      }
    }
    // 3. Failed payment events (record failure, zero entitlement granted)
    else if (event.event === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const userId = paymentEntity?.notes?.userId;

      if (paymentId) {
        await recordFailedPayment({
          userId,
          paymentId,
          orderId: paymentEntity?.order_id,
          amount: (paymentEntity?.amount || 9900) / 100,
          currency: paymentEntity?.currency || 'INR',
          errorDescription: paymentEntity?.error_description || 'Payment failed at gateway',
        });
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (error: any) {
    console.error('[Razorpay Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing error' }, { status: 500 });
  }
}
