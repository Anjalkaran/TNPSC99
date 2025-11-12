'use client';

import Link from 'next/link';
import {
  BookOpenCheck,
  Menu,
  ChevronDown,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, getFirestore } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

const classLinks = [
  { href: '/class/6', label: 'VI ஆம் வகுப்பு' },
  { href: '/class/7', label: 'VII ஆம் வகுப்பு' },
  { href: '/class/8', label: 'VIII ஆம் வகுப்பு' },
  { href: '/class/9', label: 'IX ஆம் வகுப்பு' },
  { href: '/class/10', label: 'X ஆம் வகுப்பு' },
];

const mainNavLinks = [
  { href: '/subject-wise', label: 'பாடம் வாரியான தேர்வுகள்' },
  { href: '/previous-year', label: 'முந்தைய ஆண்டு தாள்கள்' },
];

function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = getFirestore(auth.app);

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
          <Link href="/login">உள்நுழைக</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">பதிவு செய்க</Link>
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
            <span>சுயவிவரம்</span>
          </Link>
        </DropdownMenuItem>
        {userProfile?.isAdmin && (
           <DropdownMenuItem asChild>
           <Link href="/admin">
             <LayoutDashboard className="mr-2 h-4 w-4" />
             <span>நிர்வாகம்</span>
           </Link>
         </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>வெளியேறு</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">TNPSC ஏஸ்</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center font-medium text-muted-foreground transition-colors hover:text-foreground">
              வகுப்பு வாரியான தேர்வுகள்{' '}
              <ChevronDown className="relative top-[1px] ml-1 h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {classLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {mainNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex">
            <UserNav />
          </div>
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">பட்டி</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <nav className="grid gap-6 text-lg font-medium mt-8">
                  <Link
                    href="/"
                    className="flex items-center gap-2 mb-4 text-xl"
                  >
                    <BookOpenCheck className="h-7 w-7 text-primary" />
                    <span className="font-bold">TNPSC ఏస్</span>
                  </Link>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="class-wise" className="border-b-0">
                      <AccordionTrigger className="text-muted-foreground hover:text-foreground py-2">
                        வகுப்பு வாரியான தேர்வுகள்
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <nav className="grid gap-4">
                          {classLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="text-muted-foreground hover:text-foreground text-base"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </nav>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {mainNavLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-4">
                    <UserNav />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
