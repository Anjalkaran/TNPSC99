'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/hooks/use-translation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  // The home page is now public and has its own layout.
  // We only handle authenticated routes here.
  useEffect(() => {
    if(!isUserLoading && user && pathname === '/') {
        router.push('/dashboard');
    }
  },[user, isUserLoading, pathname, router])


  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  const getPageTitle = () => {
    // These paths have dynamic titles set by their respective page components.
    // Return a generic or empty title to avoid showing garbled URL slugs.
    if (pathname.startsWith('/test/') || pathname.startsWith('/class/')) {
        return t('online_tests'); 
    }
    
    // For other static pages, derive the title from the path.
    const segment = pathname.split('/').pop()?.replace('-', ' ') || 'dashboard';
    // Use translation key that matches the segment
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
            <h1 className="text-lg font-semibold md:text-xl capitalize">{getPageTitle()}</h1>
          </div>
          <LanguageSwitcher />
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
