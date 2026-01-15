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
import { Logo } from './icons';


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
          <Link href="/signup">{t('sign_up')}</Link>
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
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <UserNav />
        </div>
      </div>
    </header>
  );
}
