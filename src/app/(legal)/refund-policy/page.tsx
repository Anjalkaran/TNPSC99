'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Refund Policy</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p className="font-semibold text-foreground">All payments made for our subscription plans (monthly, quarterly, or yearly) are final and non-refundable. Once a subscription is purchased, you will have access to the premium features for the duration of the billing cycle.</p>
          <p>We encourage users to make an informed decision before subscribing. If you have any questions about our services or subscription plans, please contact us at <a href="mailto:contact@tnpsc99.com" className="text-primary hover:underline">contact@tnpsc99.com</a> before making a purchase.</p>
          <p>In the event of a technical issue or billing error from our side, please contact our support team immediately. We will investigate the issue and may provide a refund or credit at our sole discretion.</p>

          <div className="pt-6">
            <h3 className="text-2xl font-semibold text-foreground mb-4">Frequently Asked Questions (FAQ)</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>How do I cancel my subscription?</AccordionTrigger>
                <AccordionContent>
                  You can cancel your subscription at any time from your user profile or account settings page. The cancellation will take effect at the end of your current billing period, and you will not be charged for the next cycle.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What happens when my subscription ends?</AccordionTrigger>
                <AccordionContent>
                  Once your subscription expires, you will lose access to premium features. Your account will revert to the free plan, and any data related to your test history and performance will be retained.
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-3">
                <AccordionTrigger>Do you offer free trials?</AccordionTrigger>
                <AccordionContent>
                  We may occasionally offer free trials for our subscription plans. Any free trial will be explicitly mentioned during the signup or subscription process. Please note that you may be required to enter payment information to start a trial, but you will not be charged until the trial period ends.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>What if I have a billing issue?</AccordionTrigger>
                <AccordionContent>
                   If you believe there has been a billing error, please contact our support team at <a href="mailto:contact@tnpsc99.com" className="text-primary hover:underline">contact@tnpsc99.com</a> with the details of the transaction. We will investigate the matter promptly.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
