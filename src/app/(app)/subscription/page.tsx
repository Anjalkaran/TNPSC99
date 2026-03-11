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
        if (!window.Razorpay) {
            toast({
                variant: 'destructive',
                title: 'Payment Gateway Not Ready',
                description: 'Please wait a moment for the payment gateway to load and try again.',
            });
            return;
        }

        if (!user || !userProfile) {
            toast({
                title: 'Please log in',
                description: 'You need to be logged in to subscribe.',
                variant: 'destructive',
            });
            return;
        }
        
        toast({
            title: 'Simulation: Creating Order...',
            description: 'In a real app, we would now call a secure backend to create a Razorpay order.',
            duration: 5000,
        });
        
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
            amount: amount * 100, 
            currency: 'INR',
            name: 'TNPSC99 Subscription',
            description: `Payment for ${plan}`,
            
            handler: async function (response: any) {
                toast({
                    title: 'Payment Successful (Simulation)',
                    description: 'Verifying payment on backend and updating subscription...',
                });
                
                if (userProfileRef) {
                    const newExpiry = new Date();
                    newExpiry.setMonth(newExpiry.getMonth() + 1);
                    await updateDoc(userProfileRef, {
                        subscriptionStatus: 'premium',
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

    const isPremium = userProfile?.subscriptionStatus === 'premium';
    const subscriptionExpires = userProfile?.subscriptionExpires ? new Date(userProfile.subscriptionExpires) : null;
    const hasActiveSubscription = userProfile?.isAdmin || (isPremium && subscriptionExpires && subscriptionExpires > new Date());

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

                {hasActiveSubscription && (
                  <div className="mb-8 text-center p-4 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg max-w-4xl mx-auto">
                    <p className="font-semibold text-green-800 dark:text-green-300">You are a Premium Member!</p>
                    <p className="text-sm text-green-700 dark:text-green-400">{userProfile?.isAdmin ? 'You have permanent access as an administrator.' : `Your subscription is active until ${subscriptionExpires?.toLocaleString()}.`}</p>
                  </div>
                )}
                
                <div className="grid md:grid-cols-1 gap-8 max-w-lg mx-auto items-start">
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
                            <Button className="w-full" onClick={() => handleSubscribe('Offer Plan', 99)} disabled={hasActiveSubscription}>
                                {hasActiveSubscription ? 'Subscribed' : 'Subscribe Now'}
                            </Button>
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
