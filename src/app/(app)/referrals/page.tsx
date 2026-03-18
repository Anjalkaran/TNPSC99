'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Copy, Gift, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';

const REFERRAL_GOAL = 10;

export default function ReferralsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  useEffect(() => {
    // When profile is loaded, check if referralCode exists. If not, create it.
    if (userProfile && !userProfile.referralCode && userProfileRef && user) {
      const generateReferralCode = async () => {
        const newReferralCode = user.uid.slice(0, 8);
        try {
          await updateDoc(userProfileRef, { referralCode: newReferralCode });
          toast({
            title: "Referral Code Generated!",
            description: "Your unique referral code has been created.",
          });
        } catch (error) {
          console.error("Failed to update user with referral code", error);
        }
      };
      generateReferralCode();
    }
  }, [userProfile, userProfileRef, user, toast]);

  useEffect(() => {
    if (userProfile && userProfile.referralCount >= REFERRAL_GOAL && userProfile.subscriptionStatus !== 'premium') {
      const grantReferralAccess = async () => {
        if (userProfileRef) {
          const newExpiry = new Date();
          newExpiry.setMonth(newExpiry.getMonth() + 1);
          await updateDoc(userProfileRef, {
            subscriptionStatus: 'premium',
            subscriptionExpires: newExpiry.toISOString(),
          });
          toast({
            title: 'Reward Unlocked!',
            description: 'Congratulations! You have earned a one-month free subscription.',
          });
        }
      };
      grantReferralAccess();
    }
  }, [userProfile, userProfileRef, toast]);


  const copyToClipboard = () => {
    if (userProfile?.referralCode) {
      const referralLink = `https://tnpsc99.com/signup?ref=${userProfile.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: 'Referral Link Copied!',
        description: 'Your referral link has been copied to the clipboard.',
      });
    }
  };

  const handleShare = async () => {
    if (userProfile?.referralCode) {
      const referralLink = `https://tnpsc99.com/signup?ref=${userProfile.referralCode}`;
      const shareData = {
        title: 'Join me on TNPSC99!',
        text: `Use my referral code to sign up for TNPSC99 and get started with your exam preparation.`,
        url: referralLink,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast({
            title: 'Link Shared!',
            description: 'Thank you for sharing!',
          });
        } catch (error) {
          console.log('Share was cancelled or failed', error);
        }
      } else {
        navigator.clipboard.writeText(referralLink);
        toast({
          title: 'Link Copied!',
          description: 'Your referral link has been copied to the clipboard. Share it with your friends!',
        });
      }
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  const referrals = userProfile?.referralCount || 0;
  const progress = (referrals / REFERRAL_GOAL) * 100;
  
  const hasActiveSubscription = userProfile?.subscriptionStatus === 'premium' && 
                                userProfile.subscriptionExpires && 
                                new Date(userProfile.subscriptionExpires) > new Date();

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Gift className="h-6 w-6 text-primary" />
            User Referral Program
          </CardTitle>
          <CardDescription>
            Invite 10 friends to get a one month free subscription to all tests. Share your referral link and track your progress here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ) : userProfile ? (
            <>
              <div>
                <label htmlFor="referral-code" className="text-sm font-medium">Your Unique Referral Code</label>
                <div className="flex w-full items-center space-x-2 mt-1">
                  <Input id="referral-code" value={userProfile.referralCode || ''} readOnly />
                  <Button type="button" size="icon" onClick={copyToClipboard} aria-label="Copy referral link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" onClick={handleShare} aria-label="Share referral link">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                    <p className="font-medium">Your Referral Progress</p>
                    <p className="text-lg font-bold">{referrals} <span className="text-sm font-normal text-muted-foreground">/ {REFERRAL_GOAL} referrals</span></p>
                </div>
                <Progress value={progress} className="w-full h-3" />
              </div>
              
              {referrals >= REFERRAL_GOAL ? (
                 <div className="p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg text-center">
                    <p className="font-bold">Congratulations!</p>
                    <p>{hasActiveSubscription ? "Your one-month free subscription has been applied!" : "You have earned a one month free subscription!"}</p>
                 </div>
              ) : (
                <div className="text-center text-muted-foreground">
                    <p>Refer {REFERRAL_GOAL - referrals} more friends to get a one month free subscription.</p>
                </div>
              )}
            </>
          ) : (
             <div className="text-center text-destructive">
                Could not load your referral information. Please try again later.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
