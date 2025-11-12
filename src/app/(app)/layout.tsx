'use client';

import { SiteHeader } from '@/components/site-header';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/') {
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  if (isUserLoading && pathname !== '/') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // For the home page, we don't want to enforce auth, but we want the layout
  if (pathname === '/') {
    return (
        <div className="relative flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
        </div>
    )
  }

  // For other app pages, enforce auth
  if (!user) {
    // This can show a brief loading state or redirect immediately
    // The useEffect above will handle the redirect.
    return (
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
