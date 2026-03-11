'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { TrialExpiryModal } from '@/components/trial-expiry-modal';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [showExpiryModal, setShowExpiryModal] = useState(false);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  useEffect(() => {
    if (userProfile) {
      // Admins should not be affected by subscription status
      if (userProfile.isAdmin) {
        setShowExpiryModal(false);
        return;
      }
      
      const isPremium = userProfile.subscriptionStatus === 'premium';
      const expires = userProfile.subscriptionExpires ? new Date(userProfile.subscriptionExpires) : null;
      const hasExpired = expires ? expires < new Date() : false;

      // Show the modal if the user was premium but their subscription has now expired.
      if (isPremium && hasExpired) {
        setShowExpiryModal(true);
      } else {
        setShowExpiryModal(false);
      }
    }
  }, [userProfile]);

  if (isUserLoading || !user || isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (showExpiryModal) {
    return <TrialExpiryModal isOpen={showExpiryModal} />;
  }

  const getPageTitle = () => {
    if (
      pathname.startsWith('/test/') ||
      pathname.startsWith('/class/') ||
      pathname.startsWith('/exam-wise/') ||
      pathname.startsWith('/previous-year/') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/online-tests') ||
      pathname === '/dashboard'
    ) {
      return '';
    }

    if (pathname === '/bookmarks') {
      return 'Bookmarks';
    }
    
    const segment = pathname.split('/').pop()?.replace(/-/g, '_') || 'dashboard';
    
    return t(segment as any);
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:px-6 sticky top-0 z-40">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            
          </div>
          <Button asChild variant="ghost">
            <Link href="/dashboard">{t('dashboard')}</Link>
          </Button>
           <Button asChild variant="ghost">
            <Link href="/about-us">{t('about_us')}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">{t('contact_us')}</Link>
          </Button>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </header>
        <div className="flex-1 p-4 sm:p-6 bg-background">{children}</div>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
