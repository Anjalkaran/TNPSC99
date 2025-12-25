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
  SidebarGroupLabel
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
  BookOpenCheck
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/online-tests', label: 'Online Tests', icon: FilePenLine },
    { href: '/study-material', label: 'Study Material', icon: BookOpen },
    { href: '/ask-your-doubt', label: 'Ask Your Doubt', icon: HelpCircle },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/exam-history', label: 'Exam History', icon: History },
    { href: '/performance', label: 'Performance', icon: BarChart2 },
    { href: '/leaderboard', label: 'Leaderboard', icon: Award },
    { href: '/feedback', label: 'Feedback', icon: Star },
    { href: '/whatsapp-support', label: 'WhatsApp Support', icon: MessageSquare },
];


export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TNPSC ஏஸ்</span>
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
                    tooltip={{ children: 'Admin' }}
                    >
                    <Shield />
                    <span>Admin</span>
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
                        <span className="text-muted-foreground text-xs">User</span>
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
