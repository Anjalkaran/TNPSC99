'use client';

import Link from 'next/link';
import {
  BookOpenCheck,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { LanguageSwitcher } from './language-switcher';
import Image from 'next/image';


function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = getFirestore(auth.app);
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect or show toast on successful logout
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isUserLoading) {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/login">{t('login')}</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">{t('register')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
            <AvatarFallback>
              {user.displayName
                ? user.displayName.charAt(0)
                : user.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>{t('profile')}</span>
          </Link>
        </DropdownMenuItem>
        {userProfile?.isAdmin && (
           <DropdownMenuItem asChild>
           <Link href="/admin">
             <LayoutDashboard className="mr-2 h-4 w-4" />
             <span>{t('admin')}</span>
           </Link>
         </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="https://firebasestorage.googleapis.com/v0/b/studio-5029416251-928dd.firebasestorage.app/o/final%20tnpsc99.png?alt=media&token=45dc292d-a09c-49de-aa14-9ed0ae769c47" alt="TNPSC99 Logo" width={150} height={40} />
        </Link>
        <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/">{t('home')}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/contact">{t('contact_us')}</Link>
            </Button>
            <LanguageSwitcher />
            <UserNav />
        </div>
      </div>
    </header>
  );
}
