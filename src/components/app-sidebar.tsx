'use client';

import Link from 'next/link';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Shield,
  FilePenLine,
  BookOpen,
  HelpCircle,
  User,
  History,
  BarChart2,
  Award,
  Star,
  MessageSquare,
  LogOut,
  BookOpenCheck,
  Bookmark
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import Image from 'next/image';


export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const allSidebarLinks = [
      { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
      { href: '/online-tests', label: t('online_tests'), icon: FilePenLine },
      { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { href: '/study-material', label: t('study_material'), icon: BookOpen, adminOnly: true },
      { href: '/ask-your-doubt', label: t('ask_your_doubt'), icon: HelpCircle, adminOnly: true },
      { href: '/profile', label: t('profile'), icon: User },
      { href: '/exam-history', label: t('exam_history'), icon: History },
      { href: '/performance', label: t('performance'), icon: BarChart2 },
      { href: '/leaderboard', label: t('leaderboard'), icon: Award },
      { href: '/feedback', label: t('feedback'), icon: Star, adminOnly: true },
      { href: '/whatsapp-support', label: t('whatsapp_support'), icon: MessageSquare, adminOnly: true },
  ];

  const sidebarLinks = allSidebarLinks.filter(link => !link.adminOnly || userProfile?.isAdmin);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo.png" alt="TNPSC99 Logo" width={150} height={40} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {sidebarLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href}>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={{ children: link.label }}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          {userProfile?.isAdmin && (
            <SidebarMenuItem>
                 <Link href="/admin">
                    <SidebarMenuButton
                    isActive={pathname.startsWith('/admin')}
                    tooltip={{ children: t('admin') }}
                    >
                    <Shield />
                    <span>{t('admin')}</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
            {user && (
                 <div className="flex items-center gap-3 p-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? ''} />
                        <AvatarFallback>
                        {user.displayName
                            ? user.displayName.charAt(0)
                            : user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm truncate">
                        <span className="font-semibold">{user.displayName || user.email}</span>
                        <span className="text-muted-foreground text-xs">{t('user')}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-auto">
                        <LogOut className="h-4 w-4"/>
                    </Button>
                 </div>
            )}
        </SidebarGroup>
      </SidebarFooter>
    </>
  );
}
