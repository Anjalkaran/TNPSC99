'use client';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap, BarChart2, BookOpen, Bookmark, Shield, Star } from "lucide-react";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import Script from "next/script";
import { getSubscriptionStatus } from '@/lib/subscription-utils';

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
    const subStatus = getSubscriptionStatus(userProfile);

    const handleSubscribe = async (plan: string, amount: number) => {
        if (!window.Razorpay) {
            toast({ variant: 'destructive', title: 'Payment Gateway Not Ready', description: 'Please wait a moment and try again.' });
            return;
        }
        if (!user || !userProfile) {
            toast({ title: 'Please log in', description: 'You need to be logged in to subscribe.', variant: 'destructive' });
            return;
        }

        try {
            toast({ title: 'Processing...', description: 'Creating your subscription order.' });
            
            const idToken = await user.getIdToken();

            // 1. Create Order on Backend
            const orderRes = await fetch('/api/razorpay/order', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ amount, plan }),
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');
            
            if (!orderData.id) {
                console.error('No order ID in response:', orderData);
                throw new Error('Payment service error: No Order ID received.');
            }

            console.log('Order received from backend:', orderData);

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: Math.round(amount * 100),
                currency: 'INR',
                name: 'TNPSC99',
                description: `Subscription for ${plan}`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    try {
                        toast({ title: 'Verifying Payment...', description: 'Please do not close this window.' });

                        console.log('Razorpay Verification Response:', response);

                        const currentToken = await user.getIdToken();

                        // 3. Verify Payment on Backend
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentToken}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

                        toast({ title: 'Success!', description: 'Your subscription is now active.' });
                        
                        // Small delay to allow Firestore to update and local state to reflect if needed
                        setTimeout(() => {
                           window.location.reload();
                        }, 2000);

                    } catch (err: any) {
                        toast({ variant: 'destructive', title: 'Verification Error', description: err.message });
                    }
                },
                prefill: { 
                    name: userProfile.username || '', 
                    email: userProfile.email || '', 
                    contact: userProfile.phone || '' 
                },
                notes: { userId: user.uid },
                theme: { color: '#2563eb' },
                modal: {
                    ondismiss: function() {
                        toast({ title: 'Payment Cancelled', description: 'The payment process was cancelled.' });
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error('Subscription error:', error);
            toast({ variant: 'destructive', title: 'Subscription Error', description: error.message });
        }
    };

    const features = [
        { icon: Zap, label: "All Test Series", desc: "Group I, II, IV — unlimited practice" },
        { icon: BarChart2, label: "AI Performance Analysis", desc: "Deep insights on strengths & gaps" },
        { icon: BookOpen, label: "Previous Year Papers", desc: "Full access to all question archives" },
        { icon: Bookmark, label: "Unlimited Bookmarks", desc: "Save & review any question anytime" },
        { icon: Shield, label: "Ad-Free Experience", desc: "Zero interruptions, pure focus" },
        { icon: Star, label: "Priority Support", desc: "Get help when you need it most" },
    ];

    if (isLoading) {
        return (
            <div className="container mx-auto p-6 md:p-10 space-y-6">
                <Skeleton className="h-10 w-1/2 mx-auto" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-[420px] w-full max-w-lg mx-auto mt-8" />
            </div>
        );
    }

    const hasActiveSubscription = subStatus.status === 'admin' || subStatus.status === 'premium';
    const isTrialInGrace = subStatus.status === 'trial' && !subStatus.isExpired;
    const isTrialExpired = subStatus.status === 'free' && subStatus.isExpired;
    const subscriptionExpires = subStatus.expiresAt;
    const trialExpiresAt = subStatus.expiresAt;

    return (
        <>
            <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* Hero Section — compact on mobile */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(37,99,235,0.15),transparent_60%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
                <div className="container mx-auto px-4 py-8 md:py-20 text-center relative">
                    
                    {isTrialExpired && (
                        <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                           <Shield className="h-4 w-4 text-destructive" />
                           <span className="text-destructive-foreground text-sm font-bold">Trial Period Expired</span>
                        </div>
                    )}

                    {/* Badge */}
                    {!isTrialExpired && (
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/30 rounded-full px-3 py-1 mb-4 backdrop-blur-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                            </span>
                            <span className="text-blue-300 text-xs font-semibold tracking-wide">Limited Time Offer — Ends April 30th</span>
                        </div>
                    )}

                    <h1 className="text-2xl md:text-5xl lg:text-6xl font-black tracking-tight mb-2 md:mb-4">
                        {isTrialExpired ? 'Your Trial Has Ended' : 'Supercharge Your'}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">TNPSC Prep</span>
                    </h1>
                    <p className="text-slate-300 text-sm md:text-xl max-w-2xl mx-auto mb-4 md:mb-8">
                        {isTrialExpired 
                          ? 'Your 1-day free trial has expired. Subscribe to continue accessing all tests and features.' 
                          : 'One subscription. All tests, all insights, all the tools you need to crack your exam.'}
                    </p>

                    {hasActiveSubscription ? (
                        <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-4 py-2 text-emerald-300 backdrop-blur-sm">
                            <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                            <div className="text-left">
                                <p className="font-bold text-emerald-200 text-sm">You are a Premium Member! 🎉</p>
                                <p className="text-xs text-emerald-400">
                                    {userProfile?.isAdmin ? 'You have permanent admin access.' : `Active until ${subscriptionExpires?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
                                </p>
                            </div>
                        </div>
                    ) : (
                        isTrialInGrace && (
                            <div className="inline-flex items-center gap-3 bg-blue-500/10 border border-blue-400/30 rounded-xl px-4 py-2 text-blue-300 backdrop-blur-sm">
                                <Zap className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                <div className="text-left">
                                    <p className="font-bold text-blue-200 text-sm">You are in Trial Period! 🚀</p>
                                    <p className="text-xs text-blue-400">
                                    Free access until {trialExpiresAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Main Content — pricing card FIRST on mobile, feature grid second */}
            <div className="container mx-auto px-4 py-6 md:py-12">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8 max-w-5xl mx-auto">

                    {/* PRICING CARD — order-1 on mobile (shows first), order-2 on desktop (shows on right) */}
                    <div className="order-1 lg:order-2 w-full lg:w-[380px] lg:flex-shrink-0">
                        <div className="relative rounded-3xl overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_-10px_rgba(37,99,235,0.25)]">
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                            <div className="absolute top-0 right-6 -translate-y-1/2">
                                <div className="bg-gradient-to-r from-primary to-blue-500 text-white px-4 py-1 rounded-full text-xs font-black tracking-wide shadow-lg shadow-primary/30">
                                    BEST VALUE
                                </div>
                            </div>
                            <div className="bg-card p-6 md:p-8">
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Premium Plan</p>
                                    <h3 className="text-xl font-black text-foreground">Full Access, One Month</h3>
                                </div>
                                <div className="flex items-baseline gap-3 mb-1">
                                    <span className="text-5xl font-black text-foreground">₹99</span>
                                    <span className="text-muted-foreground text-base font-medium">/ month</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-5">
                                    Originally <span className="line-through opacity-50">₹999</span>
                                    <span className="ml-2 text-emerald-500 font-bold">90% OFF</span>
                                </p>
                                {/* Feature list — compact 2-column on mobile */}
                                <ul className="grid grid-cols-2 md:grid-cols-1 gap-y-2 gap-x-2 mb-6">
                                    {features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <div className="flex-shrink-0 h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Check className="h-2.5 w-2.5 text-emerald-500" />
                                            </div>
                                            <span className="text-xs md:text-sm text-foreground/80">{f.label}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    className="w-full h-12 md:h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-black text-base rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-300"
                                    onClick={() => handleSubscribe('Offer Plan', 99)}
                                    disabled={!!hasActiveSubscription}
                                >
                                    {hasActiveSubscription ? (
                                        <span className="flex items-center gap-2"><Check className="h-5 w-5" /> Already Subscribed</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Zap className="h-5 w-5" /> Subscribe Now — ₹99/month</span>
                                    )}
                                </Button>
                                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
                                    Secure payment via Razorpay · Cancel anytime
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="order-2 lg:order-1 flex-1">
                        <h2 className="text-lg md:text-2xl font-bold text-foreground mb-4 md:mb-6">Everything included in Premium</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {features.map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex items-start gap-3 p-3 md:p-4 rounded-2xl bg-muted/30 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer note */}
                <p className="text-center mt-8 text-xs text-muted-foreground">
                    By subscribing you agree to our{' '}
                    <Link href="/terms-and-conditions" className="underline hover:text-primary">Terms & Conditions</Link>
                    {' '}and{' '}
                    <Link href="/refund-policy" className="underline hover:text-primary">Refund Policy</Link>.
                </p>
            </div>
        </>
    );
}


