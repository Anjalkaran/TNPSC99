'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import Script from "next/script";

// This is a placeholder for the Razorpay instance
// since the script loads externally.
declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function SubscriptionPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
    );
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);


    const handleSubscribe = async (plan: string, amount: number) => {
        if (!user || !userProfile) {
            toast({
                title: 'Please log in',
                description: 'You need to be logged in to subscribe.',
                variant: 'destructive',
            });
            return;
        }

        // --- Step 1: Create Order (Backend) ---
        // In a real application, you would make an API call to your backend here.
        // Your backend would use the Razorpay Node.js SDK and your KEY SECRET
        // to securely create an order. It would then return the order_id.
        //
        // Example backend call (you would need to create this API route):
        // const response = await fetch('/api/razorpay/create-order', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ amount: amount * 100, currency: 'INR' }),
        // });
        // const order = await response.json();
        
        toast({
            title: 'Simulation: Creating Order...',
            description: 'In a real app, we would now call a secure backend to create a Razorpay order.',
            duration: 5000,
        });
        
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // From .env file
            amount: amount * 100, // amount in the smallest currency unit (paise)
            currency: 'INR',
            name: 'TNPSC99 Subscription',
            description: `Payment for ${plan}`,
            // order_id: order.id, // This would come from your backend response
            
            handler: async function (response: any) {
                // --- Step 2: Verify Payment (Backend) ---
                // The payment response is received here. It's CRITICAL to send this
                // to your backend to verify the payment signature.
                // DO NOT trust the client-side success response alone.
                //
                // Example verification call:
                // const verificationResponse = await fetch('/api/razorpay/verify-payment', {
                //   method: 'POST',
                //   headers: { 'Content-Type': 'application/json' },
                //   body: JSON.stringify({
                //     razorpay_payment_id: response.razorpay_payment_id,
                //     razorpay_order_id: response.razorpay_order_id,
                //     razorpay_signature: response.razorpay_signature,
                //   }),
                // });
                // const result = await verificationResponse.json();
                // if (result.isVerified) { ... }

                toast({
                    title: 'Payment Successful (Simulation)',
                    description: 'Verifying payment on backend and updating subscription...',
                });
                
                // --- Step 3: Update Database (Backend) ---
                // After successful verification on your backend, update the user's
                // subscription status in Firestore.
                if (userProfileRef) {
                    const newExpiry = new Date();
                    newExpiry.setMonth(newExpiry.getMonth() + 1);
                    await updateDoc(userProfileRef, {
                        subscriptionStatus: 'premium',
                        subscriptionId: response.razorpay_payment_id,
                        subscriptionExpires: newExpiry.toISOString(),
                    });
                     toast({
                        title: 'Subscription Activated!',
                        description: 'Thank you for subscribing.',
                    });
                }
            },
            prefill: {
                name: userProfile.username,
                email: userProfile.email,
                contact: userProfile.phone || '',
            },
            notes: {
                userId: user.uid,
            },
            theme: {
                color: '#2563eb',
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };
    
    const features = [
        "Access to all test series (Group I, II, IV)",
        "Unlimited practice attempts",
        "Detailed performance analysis with AI",
        "Access to all previous year papers",
        "Bookmark unlimited questions",
        "Ad-free experience"
    ];

    if (isLoading) {
        return (
             <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-4">
                <Skeleton className="h-10 w-1/2 mx-auto" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start pt-8">
                    <Skeleton className="h-[400px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        );
    }

    return (
        <>
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />
            <div className="container mx-auto p-4 sm:p-6 md:p-8">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold">Choose Your Plan</h1>
                    <p className="text-muted-foreground mt-2">Unlock all features and accelerate your TNPSC preparation.</p>
                </div>

                {userProfile?.subscriptionStatus === 'free_trial' && userProfile.trialEndsAt && (
                  <div className="mb-8 text-center p-4 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg max-w-4xl mx-auto">
                    <p className="font-semibold text-blue-800 dark:text-blue-300">You are currently on a free trial.</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">Your trial ends on {new Date(userProfile.trialEndsAt).toLocaleString()}.</p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
                    <Card className="border-primary border-2 shadow-lg relative">
                        <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                            <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                Special Offer
                            </div>
                        </div>
                        <CardHeader className="pt-8">
                            <CardTitle>Limited Time Offer</CardTitle>
                            <CardDescription>Valid until April 30th</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-4xl font-bold">
                                ₹99 <span className="text-xl font-normal text-muted-foreground">/ month</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Billed monthly. Originally <span className="line-through">₹999</span>.</p>
                            <ul className="space-y-2 text-sm">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleSubscribe('Offer Plan', 99)}>Subscribe Now</Button>
                        </CardFooter>
                    </Card>
                    
                     <Card>
                        <CardHeader>
                            <CardTitle>Standard Plan</CardTitle>
                            <CardDescription>The regular price after the offer period.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="text-4xl font-bold">
                                ₹999 <span className="text-xl font-normal text-muted-foreground">/ month</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Billed monthly.</p>
                            <ul className="space-y-2 text-sm">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" onClick={() => handleSubscribe('Standard Plan', 999)}>Subscribe Now</Button>
                        </CardFooter>
                    </Card>
                </div>
                 <div className="text-center mt-12 text-sm text-muted-foreground">
                    <p>All payments are processed securely through Razorpay.</p>
                    <p>By subscribing, you agree to our <Link href="/terms-and-conditions" className="underline hover:text-primary">Terms and Conditions</Link> and <Link href="/refund-policy" className="underline hover:text-primary">Refund Policy</Link>.</p>
                </div>
            </div>
        </>
    );
}