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
  useSidebar,
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
  Bookmark,
  Gift,
  Crown,
  Library,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { Button } from './ui/button';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useTranslation } from '@/hooks/use-translation';
import Image from 'next/image';
import { useEffect, useRef, useMemo, type ElementType } from 'react';
import { Skeleton } from './ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SidebarLink {
  href: string;
  label: string;
  icon: ElementType;
  adminOnly?: boolean;
  comingSoon?: boolean;
}

import { getSubscriptionStatus } from '@/lib/subscription-utils';

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { setOpenMobile, setOpen, isMobile } = useSidebar();
  const isInitialRender = useRef(true);

  useEffect(() => {
    // Check for login hint to show sidebar
    const showHint = sessionStorage.getItem('show_sidebar_hint');
    if (showHint === 'true') {
        if (!isMobile) {
            setOpen(true);
            sessionStorage.removeItem('show_sidebar_hint');
        }
        // On mobile, we don't auto-open; layout.tsx will show a highlight instead.
    }

    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    setOpenMobile(false);
  }, [pathname, setOpenMobile, setOpen, isMobile]);

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const subStatus = getSubscriptionStatus(userProfile);

  const usersRef = useMemoFirebase(
    () => (userProfile?.isAdmin && firestore ? collection(firestore, 'users') : null),
    [userProfile?.isAdmin, firestore]
  );
  const { data: users } = useCollection<UserProfile>(usersRef);

  const onlineUsers = useMemo(() => {
    if (!users) return [];
    const now = Date.now();
    const ONLINE_THRESHOLD = 5 * 60 * 1000;
    return users.filter(u => {
      if (!u.lastSeen) return false;
      return now - new Date(u.lastSeen).getTime() < ONLINE_THRESHOLD;
    });
  }, [users]);

  const onlineCount = onlineUsers.length;

  const welcomeName = isUserLoading || isProfileLoading ? '...' : userProfile?.username || t('user');

  const discoveryLinks: SidebarLink[] = [
      { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
      { href: '/performance', label: t('performance'), icon: BarChart2 },
      { href: '/leaderboard', label: t('leaderboard'), icon: Award },
  ];

  const learningLinks: SidebarLink[] = [
      { href: '/study-material', label: t('study_material'), icon: Library },
      { href: '/mistake-vault', label: 'Mistake Vault (தவறு பெட்டகம்)', icon: BookOpen },
      { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
      { href: '/exam-history', label: t('exam_history'), icon: History },
  ];

  const generalLinks: SidebarLink[] = [
      { href: '/profile', label: t('profile'), icon: User },
      { href: '/referrals', label: 'Referrals', icon: Gift },
      { href: '/subscription', label: 'Subscription', icon: Crown },
  ];

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <>
      <SidebarHeader className="bg-background p-4">
        <Link href="/dashboard" className="flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="TNPSC99 Logo" width={180} height={48} priority />
        </Link>
      </SidebarHeader>
      
      <div className="p-4 text-center group-data-[collapsible=icon]:hidden">
        {isUserLoading || isProfileLoading ? (
            <Skeleton className="h-7 w-3/4 mx-auto" />
        ) : (
            <h2 className="text-xl font-bold text-sidebar-foreground truncate">
                {t('welcome_message', { name: welcomeName })}
            </h2>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider group-data-[collapsible=icon]:hidden">Discovery</div>
            <SidebarMenu>
                {discoveryLinks.map((link) => (
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
            </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider group-data-[collapsible=icon]:hidden">Learning</div>
            <SidebarMenu>
                {learningLinks.map((link) => (
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
            </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-2">
            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider group-data-[collapsible=icon]:hidden">General</div>
            <SidebarMenu>
                {generalLinks.map((link) => (
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
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
            {userProfile?.isAdmin && (
                <div className="px-2 mb-2 group-data-[collapsible=icon]:hidden">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span>Online Users: <span className="font-bold">{onlineCount}</span></span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    Online Users ({onlineCount})
                                </DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh] mt-4">
                                <div className="space-y-4 pr-4">
                                    {onlineUsers.length > 0 ? (
                                        onlineUsers.map((u) => (
                                            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                                                        {(u.username || u.email || '?').charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm truncate">{u.username || 'Unknown User'}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                                                </div>
                                                {u.isAdmin && (
                                                    <Badge className="ml-auto text-[10px] scale-90" variant="outline">Admin</Badge>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground text-sm py-8">No users currently online.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
            {user && (
                 <div className="flex flex-col gap-2 p-2">
                    <div className="flex items-center gap-3">
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
                            <span className={cn(
                                "text-xs font-medium",
                                subStatus.status === 'admin' ? "text-emerald-500" :
                                subStatus.status === 'premium' ? "text-amber-500" :
                                subStatus.status === 'trial' ? "text-blue-500" :
                                "text-muted-foreground"
                            )}>
                                {subStatus.status === 'admin' ? 'Admin' : 
                                 subStatus.status === 'premium' ? 'Premium Member' : 
                                 subStatus.status === 'trial' ? 'Trial Period' : 'Free User'}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-auto">
                            <LogOut className="h-4 w-4"/>
                        </Button>
                    </div>

                    {subStatus.status === 'trial' && !subStatus.isExpired && (
                        <Button asChild size="sm" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-[11px] h-8 rounded-lg shadow-sm">
                            <Link href="/subscription" className="flex items-center justify-center gap-1.5">
                                <Crown className="h-3 w-3" />
                                Upgrade to Premium
                            </Link>
                        </Button>
                    )}
                 </div>
            )}
        </SidebarGroup>
      </SidebarFooter>
    </>
  );
}
