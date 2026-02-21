'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Terms and Conditions</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the https://tnpsc99.com website (the "Service") operated by tnpsc99.com ("us", "we", or "our").</p>
            <p>Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.</p>
            <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">1. Accounts</h3>
            <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
            <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. Subscriptions and Payments</h3>
            <p>Some parts of the Service may be billed on a subscription basis ("Subscription(s)"). You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly, quarterly, or yearly basis, depending on the type of subscription plan you select when purchasing a Subscription.</p>
            <p>At the end of each Billing Cycle, your Subscription will automatically renew under the exact same conditions unless you cancel it or tnpsc99.com cancels it. You may cancel your Subscription renewal through your online account management page.</p>
            <p>A valid payment method is required to process the payment for your Subscription. We use a third-party payment processor, Razorpay, to handle all payment transactions. You must provide Razorpay with accurate and complete billing information. By submitting such payment information, you automatically authorize Razorpay to charge all Subscription fees incurred through your account to any such payment instruments.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Fee Changes</h3>
            <p>tnpsc99.com, in its sole discretion and at any time, may modify the Subscription fees. Any Subscription fee change will become effective at the end of the then-current Billing Cycle. We will provide you with a reasonable prior notice of any change in Subscription fees to give you an opportunity to terminate your Subscription before such change becomes effective.</p>
            <p>Your continued use of the Service after the Subscription fee change comes into effect constitutes your agreement to pay the modified Subscription fee amount.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Intellectual Property</h3>
            <p>The Service and its original content, features and functionality are and will remain the exclusive property of tnpsc99.com and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">5. Links To Other Web Sites</h3>
            <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by tnpsc99.com.</p>
            <p>tnpsc99.com has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services. You further acknowledge and agree that tnpsc99.com shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">6. Termination</h3>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
            
            <h3 className="text-xl font-semibold text-foreground pt-4">7. Governing Law</h3>
            <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">8. Changes</h3>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">9. Contact Us</h3>
            <p>If you have any questions about these Terms, please contact us at: <a href="mailto:support@tnpsc99.com" className="text-primary hover:underline">support@tnpsc99.com</a>.</p>

        </CardContent>
      </Card>
    </div>
  );
}
