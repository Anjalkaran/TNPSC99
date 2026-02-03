'use client';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useParams, notFound, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BarChart2, History } from 'lucide-react';

export default function UserAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const params = useParams();
  const pathname = usePathname();

  // Wait until params are available on the client
  if (!params || !params.userId) {
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
        </div>
    );
  }
  
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : undefined;

  const userRef = useMemoFirebase(() => (userId && firestore ? doc(firestore, 'users', userId) : null), [userId, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userRef);
  
  if (isProfileLoading) {
    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
        </div>
    );
  }

  if (!userProfile) {
    return notFound();
  }

  const navLinks = [
      { href: `/admin/users/${params.userId}/history`, label: 'Exam History', icon: History },
      { href: `/admin/users/${params.userId}/performance`, label: 'Performance Report', icon: BarChart2 }
  ]

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Admin View: {userProfile.username}</h1>
                <p className="text-muted-foreground">{userProfile.email}</p>
            </div>
            <div className="flex items-center gap-2 border bg-muted p-1 rounded-lg">
                 {navLinks.map(link => (
                    <Button key={link.href} asChild variant={pathname === link.href ? 'background' : 'ghost'} className="flex-1 justify-center">
                        <Link href={link.href}>
                            <link.icon className="mr-2 h-4 w-4" />
                            {link.label}
                        </Link>
                    </Button>
                ))}
            </div>
        </div>
        <div>
            {children}
        </div>
    </div>
  );
}
