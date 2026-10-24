'use client';

import Link from 'next/link';
import {
  BookOpenCheck,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import { ThemeSwitcher } from './theme-switcher';


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
        <Link href="/">
          <Image src="/logo.png" alt="TNPSC99 Logo" width={180} height={48} className="h-10 w-auto object-contain" priority />
        </Link>
        <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-2 lg:gap-4">
                <Button asChild variant="ghost">
                  <Link href="/">{t('home')}</Link>
                </Button>
                <Button asChild variant="ghost" className="text-primary font-bold">
                  <Link href="/subscription">{t('nav_mcq_academy')}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/about-us">{t('about_us')}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/contact">{t('contact_us')}</Link>
                </Button>
            </nav>
            
            <div className="flex items-center gap-2">
                <UserNav />
                <LanguageSwitcher />
                <ThemeSwitcher />
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                    <SheetHeader>
                      <SheetTitle className="text-left">
                        <Image src="/logo.png" alt="TNPSC99 Logo" width={140} height={36} className="h-8 w-auto object-contain" />
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-4 mt-8">
                      <Link href="/" className="text-lg font-medium hover:text-primary transition-colors">
                        {t('home')}
                      </Link>
                      <Link href="/subscription" className="text-lg font-bold text-primary flex items-center justify-between">
                        <span>{t('nav_mcq_academy')}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">₹99/mo</span>
                      </Link>
                      <Link href="/about-us" className="text-lg font-medium hover:text-primary transition-colors">
                        {t('about_us')}
                      </Link>
                      <Link href="/contact" className="text-lg font-medium hover:text-primary transition-colors">
                        {t('contact_us')}
                      </Link>
                    </nav>
                  </SheetContent>
                </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
}
