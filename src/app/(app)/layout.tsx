'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Pointer } from 'lucide-react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { cn } from '@/lib/utils';

import { getSubscriptionStatus } from '@/lib/subscription-utils';

const PUBLIC_PATHS = [
  '/subscription', 
  '/contact', 
  '/about-us', 
  '/terms-and-conditions', 
  '/privacy-policy', 
  '/refund-policy',
  '/test-preview',
  '/phase3c-preview'
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [showHint, setShowHint] = useState(false);

  const isAllowedPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path));

  useEffect(() => {
    // Check for login hint to show sidebar highlight on mobile
    const hint = sessionStorage.getItem('show_sidebar_hint');
    if (hint === 'true') {
        setShowHint(true);
    }
  }, []);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (isUserLoading || (user && isProfileLoading)) {
        return; // Wait until user and profile data have loaded
    }

    if (!user) {
      if (!isAllowedPath) {
        router.push('/login');
      }
      return;
    }

    if (userProfile) {
      const { status, isExpired } = getSubscriptionStatus(userProfile);

      if (status === 'admin') {
        return;
      }

      // Force redirect to subscription if expired and not on an allowed path
      if (isExpired && !isAllowedPath) {
        router.push('/subscription');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, pathname, router, isAllowedPath]);

  const handleLogout = async () => {
    if (auth) {
        sessionStorage.removeItem('sessionId');
        try {
           await signOut(auth);
           router.push('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    }
  };

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Allow unauthenticated visitors to view public pages (e.g., /subscription, /about-us) with public navigation
  if (!user) {
    if (isAllowedPath) {
      return (
        <div className="flex min-h-screen flex-col bg-background">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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
          <div className="relative">
            <SidebarTrigger 
              className={cn(
                "md:hidden",
                showHint && "ring-2 ring-primary ring-offset-2 animate-pulse"
              )} 
              onClick={() => {
                setShowHint(false);
                sessionStorage.removeItem('show_sidebar_hint');
              }}
            />
            {showHint && (
              <div className="absolute -bottom-8 -right-8 animate-bounce md:hidden pointer-events-none z-50">
                <div className="flex flex-col items-center">
                   <Pointer className="size-6 text-primary fill-primary rotate-[-45deg]" />
                   <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1 rounded whitespace-nowrap">
                     Click here
                   </span>
                </div>
              </div>
            )}
          </div>
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
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-muted-foreground hover:text-destructive shrink-0">
            <LogOut className="h-5 w-5" />
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
