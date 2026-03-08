'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const userProfileRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
    );
    const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);


    const handleSubscribe = (plan: string) => {
        toast({
            title: "Payment Gateway Integration Needed",
            description: `You've selected the ${plan}. To complete this feature, you'll need to integrate Razorpay and handle the payment logic on a secure backend.`,
            duration: 8000,
        });
        // TODO: Implement Razorpay checkout logic here.
        // This would typically involve:
        // 1. Loading the Razorpay script.
        // 2. Calling a backend endpoint to create a Razorpay Order.
        // 3. Opening the Razorpay checkout with the order ID.
        // 4. Handling the payment success/failure in a callback.
        // 5. On success, updating the user's subscriptionStatus in Firestore.
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
                        <Button className="w-full" onClick={() => handleSubscribe('Offer Plan')}>Subscribe Now</Button>
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
                        <Button className="w-full" variant="outline" onClick={() => handleSubscribe('Standard Plan')}>Subscribe Now</Button>
                    </CardFooter>
                </Card>
            </div>
             <div className="text-center mt-12 text-sm text-muted-foreground">
                <p>All payments are processed securely through Razorpay.</p>
                <p>By subscribing, you agree to our <Link href="/terms-and-conditions" className="underline hover:text-primary">Terms and Conditions</Link> and <Link href="/refund-policy" className="underline hover:text-primary">Refund Policy</Link>.</p>
            </div>
        </div>
    );
}
