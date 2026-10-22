import { UserProfile } from './types';

export const TRIAL_DAYS = 1;

export type SubscriptionType = 'admin' | 'premium' | 'trial' | 'free';

export interface SubscriptionStatus {
    status: SubscriptionType;
    daysRemaining?: number;
    hoursRemaining?: number;
    expiresAt?: Date;
    isExpired: boolean;
}

/**
 * Accurately determines the user's subscription and access tier.
 * Strict, deterministic validation with zero loophole fallbacks.
 */
export function getSubscriptionStatus(userProfile: UserProfile | null | undefined): SubscriptionStatus {
    if (!userProfile) {
        return { status: 'free', isExpired: true };
    }

    if (userProfile.isAdmin || userProfile.role === 'admin') {
        return { status: 'admin', isExpired: false };
    }

    const now = new Date();

    // 1. Check for Active Premium Subscription (Paid ₹99/month tier)
    if (userProfile.subscriptionStatus === 'premium' && userProfile.subscriptionExpires) {
        const subExpires = new Date(userProfile.subscriptionExpires);
        if (!isNaN(subExpires.getTime()) && subExpires > now) {
            const daysRemaining = Math.ceil((subExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                status: 'premium',
                daysRemaining,
                expiresAt: subExpires,
                isExpired: false,
            };
        }
    }

    // 2. Check for 24-hour New Account Trial Period
    // Only valid if a real registrationDate or createdAt timestamp exists
    const regTimestamp = userProfile.registrationDate || userProfile.createdAt;
    if (regTimestamp) {
        const regDate = new Date(regTimestamp);
        if (!isNaN(regDate.getTime())) {
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
                    isExpired: false,
                };
            }
        }
    }

    // 3. Expired or Standard Free Tier
    return {
        status: 'free',
        isExpired: true,
        expiresAt: regTimestamp ? new Date(new Date(regTimestamp).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : undefined,
    };
}

/**
 * Returns true if the user possesses authorized access to premium features (Admin, Premium, or Active Trial).
 */
export function hasActiveSubscription(userProfile: UserProfile | null | undefined): boolean {
    const { isExpired } = getSubscriptionStatus(userProfile);
    return !isExpired;
}
