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
import { useUser } from '@/firebase';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
      title: "பொதுத்தமிழ் (General Tamil)",
      classRange: "Classes 6 to 10 Samacheer Kalvi",
      topics: ["இலக்கணம் (Grammar)", "இலக்கியம் (Literature)", "தமிழ் அறிஞர்களும் தொண்டும்"],
      accent: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: BookOpen
    },
    {
      title: "பொது அறிவியல் (General Science)",
      classRange: "Classes 6 to 10 Samacheer Kalvi",
      topics: ["Physics (இயற்பியல்)", "Chemistry (வேதியியல்)", "Biology & Ecology (உயிரியல்)"],
      accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: Layers
    },
    {
      title: "சமூக அறிவியல் & வரலாறு (Social Science)",
      classRange: "Classes 6 to 10 Samacheer Kalvi",
      topics: ["History of Tamil Nadu & India", "Geography & Natural Resources", "Social Science Units"],
      accent: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      icon: BookMarked
    },
    {
      title: "ஆட்சியியல் & பொருளாதாரம் (Polity & Economy)",
      classRange: "Constitution & State Administration",
      topics: ["Indian Polity & Constitution", "Indian & TN Economy", "Development Administration"],
      accent: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      icon: GraduationCap
    }
  ];

  const examCategories = [
    {
      title: "TNPSC Group I",
      tagline: "Deputy Collector & DSP",
      desc: "Comprehensive preliminary exam syllabus covering general studies, mental ability, and analytical questions.",
      badge: "Group 1",
      href: "/signup"
    },
    {
      title: "TNPSC Group II & IIA",
      tagline: "Executive & Non-Executive",
      desc: "Focused textbook MCQs with deep coverage of General Tamil, General Studies, and Aptitude.",
      badge: "Group 2 / 2A",
      href: "/signup"
    },
    {
      title: "TNPSC Group IV & VAO",
      tagline: "Village Administrative Officer",
      desc: "Rigorous practice on 6th–10th standard school books with high-yield questions for VAO & Junior Assistant.",
      badge: "Group 4",
      href: "/signup"
    }
  ];

  const mcqAcademyFeatures = [
    "School textbook-based MCQ test series mapped to syllabus topics",
    "Dual Testing Modes: Instant-Feedback Practice Mode & Timed Exam Mode",
    "Textbook references & printed page citations for supporting textbook passages",
    "Detailed explanations and rationale with bilingual question support",
    "Targeted syllabus practice for TNPSC Group I, Group II/IIA, and Group IV/VAO",
    "Topic-wise performance analytics to identify and strengthen weak areas",
    "Question bookmarking for convenient pre-exam revision drills",
    "100% Ad-Free learning experience on all devices"
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
              <span>TNPSC MCQ Academy — Flat ₹99/Month</span>
              <span className="hidden sm:inline text-primary/70">· Samacheer Kalvi Aligned</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15] max-w-4xl mx-auto mb-6">
              Master TNPSC Exams with{' '}
              <span className="text-primary bg-clip-text">School Textbook MCQs</span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed font-normal">
              Practice topic-based questions mapped to <strong className="text-foreground font-semibold">Classes 6 to 10 Samacheer Kalvi school textbooks</strong>. Prepare for <strong className="text-foreground font-semibold">Group I, II, and IV</strong> with instant explanations, textbook citations, and real-time timed mock tests.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 max-w-md mx-auto mb-10">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold shadow-lg shadow-primary/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Link href="/subscription" className="flex items-center justify-center gap-2">
                  <span>Join MCQ Academy (₹99/mo)</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold rounded-xl border-border hover:bg-muted">
                <Link href="/signup">
                  Start Free Demo Practice
                </Link>
              </Button>
            </div>

            {/* Key Feature Highlights Pill Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-xs md:text-sm font-semibold text-muted-foreground">
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <span className="text-foreground">Classes 6–10 Textbooks</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <Timer className="h-4 w-4 text-secondary shrink-0" />
                <span className="text-foreground">Practice & Exam Modes</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground">Printed Page References</span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card border border-border shadow-sm">
                <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-foreground">Bilingual (தமிழ் / Eng)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRIMARY PROMOTIONAL OFFER: MCQ ACADEMY – ₹99/MONTH SHOWCASE               */}
        {/* ========================================================================= */}
        <section id="pricing" className="py-16 md:py-24 bg-card border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
                Transparent All-Inclusive Pass
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                MCQ Academy – ₹99/Month
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Everything you need for daily TNPSC MCQ drills. No hidden charges, no long-term contracts.
              </p>
            </div>

            {/* The ₹99 Spotlight Card */}
            <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-card to-blue-50/30 dark:to-slate-900/50 p-6 sm:p-10 shadow-xl overflow-hidden">
              {/* Highlight Ribbon */}
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1.5 text-xs font-black tracking-wider uppercase rounded-bl-xl shadow-md">
                Best Value for Aspirants
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left Side: Pricing & Value */}
                <div className="lg:col-span-5 text-center lg:text-left space-y-4">
                  <div className="inline-block">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Full Platform Access</span>
                    <div className="flex items-baseline justify-center lg:justify-start gap-2 mt-1">
                      <span className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">₹99</span>
                      <span className="text-muted-foreground text-lg font-semibold">/ month</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Coaching institutes typically charge ₹5,000 to ₹15,000 for question banks. TNPSC99 gives you focused daily school book MCQ practice for less than the price of a single textbook.
                  </p>

                  <div className="pt-2">
                    <Button asChild size="lg" className="w-full h-12 md:h-14 text-base font-bold rounded-xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Link href="/subscription" className="flex items-center justify-center gap-2">
                        <Zap className="h-5 w-5 text-accent" />
                        <span>Subscribe for ₹99/Month</span>
                      </Link>
                    </Button>
                    <p className="text-[11px] text-center lg:text-left text-muted-foreground mt-2">
                      Secure checkout via Razorpay · Instant activation · Cancel anytime
                    </p>
                  </div>
                </div>

                {/* Right Side: What's Included */}
                <div className="lg:col-span-7 bg-background/80 rounded-xl p-5 sm:p-6 border border-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Included in your ₹99 Monthly Subscription:</span>
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
                Two Powerful Ways to Prepare
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                Practice Mode vs Exam Mode
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Whether you are learning a chapter for the first time or simulating real TNPSC exam day conditions, TNPSC99 supports your preparation style.
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
                      Learn & Master
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Practice Mode (பயிற்சி முறை)</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Designed for conceptual clarity and deep revision without time anxiety.
                    </p>
                  </div>

                  <ul className="space-y-3 pt-2 text-xs sm:text-sm text-foreground/80 font-medium">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Instant Feedback:</strong> Immediately see whether your selected answer is right or wrong.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Textbook References:</strong> Printed page numbers and references from textbooks to locate supporting study passages.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Detailed Explanations:</strong> Comprehensive notes explaining the grammatical or conceptual rationale.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Bookmark Hard Questions:</strong> Save tricky questions for quick one-click review before your exam.</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full rounded-xl font-bold border-border">
                      <Link href="/signup">Try Practice Mode</Link>
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
                      Real Exam Simulation
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">Exam Mode (தேர்வு முறை)</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Simulate official TNPSC examination hall conditions with strict timing.
                    </p>
                  </div>

                  <ul className="space-y-3 pt-2 text-xs sm:text-sm text-foreground/80 font-medium">
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Live Countdown Timer:</strong> Real-time timer to train your pace and eliminate exam-hall panic.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Question Palette Navigation:</strong> Easily flag questions for review, skip, or return anytime.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Performance Scorecard:</strong> In-depth accuracy breakdown, time spent per question, and topic insights.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong className="text-foreground">Post-Test Review:</strong> Full answer key unlocked after submission with complete explanations.</span>
                    </li>
                  </ul>

                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full rounded-xl font-bold border-border">
                      <Link href="/signup">Try Exam Mode</Link>
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
                School Textbook Curriculum
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                Curriculum Aligned with Samacheer Kalvi
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                The TNPSC syllabus draws extensively from Tamil Nadu State Board school textbooks. Our practice modules are organized by standard, unit, and core topics.
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
                        {stream.topics.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                            <span>{t}</span>
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
                Targeted Exam Paths
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                Tailored for Every Major TNPSC Exam
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Practice topic by topic or take full-length mock examinations customized to the official syllabus pattern.
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
                          <span>Practice Now</span>
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
                    <h3 className="text-lg sm:text-xl font-black text-foreground">TNPSC99 AI Tutor</h3>
                    <p className="text-xs text-muted-foreground">Intelligent Personalized Study Companion</p>
                  </div>
                </div>
                <Badge className="bg-accent text-accent-foreground font-black text-xs px-3 py-1 uppercase tracking-wider rounded-full">
                  Coming Soon — Optional Add-on
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed mb-4">
                We are building an optional, separately billed AI Tutor to explain complex grammar concepts and scientific definitions directly mapped to Samacheer Kalvi textbooks.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">Separate Prepaid Credits</p>
                  <p className="text-muted-foreground mt-0.5">Optional add-on. Zero AI fees required for standard ₹99 MCQ practice.</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">Textbook Grounded</p>
                  <p className="text-muted-foreground mt-0.5">Responses strictly grounded in approved Tamil Nadu State Board textbooks.</p>
                </div>
                <div className="rounded-xl bg-card/60 border border-border p-3 text-xs">
                  <p className="font-bold text-foreground">Personalized Doubt Resolution</p>
                  <p className="text-muted-foreground mt-0.5">Ask questions about difficult MCQs and receive step-by-step reasoning.</p>
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
                Simple 3-Step Routine
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-3">
                How to Study with TNPSC99
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                A structured, disciplined approach to crack the Tamil Nadu Public Service Commission exams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  1
                </div>
                <h3 className="font-bold text-base text-foreground">Pick School Standard & Subject</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Select your target class from 6th to 10th standard and subject (General Tamil, Science, or Social Science).
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-secondary text-secondary-foreground font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  2
                </div>
                <h3 className="font-bold text-base text-foreground">Choose Practice or Exam Mode</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Use Practice Mode to learn with instant answers and page citations, or Exam Mode to simulate timed tests.
                </p>
              </div>

              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
                  3
                </div>
                <h3 className="font-bold text-base text-foreground">Review References & Improve</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Verify answers against printed textbook page numbers, bookmark mistakes, and retake tests until mastery.
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
              Start Practicing Today
            </Badge>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
              Ready to Ace Your TNPSC Exam?
            </h2>
            <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-xl mx-auto mb-8 font-normal leading-relaxed">
              Join TNPSC99 MCQ Academy today for just ₹99/month. Get full access to textbook MCQs, practice & exam modes, and textbook page citations.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 max-w-md mx-auto">
              <Button asChild size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-black rounded-xl bg-white text-primary hover:bg-white/90 shadow-xl transition-transform hover:scale-105 active:scale-95">
                <Link href="/subscription">Join MCQ Academy (₹99/mo)</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base font-bold rounded-xl border-white/30 text-white hover:bg-white/10">
                <Link href="/signup">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
