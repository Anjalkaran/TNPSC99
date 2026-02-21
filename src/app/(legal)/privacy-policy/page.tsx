'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <p>tnpsc99.com ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by tnpsc99.com.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">1. Information We Collect</h3>
            <p>We collect information you provide directly to us. For example, we collect information when you create an account, subscribe to our services, participate in any interactive features of our services, fill out a form, or otherwise communicate with us. The types of information we may collect include your name, email address, password, and any other information you choose to provide.</p>
            <p>When you use our services, we automatically collect information about you, including:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Log Information:</strong> We log information about your use of the services, including the type of browser you use, access times, pages viewed, your IP address, and the page you visited before navigating to our services.</li>
                <li><strong>Usage Information:</strong> We collect information about your performance on tests, questions answered, and scores obtained to provide you with performance analytics.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground pt-4">2. How We Use Your Information</h3>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide, maintain, and improve our services, including processing transactions and sending you related information, including confirmations and invoices.</li>
                <li>Respond to your comments, questions, and requests and provide customer service;</li>
                <li>Communicate with you about products, services, offers, and events offered by tnpsc99.com and others, and provide news and information we think will be of interest to you;</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services;</li>
                <li>Personalize and improve the services and provide content or features that match user profiles or interests.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground pt-4">3. Payment Information</h3>
            <p>We use Razorpay for payment processing. We do not store your credit card details or other payment card information on our servers. The information is provided directly to our third-party payment processor, Razorpay, whose use of your personal information is governed by their Privacy Policy. Razorpay adheres to the standards set by PCI-DSS as managed by the PCI Security Standards Council, which is a joint effort of brands like Visa, Mastercard, American Express and Discover.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">4. Sharing of Information</h3>
            <p>We do not share your personal information with third parties except in the following circumstances or as otherwise described in this Privacy Policy:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>With your consent or at your direction;</li>
                <li>With third-party vendors and other service providers who need access to your information to carry out work on our behalf, such as payment processing;</li>
                <li>In response to a request for information if we believe disclosure is in accordance with, or required by, any applicable law, regulation, or legal process;</li>
                <li>If we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of tnpsc99.com or others.</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground pt-4">5. Your Choices</h3>
            <p>You may update, correct or delete information about you at any time by logging into your online account or emailing us at contact@tnpsc99.com. Please note that we may retain certain information as required by law or for legitimate business purposes.</p>

            <h3 className="text-xl font-semibold text-foreground pt-4">6. Contact Us</h3>
            <p>If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:contact@tnpsc99.com" className="text-primary hover:underline">contact@tnpsc99.com</a>.</p>

        </CardContent>
      </Card>
    </div>
  );
}
