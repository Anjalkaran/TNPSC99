'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  FileText,
  ClipboardList,
  Layers,
  Globe,
  Archive,
  Newspaper,
  ArrowRight,
  Download,
  Flame,
  BookCopy,
  BarChart2,
  BookOpenCheck,
  CheckCircle2,
  Users,
  Trophy,
  Book,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { useUser } from '@/firebase';
import React, { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { SiteFooter } from '@/components/site-footer';
import { cn } from "@/lib/utils";

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground animate-pulse">Loading your experience...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <BookOpenCheck className="h-8 w-8 text-primary" />,
      title: 'Syllabus wise test',
      description: 'Comprehensive coverage of the TNPSC curriculum.',
      href: '/subject-wise'
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: 'PDF Notes',
      description: 'Expertly curated study materials (Coming Soon).',
      href: '#',
      comingSoon: true
    },
    {
      icon: <Archive className="h-8 w-8 text-primary" />,
      title: 'Previous Year',
      description: 'Analyze patterns from 10+ years of exams.',
      href: '/previous-year'
    },
    {
        icon: <Newspaper className="h-8 w-8 text-primary" />,
        title: 'Current Affairs',
        description: 'Stay updated with daily news (Coming Soon).',
        href: '#',
        comingSoon: true
      },
  ];

  const stats = [
    { 
      label: "Practice Questions", 
      value: "1,00,000+", 
      icon: <ClipboardList className="h-6 w-6" />,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    { 
      label: "Mock Tests", 
      value: "5,000+", 
      icon: <Trophy className="h-6 w-6" />,
      color: "text-amber-600",
      bg: "bg-amber-100/50"
    },
  ];

  const examCategories = [
    {
      title: t('class_wise_tests'),
      description: "Class by class curriculum prep",
      href: '/class-wise',
      icon: <Book className="h-10 w-10 text-blue-600" />,
      color: "bg-blue-50"
    },
    {
      title: t('group_1_tests'),
      description: "Elite level civil service prep",
      href: '/exam-wise/group-1',
      icon: <Flame className="h-10 w-10 text-red-600" />,
      color: "bg-red-50"
    },
    {
      title: t('group_2_tests'),
      description: "Executive & Non-executive prep",
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-10 w-10 text-emerald-600" />,
      color: "bg-emerald-50"
    },
    {
      title: t('group_4_tests'),
      description: "VAO and Group IV focused tests",
      href: '/exam-wise/group-4',
      icon: <Archive className="h-10 w-10 text-amber-600" />,
      color: "bg-amber-50"
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 bg-muted/50">
          {/* Decorative mesh gradient background */}
          <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px]" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 text-foreground mx-auto max-w-4xl leading-[1.1]">
              Master the TNPSC Exam with <span className="text-primary italic">TNPSC99</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base md:text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
              The ultimate platform for Group I, II, and IV preparation. Targeted MCQs, real-time analytics, and expert-curated mock tests.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-base shadow-lg shadow-primary/25 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95">
                  <Link href="/signup">{t('get_started_free')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base bg-background/50 backdrop-blur-sm rounded-xl font-bold">
                  <Link href="/about-us">Learn Our Strategy</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-background border-y border-border">
            <div className="container mx-auto px-4">
                <div className="flex flex-wrap justify-center gap-12 md:gap-24 max-w-5xl mx-auto">
                    {stats.map((stat: any, idx) => (
                        <div key={idx} className="flex flex-col items-center text-center group min-w-[160px]">
                            <div className={cn(
                                "mb-4 p-4 rounded-3xl transition-all duration-300 group-hover:scale-110",
                                stat.bg,
                                stat.color
                            )}>
                                {stat.icon}
                            </div>
                            <div className="text-3xl md:text-5xl font-black text-foreground mb-1 tracking-tight">{stat.value}</div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Exam Categories Section */}
        <section className="py-20 md:py-32 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">Focused Exam Paths</h2>
              <p className="text-base text-muted-foreground">Tailored practice questions and mock tests designed specifically for each exam category.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {examCategories.map((category) => (
                <Link href={category.href} key={category.title} className="block group">
                  <Card className="h-full border-none shadow-md hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-card group-hover:-translate-y-2">
                    <CardContent className="p-10 flex flex-col items-center text-center">
                        <div className={cn("p-6 rounded-[2rem] mb-8 group-hover:scale-110 transition-transform duration-500 shadow-inner", category.color)}>
                            {category.icon}
                        </div>
                        <h3 className="text-xl font-black mb-4 text-foreground tracking-tight">
                          {category.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed font-semibold text-sm mb-8">
                          {category.description}
                        </p>
                        <div className="pt-6 border-t border-border/50 w-full flex items-center justify-center gap-3 text-primary font-black uppercase text-xs tracking-widest group-hover:gap-5 transition-all">
                            Start Preparation <ArrowRight className="h-5 w-5" />
                        </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works / Core Features */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
                <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
                    <h2 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight leading-tight">Everything you need to <span className="text-primary italic underline decoration-wavy">Succeed</span></h2>
                    <p className="text-base text-muted-foreground leading-relaxed max-w-xl">We've built the most comprehensive dashboard for TNPSC aspirants. Track your progress, identify weaknesses, and ace your goals.</p>
                    <div className="space-y-4">
                        {[
                            "Topic-wise in-depth analysis",
                            "Timed mock tests simulating real exams",
                            "Detailed explanations for every MCQ",
                            "Personalized study recommendations"
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-foreground/80 font-semibold justify-center lg:justify-start">
                                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:w-1/2 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {features.map((feature, index) => (
                            <Link href={feature.href} key={index} className={cn("block group relative", feature.comingSoon && "pointer-events-none")}>
                            <Card className={cn(
                                "h-full border border-border transition-all duration-300 hover:border-primary/20",
                                feature.comingSoon ? "bg-muted/30 grayscale-[0.5]" : "hover:bg-muted/30 shadow-sm hover:shadow-lg"
                            )}>
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <div className="p-3 bg-card rounded-xl mb-4 shadow-sm border border-border/50">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-foreground">
                                    {feature.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium">
                                    {feature.description}
                                    </p>
                                    {feature.comingSoon && (
                                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                            Soon
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-primary">
            <div className="container mx-auto px-4 text-center text-primary-foreground">
                <h2 className="text-2xl md:text-4xl font-black mb-6">Ready to start your journey?</h2>
                <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto font-medium">Join our community today and take your first step towards a government career.</p>
                <Button asChild size="lg" variant="secondary" className="h-16 px-10 text-lg rounded-2xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-transform">
                    <Link href="/signup">Join TNPSC99 Now</Link>
                </Button>
            </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
