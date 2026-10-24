'use client';

import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Timer,
  BookMarked,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
  Zap,
  Globe,
  Award,
  Layers,
  GraduationCap,
  FileSpreadsheet,
  ChevronRight,
  BrainCircuit,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { FreeLearningHub } from '@/components/public/free-learning-hub';
import { useUser } from '@/firebase';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from '@/hooks/use-translation';

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { t, language } = useTranslation();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  const syllabusStreams = [
    {
      title: t('stream_tamil_title'),
      classRange: t('stream_tamil_range'),
      topics: language === 'ta'
        ? ["இலக்கணம்", "இலக்கியம்", "தமிழ் அறிஞர்களும் தொண்டும்"]
        : ["Grammar (இலக்கணம்)", "Literature (இலக்கியம்)", "Tamil Scholars & Heritage"],
      accent: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: BookOpen
    },
    {
      title: t('stream_science_title'),
      classRange: t('stream_science_range'),
      topics: language === 'ta'
        ? ["இயற்பியல்", "வேதியியல்", "உயிரியல் & சூழலியல்"]
        : ["Physics (இயற்பியல்)", "Chemistry (வேதியியல்)", "Biology & Ecology (உயிரியல்)"],
      accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: Layers
    },
    {
      title: t('stream_social_title'),
      classRange: t('stream_social_range'),
      topics: language === 'ta'
        ? ["தமிழ்நாடு & இந்திய வரலாறு", "புவியியல் & இயற்கை வளம்", "சமூக அறிவியல் பாட அலகுகள்"]
        : ["History of Tamil Nadu & India", "Geography & Natural Resources", "Social Science Units"],
      accent: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      icon: BookMarked
    },
    {
      title: t('stream_polity_title'),
      classRange: t('stream_polity_range'),
      topics: language === 'ta'
        ? ["இந்திய அரசியலமைப்பு", "இந்திய & தமிழகப் பொருளாதாரம்", "வளர்ச்சி நிர்வாகம்"]
        : ["Indian Polity & Constitution", "Indian & TN Economy", "Development Administration"],
      accent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      icon: GraduationCap
    }
  ];

  const examCategories = [
    {
      title: t('group1_title'),
      tagline: t('group1_tagline'),
      desc: t('group1_desc'),
      badge: "Group 1",
      href: "/signup"
    },
    {
      title: t('group2_title'),
      tagline: t('group2_tagline'),
      desc: t('group2_desc'),
      badge: "Group 2 / 2A",
      href: "/signup"
    },
    {
      title: t('group4_title'),
      tagline: t('group4_tagline'),
      desc: t('group4_desc'),
      badge: "Group 4",
      href: "/signup"
    }
  ];

  const mcqAcademyFeatures = [
    t('pricing_feat_1'),
    t('pricing_feat_2'),
    t('pricing_feat_3'),
    t('pricing_feat_4'),
    t('pricing_feat_5'),
    t('pricing_feat_6'),
    t('pricing_feat_7'),
    t('pricing_feat_8')
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION                                                             */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-blue-50/60 via-background to-background dark:from-slate-900/40 dark:via-background dark:to-background border-b border-border">
          {/* Subtle decorative background blur */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          </div>

          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl text-center">
            {/* Offer Callout Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-bold text-primary mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-accent fill-accent" />
              <span>{t('hero_badge_offer')}</span>
              <span className="hidden sm:inline text-primary/70">· {t('hero_badge_sub')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15] max-w-4xl mx-auto mb-6">
              {t('hero_headline')}
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
              {t('hero_subtitle')}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 max-w-md mx-auto mb-10">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold shadow-lg shadow-primary/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                <a href="#free-hub" className="flex items-center justify-center gap-2">
                  <span>{t('hero_cta_free')}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold rounded-xl border-border hover:bg-muted">
                <Link href="/subscription">
                  {t('hero_cta_sub')}
                </Link>
              </Button>
            </div>

            {/* Key Feature Highlights Pill Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-xs md:text-sm font-semibold text-muted-foreground">
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground">{t('hero_pill_textbooks')}</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <Timer className="h-4 w-4 text-secondary shrink-0" />
                <span className="text-foreground">{t('hero_pill_modes')}</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground">{t('hero_pill_citations')}</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-foreground">{t('hero_pill_bilingual')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PUBLIC FREE LEARNING HUB: INTERACTIVE PRACTICE                            */}
        {/* ========================================================================= */}
        <FreeLearningHub />

        {/* ========================================================================= */}
        {/* PRIMARY PROMOTIONAL OFFER: MCQ ACADEMY – ₹99/MONTH SHOWCASE               */}
        {/* ========================================================================= */}
        <section id="pricing" className="py-16 md:py-24 bg-card border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                {t('pricing_badge')}
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {t('pricing_title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('pricing_subtitle')}
              </p>
            </div>

            {/* The ₹99 Spotlight Card */}
            <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-card to-blue-50/30 dark:to-slate-900/50 p-6 sm:p-10 shadow-xl overflow-hidden">
              {/* Highlight Ribbon */}
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 text-xs font-black tracking-wider uppercase rounded-bl-xl shadow-md">
                {t('pricing_ribbon')}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Side: Pricing & Value */}
                <div className="lg:col-span-5 text-center lg:text-left space-y-4">
                  <div className="inline-block">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">{t('pricing_access_label')}</span>
                    <div className="flex items-baseline justify-center lg:justify-start gap-2 mt-1">
                      <span className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">{t('pricing_rate')}</span>
                      <span className="text-muted-foreground text-lg font-semibold">{t('pricing_per_month')}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {t('pricing_comparison')}
                  </p>

                  <div className="pt-2">
                    <Button asChild size="lg" className="w-full h-12 md:h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/subscription" className="flex items-center justify-center gap-2">
                        <Zap className="h-5 w-5 text-accent" />
                        <span>{t('pricing_subscribe_btn')}</span>
                      </Link>
                    </Button>
                    <p className="text-[11px] text-center lg:text-left text-muted-foreground mt-2">
                      {t('pricing_trust_signals')}
                    </p>
                  </div>
                </div>

                {/* Right Side: What's Included */}
                <div className="lg:col-span-7 bg-background/80 rounded-xl p-5 sm:p-6 border border-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{t('pricing_included_title')}</span>
                  </h3>
                  <ul className="space-y-3">
                    {mcqAcademyFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 font-medium">
                        <div className="h-4 w-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-2.5 w-2.5 text-emerald-600 font-bold" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DUAL TESTING MODES: PRACTICE MODE & EXAM MODE                            */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-muted/40 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary border-secondary/30 bg-secondary/5">
                {t('modes_badge')}
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {t('modes_title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('modes_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Practice Mode Card */}
              <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {t('practice_mode_badge')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{t('practice_mode_title')}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('practice_mode_subtitle')}
                    </p>
                  </div>

                  <ul className="space-y-3 pt-2 text-xs sm:text-sm text-foreground/80 font-medium">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('practice_feat_1_title')}:</strong> {t('practice_feat_1_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('practice_feat_2_title')}:</strong> {t('practice_feat_2_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('practice_feat_3_title')}:</strong> {t('practice_feat_3_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('practice_feat_4_title')}:</strong> {t('practice_feat_4_desc')}</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full rounded-xl font-bold border-border">
                      <Link href="/signup">{t('try_practice_mode')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Exam Mode Card */}
              <Card className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <Timer className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="font-semibold text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {t('exam_mode_badge')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">{t('exam_mode_title')}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('exam_mode_subtitle')}
                    </p>
                  </div>

                  <ul className="space-y-3 pt-2 text-xs sm:text-sm text-foreground/80 font-medium">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('exam_feat_1_title')}:</strong> {t('exam_feat_1_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('exam_feat_2_title')}:</strong> {t('exam_feat_2_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('exam_feat_3_title')}:</strong> {t('exam_feat_3_desc')}</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">{t('exam_feat_4_title')}:</strong> {t('exam_feat_4_desc')}</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full rounded-xl font-bold border-border">
                      <Link href="/signup">{t('try_exam_mode')}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* AUTHENTIC CURRICULUM COVERAGE (SAMACHEER KALVI CLASSES 6–10)               */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-background border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                {t('curriculum_badge')}
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {t('curriculum_title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('curriculum_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {syllabusStreams.map((stream, idx) => {
                const IconComponent = stream.icon;
                return (
                  <Card key={idx} className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/40 transition-colors">
                    <CardContent className="p-6 space-y-4">
                      <div className={cn("p-3 rounded-xl inline-block border", stream.accent)}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground">{stream.title}</h3>
                        <p className="text-xs font-semibold text-primary mt-0.5">{stream.classRange}</p>
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        {stream.topics.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* TARGETED EXAM TRACKS (GROUP 1, 2, 4)                                      */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                {t('paths_badge')}
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {t('paths_title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('paths_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {examCategories.map((exam, idx) => (
                <Card key={idx} className="rounded-2xl border-border bg-card shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary">
                          {exam.badge}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground">{exam.tagline}</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {exam.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {exam.desc}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <Button asChild variant="ghost" className="w-full justify-between font-bold text-primary group-hover:bg-primary/5">
                        <Link href={exam.href} className="flex items-center justify-between w-full">
                          <span>{t('practice_now')}</span>
                          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* AI TUTOR OPTIONAL ADD-ON TEASER (STRICT CONSTRAINTS COMPLIANT)            */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-20 bg-background border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="rounded-2xl border border-dashed border-amber-300/80 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 dark:from-amber-950/20 dark:to-orange-950/20 p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-accent">
                    <BrainCircuit className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-foreground">{t('ai_teaser_title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('ai_teaser_sub')}</p>
                  </div>
                </div>
                <Badge className="bg-accent text-accent-foreground font-black text-xs px-3 py-1 uppercase tracking-wider rounded-full">
                  {t('ai_teaser_badge')}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed mb-4">
                {t('ai_teaser_desc')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">{t('ai_feat_prepaid')}</p>
                  <p className="text-muted-foreground mt-0.5">{t('ai_feat_prepaid_desc')}</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">{t('ai_feat_grounded')}</p>
                  <p className="text-muted-foreground mt-0.5">{t('ai_feat_grounded_desc')}</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">{t('ai_feat_doubts')}</p>
                  <p className="text-muted-foreground mt-0.5">{t('ai_feat_doubts_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW IT WORKS (3 SIMPLE STEPS)                                             */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-card border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                {t('routine_badge')}
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                {t('routine_title')}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('routine_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  1
                </div>
                <h3 className="font-bold text-base text-foreground">{t('step1_title')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t('step1_desc')}
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-secondary text-secondary-foreground font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  2
                </div>
                <h3 className="font-bold text-base text-foreground">{t('step2_title')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t('step2_desc')}
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  3
                </div>
                <h3 className="font-bold text-base text-foreground">{t('step3_title')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t('step3_desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* FINAL HIGH-CONVERSION CTA SECTION                                         */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
            <Badge className="bg-white/15 text-white border-none font-bold text-xs px-3 py-1 mb-4 rounded-full">
              {t('final_cta_badge')}
            </Badge>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
              {t('final_cta_title')}
            </h2>
            <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
              {t('final_cta_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 max-w-md mx-auto">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-black rounded-xl bg-white text-primary hover:bg-white/90 shadow-xl transition-transform hover:scale-105 active:scale-95">
                <Link href="/subscription">{t('join_academy_cta')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold rounded-xl border-white/30 text-white hover:bg-white/10">
                <Link href="/signup">{t('create_free_account')}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
