'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookCopy,
  Archive,
  Flame,
  Book,
  Search,
  Sparkles,
  ChevronRight,
  Globe,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
  CardHeader,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Crown } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const subStatus = getSubscriptionStatus(userProfile);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    {
      title: t('class_wise_tests'),
      href: '/class-wise',
      icon: <Book className="h-10 w-10 text-blue-500" />,
      description: "Class by class curriculum prep",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t('group_1_tests'),
      href: '/exam-wise/group-1',
      icon: <Flame className="h-10 w-10 text-red-500" />,
      description: "Elite level civil service prep",
      bgColor: "bg-red-500/10",
    },
    {
      title: t('group_2_tests'),
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-10 w-10 text-emerald-500" />,
      description: "Executive & Non-executive prep",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: t('group_4_tests'),
      href: '/exam-wise/group-4',
      icon: <Archive className="h-10 w-10 text-amber-500" />,
      description: "VAO and Group IV focused tests",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-16 max-w-6xl overflow-hidden">
      {/* Trial Banner */}
      {subStatus.status === 'trial' && !subStatus.isExpired && (
        <section className="mb-8 p-0.5 rounded-[2rem] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="bg-card rounded-[1.95rem] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                        <Crown className="h-7 w-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground leading-tight">You're on Free Trial! 🚀</h3>
                        <p className="text-sm text-muted-foreground font-medium">
                            Upgrade to Premium for unlimited access to all tests & features.
                            {subStatus.hoursRemaining && subStatus.hoursRemaining <= 12 && (
                                <span className="text-orange-600 font-bold ml-1">Expires in {subStatus.hoursRemaining} hours!</span>
                            )}
                        </p>
                    </div>
                </div>
                <Link href="/subscription" className="w-full md:w-auto">
                    <button className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        UPGRADE NOW — ₹99
                    </button>
                </Link>
            </div>
        </section>
      )}

      {/* Welcome & Search Section */}
      <section className="mb-10 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-6 md:p-8 text-white shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[100%] bg-white/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[100%] bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
            <h1 className="text-2xl md:text-4xl font-black mb-2 tracking-tight drop-shadow-sm">
                Welcome back, <span className="text-white drop-shadow-md">{user?.displayName?.split(' ')[0] || 'Aspirant'}</span>!
            </h1>
            <p className="text-white/90 text-base md:text-lg mb-6 max-w-xl font-medium">
                Find your next test and keep climbing the leaderboard.
            </p>
            
            <form onSubmit={handleSearch} className="w-full max-w-md group">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-white/70 group-focus-within:text-white transition-colors" />
                    <Input
                        type="search"
                        placeholder="Search for a specific test or topic..."
                        className="w-full pl-12 h-12 text-lg bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-2xl focus-visible:ring-white/50 focus-visible:ring-offset-0 focus-visible:bg-white/30 transition-all shadow-inner backdrop-blur-md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </form>
        </div>
      </section>

      {/* Test Library Section */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
            <div>
                <h2 className="text-xl font-black text-foreground">Test Library</h2>
                <p className="text-muted-foreground font-medium text-sm">Organized mock tests</p>
            </div>
            <div className="h-px bg-border flex-grow mx-8 hidden md:block" />
        </div>

        <Accordion type="multiple" defaultValue={["tamil-medium"]} className="space-y-6">
          {/* Tamil Medium Accordion */}
          <AccordionItem value="tamil-medium" className="border border-border rounded-3xl shadow-sm overflow-hidden bg-card hover:border-primary/50 transition-colors">
            <AccordionTrigger className="hover:no-underline py-6 px-4 md:px-8 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Book className="h-7 w-7" />
                </div>
                <div className="text-left">
                    <span className="text-xl font-black tracking-tight block text-foreground">{t('tamil_medium')}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{categories.length} Preparation Tests Available</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-8 px-4 md:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                {categories.map((category) => (
                  <Link href={category.href} key={category.title} className="block group">
                    <Card className="flex flex-col h-full border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[2rem] overflow-hidden bg-muted/30 group-hover:bg-card">
                      <CardHeader className="p-6 pb-2 flex flex-col items-center text-center">
                          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-inner", category.bgColor)}>
                              {category.icon}
                          </div>
                      </CardHeader>
                      <CardContent className="px-6 pb-2 text-center">
                        <CardTitle className="text-lg font-bold mb-2 text-foreground">{category.title}</CardTitle>
                        <p className="text-sm text-muted-foreground font-semibold line-clamp-2">{category.description}</p>
                      </CardContent>
                      <CardFooter className="px-6 pb-6 pt-4 flex flex-col items-center text-center">
                        <div className="w-full flex items-center justify-center gap-3 text-base font-bold text-primary transition-all group-hover:scale-105">
                          <span className="group-hover:underline uppercase tracking-tight">Start Test</span>
                          <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* English Medium Accordion */}
          <AccordionItem value="english-medium" className="border border-border rounded-3xl shadow-sm overflow-hidden bg-card hover:border-amber-500/50 transition-colors">
            <AccordionTrigger className="hover:no-underline py-6 px-4 md:px-8 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Globe className="h-7 w-7" />
                </div>
                <div className="text-left">
                    <span className="text-xl font-black tracking-tight block text-foreground">{t('english_medium')}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Coming Soon</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-8 px-4 md:px-8">
              <Card className="border-dashed border-2 border-border bg-muted/30 rounded-[2rem]">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Archive className="h-16 w-16 text-muted-foreground/30 mb-6 animate-pulse" />
                  <h3 className="text-2xl font-black text-foreground">{t('coming_soon')}</h3>
                  <p className="text-muted-foreground mt-2 font-medium max-w-sm">English medium study materials and tests are being meticulously curated by our experts.</p>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
