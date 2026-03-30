import { UserProfile } from './types';

export const TRIAL_DAYS = 1;

export type SubscriptionType = 'admin' | 'premium' | 'trial' | 'free';

interface SubscriptionStatus {
    status: SubscriptionType;
    daysRemaining?: number;
    hoursRemaining?: number;
    expiresAt?: Date;
    isExpired: boolean;
}

export function getSubscriptionStatus(userProfile: UserProfile | null | undefined): SubscriptionStatus {
    if (!userProfile) {
        return { status: 'free', isExpired: true };
    }

    if (userProfile.isAdmin) {
        return { status: 'admin', isExpired: false };
    }

    // 1. Check for Active Premium Subscription
    const now = new Date();
    const subExpires = userProfile.subscriptionExpires ? new Date(userProfile.subscriptionExpires) : null;
    const isPremium = userProfile.subscriptionStatus === 'premium';
    
    if (isPremium && subExpires && subExpires > now) {
        const daysRemaining = Math.ceil((subExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            status: 'premium',
            daysRemaining,
            expiresAt: subExpires,
            isExpired: false
        };
    }

    // 2. Check for Trial Period
    const regDate = new Date(userProfile.registrationDate || now);
    const trialExpiresAt = new Date(regDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    
    if (now < trialExpiresAt) {
        const diffMs = trialExpiresAt.getTime() - now.getTime();
        const hoursRemaining = Math.ceil(diffMs / (1000 * 60 * 60));
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return {
            status: 'trial',
            daysRemaining,
            hoursRemaining,
            expiresAt: trialExpiresAt,
            isExpired: false
        };
    }

    // 3. Fallback to Free (Expired) or No Profile
    return {
        status: 'free',
        isExpired: true,
        expiresAt: userProfile?.registrationDate ? new Date(new Date(userProfile.registrationDate).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : undefined
    };
}
