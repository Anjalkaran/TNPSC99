'use client';

import React, { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function withAdminAuth<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithAdminAuthComponent = (props: P) => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userProfileRef = useMemoFirebase(
      () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isUserLoading || isProfileLoading;

    useEffect(() => {
      // Don't do anything while loading
      if (isLoading) {
        return;
      }

      // After loading, if there's no user or the user is not an admin, redirect
      if (!user || !userProfile?.isAdmin) {
        router.replace('/dashboard');
      }
    }, [isLoading, user, userProfile, router]);
    
    // While loading, show a clear loading screen.
    if (isLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
          <div className="text-lg font-semibold">அணுகலைச் சரிபார்க்கிறது...</div>
        </div>
      );
    }

    // After loading, if the user is an admin, render the component.
    // The useEffect will handle the redirect for non-admins.
    if (user && userProfile?.isAdmin) {
      return <WrappedComponent {...props} />;
    }

    // Fallback case, typically shown just before redirection
    return (
        <div className="flex min-h-screen w-full items-center justify-center">
          <div className="text-lg font-semibold">அனுமதியற்றது. திருப்பி விடப்படுகிறது...</div>
        </div>
      );
  };

  WithAdminAuthComponent.displayName = `WithAdminAuth(${(WrappedComponent.displayName || WrappedComponent.name || 'Component')})`;

  return WithAdminAuthComponent;
}
