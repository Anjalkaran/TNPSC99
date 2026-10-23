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
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  History,
  BookOpen
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
  CardDescription,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { cn } from '@/lib/utils';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import { doc, collection, query, orderBy, limit } from 'firebase/firestore';
import type { UserProfile, UserTestAttempt, MistakeVaultItem } from '@/lib/types';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { computeStudentProgress } from '@/lib/deterministic-progress';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. User Profile & Subscription
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const subStatus = getSubscriptionStatus(userProfile);

  // 2. Test Attempts for Learning Progress
  const attemptsColRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, `users/${user.uid}/testAttempts`) : null),
    [user, firestore]
  );
  const attemptsQuery = useMemoFirebase(
    () => (attemptsColRef ? query(attemptsColRef, orderBy('lastUpdatedDate', 'desc'), limit(50)) : null),
    [attemptsColRef]
  );
  const { data: attempts = [] } = useCollection<UserTestAttempt>(attemptsQuery);

  // 3. Mistake Vault Items
  const mistakeColRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, `users/${user.uid}/mistakeVault`) : null),
    [user, firestore]
  );
  const mistakeQuery = useMemoFirebase(
    () => (mistakeColRef ? query(mistakeColRef, orderBy('lastFailedDate', 'desc'), limit(100)) : null),
    [mistakeColRef]
  );
  const { data: mistakes = [] } = useCollection<MistakeVaultItem>(mistakeQuery);

  // 4. Deterministic Progress Analytics
  const progress = useMemo(() => {
    return computeStudentProgress(attempts, mistakes);
  }, [attempts, mistakes]);

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
    <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl space-y-8">
      {/* Trial Banner */}
      {subStatus.status === 'trial' && !subStatus.isExpired && (
        <section className="p-0.5 rounded-[2rem] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 shadow-lg animate-in fade-in slide-in-from-top-4 duration-1000">
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
              <Button size="lg" className="w-full md:w-auto h-11 px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>இணைந்திடுக — ₹99/மாதம்</span>
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Welcome & Search Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-slate-900 p-6 md:p-8 text-primary-foreground shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left w-full md:w-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>TNPSC Academy Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
              வணக்கம், {user?.displayName?.split(' ')[0] || 'மாணவரே'}!
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base font-medium max-w-lg">
              கற்றல் துல்லியம், தவறு பெட்டகம் மற்றும் பாடவாரியான மாதிரித் தேர்வுகள் மூலம் வெற்றியை நோக்கி முன்னேறுங்கள்.
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full md:w-80 group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/60 group-focus-within:text-primary-foreground transition-colors" />
              <Input
                type="search"
                placeholder="பாடம் அல்லது தலைப்பைத் தேடுக..."
                className="w-full pl-11 h-11 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-2xl focus-visible:ring-white/40 shadow-inner backdrop-blur-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
      </section>

      {/* PHASE 3C: DETERMINISTIC LEARNING PROGRESS & MASTERY METRICS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">கற்றல் முன்னேற்றம் (Learning Mastery)</h2>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">கணிதரீதியான உண்மைப் பதிவுகள் (Deterministic Analytics)</p>
          </div>
          <Link href="/mistake-vault">
            <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold text-primary border-primary/30">
              தவறு பெட்டகம் ({progress.unresolvedMistakesCount})
            </Button>
          </Link>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall Accuracy */}
          <Card className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">துல்லியம் (Accuracy)</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">{progress.overallAccuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {progress.totalCorrect} / {progress.totalQuestionsAttempted} வினாக்கள் சரி
              </p>
            </div>
            <Progress value={progress.overallAccuracy} className="h-1.5 mt-3" />
          </Card>

          {/* Card 2: Completed Tests */}
          <Card className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">முடித்த தேர்வுகள்</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">{progress.completedAttempts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {progress.totalAttempts} மொத்தத் தொடக்கங்கள்
              </p>
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-3">
              சுய-கற்றல் & தேர்வுக் கூடப் பதிவுகள்
            </div>
          </Card>

          {/* Card 3: Mistake Vault */}
          <Card className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-colors ${
            progress.unresolvedMistakesCount > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-card'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-700 uppercase">தவறு பெட்டகம்</span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-900">{progress.unresolvedMistakesCount}</div>
              <p className="text-xs text-rose-700 mt-1">சரிசெய்ய வேண்டிய வினாக்கள்</p>
            </div>
            <Link href="/mistake-vault" className="mt-3">
              <span className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1">
                பெட்டகத்தைப் பார்வையிட <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </Card>

          {/* Card 4: Recommended Action */}
          <Card className="rounded-2xl border bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border-blue-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-800 uppercase">அடுத்த இலக்கு</span>
              <RotateCcw className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 line-clamp-1">
                {progress.recommendedRevision?.title || 'மாதிரித் தேர்வு எழுத'}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {progress.recommendedRevision?.description || 'பாடவாரியான தேர்வுகளை எழுதித் தொடங்குங்கள்.'}
              </p>
            </div>
            {progress.recommendedRevision ? (
              <Link
                href={
                  progress.recommendedRevision.type === 'mistake_vault'
                    ? `/revision?source=mistake_vault&count=${Math.min(20, progress.unresolvedMistakesCount)}`
                    : `/revision?source=weak_chapter&chapterId=${progress.recommendedRevision.targetChapterId || ''}`
                }
                className="mt-3"
              >
                <Button size="sm" className="w-full h-8 text-xs font-bold bg-[#1e3a8a] text-white rounded-xl">
                  திருப்புதல் தொடங்கு ({progress.recommendedRevision.availableQuestionCount})
                </Button>
              </Link>
            ) : (
              <Link href="/class-wise" className="mt-3">
                <Button size="sm" variant="outline" className="w-full h-8 text-xs font-bold rounded-xl">
                  தேர்வைத் தேர்வு செய்க
                </Button>
              </Link>
            )}
          </Card>
        </div>
      </section>

      {/* PHASE 3C: CHAPTER-LEVEL MASTERY STATUS ACCORDION */}
      {progress.subjects.length > 0 && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">பாடவாரியான கற்றல் நிலை (Chapter Mastery)</h3>
              <p className="text-xs text-muted-foreground">குறைந்தபட்சம் 2 தேர்வுகள் மற்றும் 5 வினாக்களுக்குப் பின்னரே தேர்ச்சி கணக்கிடப்படுகிறது.</p>
            </div>
          </div>

          <div className="space-y-4">
            {progress.subjects.map((sub) => (
              <div key={sub.subjectId} className="border border-border/80 rounded-2xl p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{sub.subjectName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {sub.masteredChapters} / {sub.totalChapters} இயல்கள் தேர்ச்சி
                    </Badge>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">சராசரி: {sub.averageAccuracy}%</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sub.chapters.map((ch) => (
                    <div
                      key={ch.chapterId}
                      className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-foreground">{ch.chapterName}</div>
                        <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                          <span>துல்லியம்: {ch.accuracy}%</span>
                          <span>•</span>
                          <span>எழுதியது: {ch.repetition} முறை</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {ch.confidence === 'insufficient_data' ? (
                          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                            போதிய தரவு இல்லை
                          </Badge>
                        ) : ch.masteryStatus === 'mastered' ? (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">
                            தேர்ச்சி பெற்றது
                          </Badge>
                        ) : ch.masteryStatus === 'needs_focus' ? (
                          <Badge className="text-[10px] bg-rose-100 text-rose-800 border-rose-200">
                            கவனம் தேவை
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            பயிற்சியில்
                          </Badge>
                        )}

                        <Link href={`/test/${ch.chapterId}`}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Test Library Section */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h2 className="text-xl font-black text-foreground">மாதிரித் தேர்வுகள் (Test Library)</h2>
            <p className="text-muted-foreground font-medium text-xs sm:text-sm">சமச்சீர் பாடநூல் & TNPSC முந்தைய வினாத்தாள்கள்</p>
          </div>
          <div className="h-px bg-border flex-grow mx-8 hidden md:block" />
        </div>

        <Accordion type="multiple" defaultValue={["tamil-medium"]} className="space-y-6">
          {/* Tamil Medium Accordion */}
          <AccordionItem value="tamil-medium" className="border border-border rounded-3xl shadow-sm overflow-hidden bg-card hover:border-primary/50 transition-colors">
            <AccordionTrigger className="hover:no-underline py-6 px-4 md:px-8 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-2xl bg-[#1e3a8a] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Book className="h-7 w-7" />
                </div>
                <div className="text-left">
                  <span className="text-xl font-black tracking-tight block text-foreground">{t('tamil_medium')}</span>
                  <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">{categories.length} Preparation Tests Available</span>
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
                  <span className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest">Coming Soon</span>
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
