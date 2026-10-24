'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Timer,
  BookMarked,
  ArrowRight,
  Sparkles,
  Zap,
  Globe,
  Award,
  Layers,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ExternalLink,
  BrainCircuit,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
  Flame,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  FREE_CURRENT_AFFAIRS_TEST,
  FREE_MOCK_TEST,
  FREE_TEXTBOOK_PRACTICE,
  AI_TUTOR_PRECOMPUTED_DEMOS,
  PublicSampleQuestion,
  PublicSampleTestPackage,
  AiTutorPrecomputedDemo
} from '@/data/public-sample-questions';
import { PublicAnalytics } from '@/lib/public-analytics';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

type ActiveTab = 'current_affairs' | 'mock_test' | 'textbook' | 'ai_tutor';
type TestMode = 'practice' | 'exam';

export function FreeLearningHub() {
  const { language, setLanguage, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('current_affairs');
  const [testMode, setTestMode] = useState<TestMode>('practice');
  
  // Quiz State per package
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(false);

  // Dynamic Current Affairs State (Task 3: Dynamic Feed Support)
  const [dynamicCaPackage, setDynamicCaPackage] = useState<PublicSampleTestPackage | null>(null);
  const [isCaApproved, setIsCaApproved] = useState<boolean>(false);
  const [caStatusMessage, setCaStatusMessage] = useState<string>('');
  
  // Timer State for Exam Mode
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // AI Tutor Demo State
  const [activeAiDemoIndex, setActiveAiDemoIndex] = useState<number>(0);
  const [aiDemoSelectedOption, setAiDemoSelectedOption] = useState<number | null>(null);
  const [showAiBreakdown, setShowAiBreakdown] = useState<boolean>(false);

  // Current package based on active tab
  const currentPackage: PublicSampleTestPackage = useMemo(() => {
    switch (activeTab) {
      case 'current_affairs':
        return dynamicCaPackage || FREE_CURRENT_AFFAIRS_TEST;
      case 'mock_test':
        return FREE_MOCK_TEST;
      case 'textbook':
        return FREE_TEXTBOOK_PRACTICE;
      default:
        return FREE_MOCK_TEST;
    }
  }, [activeTab, dynamicCaPackage]);

  const questions = currentPackage.questions;
  const currentQ: PublicSampleQuestion | undefined = questions[currentQuestionIndex];

  // Track initial page impression & fetch dynamic Current Affairs feed
  useEffect(() => {
    PublicAnalytics.trackHomepageImpression();

    // Query dynamic Current Affairs feed (Task 3: Dynamic zero-redeploy feed support)
    fetch('/api/public/daily-ca')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasApprovedEdition && data.package) {
          setDynamicCaPackage(data.package);
          setIsCaApproved(true);
        } else {
          setIsCaApproved(false);
          setCaStatusMessage(data.message || '');
        }
      })
      .catch(() => {
        setIsCaApproved(false);
      });
  }, []);

  // Timer effect for exam mode
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && !isTestSubmitted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isTestSubmitted]);

  // Tab switch handler
  const handleTabChange = (val: string) => {
    const tab = val as ActiveTab;
    setActiveTab(tab);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setIsTestSubmitted(false);
    setElapsedSeconds(0);
    setIsTimerRunning(testMode === 'exam' && tab !== 'ai_tutor');

    if (tab === 'ai_tutor') {
      const demo = AI_TUTOR_PRECOMPUTED_DEMOS[activeAiDemoIndex];
      PublicAnalytics.trackAiTutorDemoView(demo.id);
    } else {
      PublicAnalytics.trackFreeTestStart(
        tab === 'current_affairs' ? 'current_affairs' : tab === 'mock_test' ? 'mock_test' : 'textbook',
        language === 'ta' ? 'tamil' : 'english'
      );
    }
  };

  // Switch test mode (Practice vs Exam)
  const handleModeSwitch = (mode: TestMode) => {
    setTestMode(mode);
    setSelectedAnswers({});
    setIsTestSubmitted(false);
    setElapsedSeconds(0);
    setCurrentQuestionIndex(0);
    setIsTimerRunning(mode === 'exam');
  };

  // Option selection
  const handleSelectOption = (optIndex: number) => {
    if (!currentQ || isTestSubmitted) return;
    
    // In practice mode, record answer; in exam mode, allow changing answer until submit
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optIndex,
    }));
  };

  // Calculate score
  const score = useMemo(() => {
    let count = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctOptionIndex) {
        count++;
      }
    });
    return count;
  }, [questions, selectedAnswers]);

  // Submit test handler
  const handleSubmitTest = () => {
    setIsTestSubmitted(true);
    setIsTimerRunning(false);

    const testType = activeTab === 'current_affairs' ? 'current_affairs' : activeTab === 'mock_test' ? 'mock_test' : 'textbook';
    PublicAnalytics.trackFreeTestComplete(testType, score, questions.length, language === 'ta' ? 'tamil' : 'english');
  };

  // Reset current test
  const handleResetTest = () => {
    setSelectedAnswers({});
    setIsTestSubmitted(false);
    setCurrentQuestionIndex(0);
    setElapsedSeconds(0);
    setIsTimerRunning(testMode === 'exam');
  };

  // Format seconds mm:ss
  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // AI Tutor demo selector
  const handleSelectAiDemo = (index: number) => {
    setActiveAiDemoIndex(index);
    setAiDemoSelectedOption(null);
    setShowAiBreakdown(false);
    PublicAnalytics.trackAiTutorDemoView(AI_TUTOR_PRECOMPUTED_DEMOS[index].id);
  };

  return (
    <section id="free-hub" className="py-12 md:py-20 bg-gradient-to-b from-background via-muted/30 to-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header with Title and Language Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('hub_badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
              {t('hub_title')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
              {t('hub_subtitle')}
            </p>
          </div>

          {/* Bilingual Switcher */}
          <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border shadow-sm self-start md:self-auto">
            <Globe className="h-4 w-4 text-primary ml-2 hidden sm:inline" />
            <button
              onClick={() => setLanguage('ta')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                language === 'ta'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              தமிழ் (Tamil)
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                language === 'en'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              English
            </button>
          </div>
        </div>

        {/* 4 Prominent Responsive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8" role="tablist" aria-label="Learning Modules">
          {/* Card 1: Daily Current Affairs */}
          <div
            role="tab"
            aria-selected={activeTab === 'current_affairs'}
            tabIndex={0}
            onClick={() => handleTabChange('current_affairs')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('current_affairs'); }}
            className={cn(
              "text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden cursor-pointer",
              activeTab === 'current_affairs'
                ? "ring-2 ring-primary border-primary bg-primary/5 text-primary shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  activeTab === 'current_affairs' ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                )}>
                  <BookOpen className="h-6 w-6" />
                </div>
                <Badge
                  variant={isCaApproved ? "default" : "outline"}
                  className={cn(
                    "text-xs font-bold",
                    isCaApproved
                      ? "bg-primary text-primary-foreground"
                      : "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                  )}
                >
                  {isCaApproved ? t('card_ca_count') : t('card_ca_review')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                {t('card_ca_title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('card_ca_benefit')}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold">
              <span className={activeTab === 'current_affairs' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
                {activeTab === 'current_affairs' ? t('card_active_indicator') : t('card_click_to_view')}
              </span>
              <ArrowRight className={cn(
                "h-4 w-4 transition-transform",
                activeTab === 'current_affairs' ? "text-primary translate-x-1" : "text-muted-foreground group-hover:translate-x-1"
              )} />
            </div>
          </div>

          {/* Card 2: Free Mock Test */}
          <div
            role="tab"
            aria-selected={activeTab === 'mock_test'}
            tabIndex={0}
            onClick={() => handleTabChange('mock_test')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('mock_test'); }}
            className={cn(
              "text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden cursor-pointer",
              activeTab === 'mock_test'
                ? "ring-2 ring-primary border-primary bg-primary/5 text-primary shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  activeTab === 'mock_test' ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                )}>
                  <Award className="h-6 w-6" />
                </div>
                <Badge variant="default" className="text-xs font-bold bg-primary text-primary-foreground">
                  {t('card_mock_count')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                {t('card_mock_title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('card_mock_benefit')}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold">
              <span className={activeTab === 'mock_test' ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
                {activeTab === 'mock_test' ? t('card_active_indicator') : t('card_click_to_view')}
              </span>
              <ArrowRight className={cn(
                "h-4 w-4 transition-transform",
                activeTab === 'mock_test' ? "text-primary translate-x-1" : "text-muted-foreground group-hover:translate-x-1"
              )} />
            </div>
          </div>

          {/* Card 3: Textbook Practice */}
          <div
            role="tab"
            aria-selected={activeTab === 'textbook'}
            tabIndex={0}
            onClick={() => handleTabChange('textbook')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('textbook'); }}
            className={cn(
              "text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden cursor-pointer",
              activeTab === 'textbook'
                ? "ring-2 ring-secondary border-secondary bg-secondary/5 text-secondary shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-secondary/40 hover:shadow-sm"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  activeTab === 'textbook' ? "bg-secondary text-secondary-foreground" : "bg-secondary/10 text-secondary group-hover:bg-secondary/20"
                )}>
                  <BookMarked className="h-6 w-6" />
                </div>
                <Badge variant="default" className="text-xs font-bold bg-secondary text-secondary-foreground">
                  {t('card_textbook_count')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-secondary transition-colors">
                {t('card_textbook_title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('card_textbook_benefit')}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold">
              <span className={activeTab === 'textbook' ? "text-secondary" : "text-muted-foreground group-hover:text-foreground"}>
                {activeTab === 'textbook' ? t('card_active_indicator') : t('card_click_to_view')}
              </span>
              <ArrowRight className={cn(
                "h-4 w-4 transition-transform",
                activeTab === 'textbook' ? "text-secondary translate-x-1" : "text-muted-foreground group-hover:translate-x-1"
              )} />
            </div>
          </div>

          {/* Card 4: AI Tutor Preview */}
          <div
            role="tab"
            aria-selected={activeTab === 'ai_tutor'}
            tabIndex={0}
            onClick={() => handleTabChange('ai_tutor')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleTabChange('ai_tutor'); }}
            className={cn(
              "text-left p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group relative overflow-hidden cursor-pointer",
              activeTab === 'ai_tutor'
                ? "ring-2 ring-amber-500 border-amber-500 bg-amber-500/5 text-amber-800 dark:text-amber-200 shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-amber-500/40 hover:shadow-sm"
            )}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  activeTab === 'ai_tutor' ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20"
                )}>
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-xs font-bold border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-500/10">
                  {t('card_ai_count')}
                </Badge>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {t('card_ai_title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('card_ai_benefit')}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between text-xs font-bold">
              <span className={activeTab === 'ai_tutor' ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground group-hover:text-foreground"}>
                {activeTab === 'ai_tutor' ? t('card_active_indicator') : t('card_click_to_view')}
              </span>
              <ArrowRight className={cn(
                "h-4 w-4 transition-transform",
                activeTab === 'ai_tutor' ? "text-amber-600 translate-x-1" : "text-muted-foreground group-hover:translate-x-1"
              )} />
            </div>
          </div>
        </div>

        {/* Active Module Container */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">

          {/* TAB CONTENT 1, 2, 3: QUESTION PACKAGES */}
          {(['current_affairs', 'mock_test', 'textbook'] as ActiveTab[]).map((tabKey) => {
            // Task 3: If current affairs edition is undergoing review, show transparent status instead of fabricating unapproved test
            if (tabKey === 'current_affairs' && (!isCaApproved || questions.length === 0)) {
              return (
                <TabsContent key={tabKey} value={tabKey} className="focus-visible:outline-none focus-visible:ring-0">
                  <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden p-6 sm:p-10 text-center space-y-6">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 mx-auto">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="max-w-xl mx-auto space-y-2">
                      <Badge variant="outline" className="text-xs font-bold border-amber-400 text-amber-700 dark:text-amber-300">
                        {language === 'ta' ? 'அரசு அரசிதழ் சரிபார்ப்பு நிலையில் உள்ளது' : 'Official Gazette Verification In Progress'}
                      </Badge>
                      <h3 className="text-xl sm:text-2xl font-black text-foreground">
                        {language === 'ta' ? 'தினசரி நடப்பு நிகழ்வுகள் — ஆசிரியர் குழு சரிபார்ப்பு' : 'Daily Current Affairs — Editorial Review in Progress'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {language === 'ta'
                          ? 'TNPSC99 கொள்கைப்படி, அரசு செய்திக்குறிப்புகள் மற்றும் தமிழ்நாடு அரசு அரசிதழ்களுடன் (Government Gazettes) சரிபார்க்கப்பட்ட பின்னரே நடப்பு நிகழ்வுகள் வினாக்கள் வெளியிடப்படுகின்றன. இன்றைய பதிப்பு ஆசிரியர் குழுவின் இறுதி ஆய்வில் உள்ளது; சரிபார்க்கப்பட்டவுடன் இங்கு தானாகவே தோன்றும்.'
                          : 'In accordance with TNPSC99 editorial standards, Current Affairs questions are published only after secondary fact verification against official Tamil Nadu Government Gazettes and Departmental releases. The upcoming edition is currently in the verification queue and will publish dynamically once approved.'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 max-w-md mx-auto">
                      <Button onClick={() => setActiveTab('mock_test')} className="w-full sm:w-auto h-11 px-6 font-bold rounded-xl gap-2">
                        <Award className="h-4 w-4" />
                        <span>{language === 'ta' ? 'இலவச மாதிரித் தேர்வு (20 வினாக்கள்)' : 'Try Free Mock Test (20 Q)'}</span>
                      </Button>
                      <Button onClick={() => setActiveTab('textbook')} variant="outline" className="w-full sm:w-auto h-11 px-6 font-semibold rounded-xl gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{language === 'ta' ? 'பாடப்புத்தகப் பயிற்சி (10 வினாக்கள்)' : 'Textbook Practice (10 Q)'}</span>
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              );
            }

            return (
              <TabsContent key={tabKey} value={tabKey} className="focus-visible:outline-none focus-visible:ring-0">
              <div className="space-y-6">
                {/* Module Banner with Controls */}
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-4 sm:p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[11px] font-bold border-primary/30 text-primary">
                          {currentPackage.editionDate || 'Samacheer Kalvi Classes 6–10'}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] font-medium">
                          {questions.length} {language === 'ta' ? 'வினாக்கள்' : 'Questions'}
                        </Badge>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground">
                        {language === 'ta' ? currentPackage.title_ta : currentPackage.title_en}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {language === 'ta' ? currentPackage.subtitle_ta : currentPackage.subtitle_en}
                      </p>
                    </div>

                    {/* Mode Selector & Reset */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-background rounded-xl p-1 border border-border">
                        <button
                          onClick={() => handleModeSwitch('practice')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                            testMode === 'practice'
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{language === 'ta' ? 'பயிற்சி முறை' : 'Practice Mode'}</span>
                        </button>
                        <button
                          onClick={() => handleModeSwitch('exam')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                            testMode === 'exam'
                              ? "bg-secondary text-secondary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>{language === 'ta' ? 'தேர்வு முறை' : 'Exam Mode'}</span>
                        </button>
                      </div>

                      {testMode === 'exam' && (
                        <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-xl border border-border text-xs font-mono font-bold text-foreground">
                          <Timer className="h-3.5 w-3.5 text-secondary animate-pulse" />
                          <span>{formatTimer(elapsedSeconds)}</span>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetTest}
                        className="h-9 px-2.5 rounded-xl text-muted-foreground hover:text-foreground"
                        title={language === 'ta' ? 'மீண்டும் தொடங்கு' : 'Restart Test'}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* SUBMITTED SCORE SUMMARY SCREEN */}
                  {isTestSubmitted ? (
                    <CardContent className="p-6 sm:p-10 space-y-8">
                      <div className="text-center max-w-xl mx-auto space-y-4">
                        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 mb-2">
                          <Award className="h-10 w-10" />
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-black text-foreground">
                          {language === 'ta' ? 'தேர்வு முடிவுகள்' : 'Your Test Scorecard'}
                        </h4>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-5xl font-black text-primary">{score}</span>
                          <span className="text-xl text-muted-foreground font-semibold">/ {questions.length}</span>
                          <Badge className="ml-2 text-sm bg-emerald-600 text-white font-bold">
                            {Math.round((score / questions.length) * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {score >= questions.length * 0.7
                            ? (language === 'ta' ? 'சிறப்பான பயிற்சி! உங்கள் தயாரிப்பு நிலை தீவிரமாக உள்ளது.' : 'Excellent work! You have strong conceptual foundation in this topic.')
                            : (language === 'ta' ? 'மேலும் பயிற்சி தேவை. பள்ளிப் பாடப்புத்தக பக்கங்களை மீண்டும் படிக்கவும்.' : 'Good effort! Reinforce key concepts by reviewing Samacheer Kalvi textbook chapters.')}
                        </p>

                        {/* ₹99 Subscription Spotlight Callout - Respectful Academic Styling */}
                        <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-6 text-center space-y-4 shadow-sm">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20">
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            <span>TNPSC MCQ Academy — Flat ₹99/Month</span>
                          </div>
                          <h5 className="text-lg sm:text-xl font-bold text-foreground">
                            {language === 'ta'
                              ? '5,000+ பாடப்புத்தக வினாக்களை ₹99-ல் திறக்கவும்'
                              : 'Unlock 5,000+ Samacheer Kalvi MCQs for just ₹99/month'}
                          </h5>
                          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                            {language === 'ta'
                              ? 'முழுத் தேர்வுத் தொடர், அச்சிடப்பட்ட பாடநூல் பக்க எண்கள், வினா குறிப்பு சேமிப்பு மற்றும் விரிவான விளக்கங்கள்.'
                              : 'Includes full-length mock tests, printed textbook page references, bookmarking, and zero ad interruptions.'}
                          </p>
                          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                            <Button asChild size="lg" className="w-full sm:w-auto h-11 px-7 font-bold rounded-xl shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground text-sm">
                              <Link
                                href="/subscription"
                                onClick={() => PublicAnalytics.trackCheckoutStart('test_summary_card')}
                                className="flex items-center gap-2"
                              >
                                <span>{language === 'ta' ? 'அகாதெமியில் சேரவும் (₹99/mo)' : 'Join MCQ Academy (₹99/mo)'}</span>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleResetTest}
                              className="w-full sm:w-auto h-11 px-6 font-semibold rounded-xl text-sm border-border hover:bg-muted"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              {language === 'ta' ? 'மீண்டும் தேர்வு எழுதுக' : 'Retake Free Test'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Question by question review */}
                      <div className="border-t border-border pt-8 space-y-6">
                        <h5 className="text-base font-bold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <span>{language === 'ta' ? 'வினா வாரியான விளக்கங்கள்' : 'Detailed Question Review'}</span>
                        </h5>

                        <div className="space-y-4">
                          {questions.map((q, idx) => {
                            const userAnswer = selectedAnswers[q.id];
                            const isCorrect = userAnswer === q.correctOptionIndex;
                            const isUnanswered = userAnswer === undefined;

                            return (
                              <div
                                key={q.id}
                                className={cn(
                                  "rounded-xl border p-4 sm:p-5 transition-colors",
                                  isCorrect
                                    ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10"
                                    : isUnanswered
                                    ? "border-border bg-card"
                                    : "border-red-200 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs px-2 py-0.5 rounded bg-muted text-foreground">
                                      Q{idx + 1}
                                    </span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {language === 'ta' ? q.category_ta : q.category}
                                    </Badge>
                                    <span className="text-[11px] font-semibold text-muted-foreground">{q.examGroup}</span>
                                  </div>
                                  <div>
                                    {isCorrect && (
                                      <Badge className="bg-emerald-800 hover:bg-emerald-800 text-white text-[10px] font-bold flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>{language === 'ta' ? 'சரி (+1)' : 'Correct (+1)'}</span>
                                      </Badge>
                                    )}
                                    {!isCorrect && !isUnanswered && (
                                      <Badge className="bg-rose-800 hover:bg-rose-800 text-white text-[10px] font-bold flex items-center gap-1">
                                        <XCircle className="h-3 w-3" />
                                        <span>{language === 'ta' ? 'தவறு (0)' : 'Incorrect (0)'}</span>
                                      </Badge>
                                    )}
                                    {isUnanswered && (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3" />
                                        <span>{language === 'ta' ? 'விடையளிக்கவில்லை' : 'Skipped'}</span>
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm font-semibold text-foreground mb-3">
                                  {language === 'ta' ? q.question_ta : q.question_en}
                                </p>

                                {/* Options breakdown */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                  {(language === 'ta' ? q.options_ta : q.options_en).map((opt, oIdx) => {
                                    const isThisCorrect = oIdx === q.correctOptionIndex;
                                    const isThisSelected = userAnswer === oIdx;

                                    return (
                                      <div
                                        key={oIdx}
                                        className={cn(
                                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border",
                                          isThisCorrect
                                            ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-bold"
                                            : isThisSelected
                                            ? "border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 line-through"
                                            : "border-border bg-card text-muted-foreground"
                                        )}
                                      >
                                        <span className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold bg-muted">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                        {isThisCorrect && <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />}
                                        {isThisSelected && !isThisCorrect && <XCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400 shrink-0" />}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Explanation & Citations */}
                                <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1.5 border border-border/60">
                                  <div className="font-bold text-foreground flex items-center gap-1.5">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                    <span>{language === 'ta' ? 'விளக்கம்:' : 'Explanation:'}</span>
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {language === 'ta' ? q.explanation_ta : q.explanation_en}
                                  </p>

                                  {q.textbookCitation && (
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-primary pt-1 border-t border-border/40">
                                      <BookMarked className="h-3.5 w-3.5 shrink-0" />
                                      <span>
                                        {q.textbookCitation.standard} {q.textbookCitation.subject}
                                        {q.textbookCitation.pageNumber ? ` · Page ${q.textbookCitation.pageNumber}` : ''}
                                        {q.textbookCitation.lessonName ? ` · ${q.textbookCitation.lessonName}` : ''}
                                      </span>
                                    </div>
                                  )}

                                  {q.sourceRef && (
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground pt-1 border-t border-border/40">
                                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                      <span>{q.sourceRef}</span>
                                      {q.sourceUrl && (
                                        <a
                                          href={q.sourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary underline ml-1"
                                        >
                                          Official Notice
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  ) : (
                    /* ACTIVE QUESTION PLAYER */
                    <CardContent className="p-4 sm:p-8 space-y-6">
                      {/* Top Progress & Question Status */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                          <span>
                            {language === 'ta' ? 'வினா' : 'Question'} {currentQuestionIndex + 1} / {questions.length}
                          </span>
                          <span>
                            {Object.keys(selectedAnswers).length} {language === 'ta' ? 'பதிலளிக்கப்பட்டது' : 'Answered'}
                          </span>
                        </div>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2" />
                      </div>

                      {/* Question Card */}
                      {currentQ && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                                {language === 'ta' ? currentQ.category_ta : currentQ.category}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {currentQ.examGroup}
                              </Badge>
                              <span className="text-xs text-muted-foreground capitalize">
                                {currentQ.difficulty}
                              </span>
                            </div>

                            <h4 className="text-base sm:text-lg md:text-xl font-bold text-foreground leading-snug">
                              {language === 'ta' ? currentQ.question_ta : currentQ.question_en}
                            </h4>
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 gap-2.5">
                            {(language === 'ta' ? currentQ.options_ta : currentQ.options_en).map((optionText, optIndex) => {
                              const isSelected = selectedAnswers[currentQ.id] === optIndex;
                              const isPractice = testMode === 'practice';
                              const hasAnswered = selectedAnswers[currentQ.id] !== undefined;
                              const isCorrect = optIndex === currentQ.correctOptionIndex;

                              let optionStyle = "border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground";

                              if (isPractice && hasAnswered) {
                                if (isCorrect) {
                                  optionStyle = "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm";
                                } else if (isSelected) {
                                  optionStyle = "border-rose-600 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-semibold";
                                } else {
                                  optionStyle = "border-border/50 opacity-60 bg-card";
                                }
                              } else if (isSelected) {
                                optionStyle = "border-primary bg-primary/5 ring-1 ring-primary text-foreground font-semibold";
                              }

                              return (
                                <button
                                  key={optIndex}
                                  onClick={() => handleSelectOption(optIndex)}
                                  disabled={isPractice && hasAnswered}
                                  className={cn(
                                    "flex items-center gap-3 p-3.5 sm:p-4 rounded-xl border text-left text-sm transition-all relative",
                                    optionStyle
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs border transition-colors",
                                      isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted text-muted-foreground border-border"
                                    )}
                                  >
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>

                                  <span className="flex-1 leading-relaxed">{optionText}</span>

                                  {isPractice && hasAnswered && isCorrect && (
                                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-xs font-bold shrink-0">
                                      <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                                      <span className="hidden sm:inline">{language === 'ta' ? 'சரியான விடை' : 'Correct'}</span>
                                    </div>
                                  )}
                                  {isPractice && hasAnswered && isSelected && !isCorrect && (
                                    <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 text-xs font-bold shrink-0">
                                      <XCircle className="h-5 w-5 text-rose-700 dark:text-rose-400" />
                                      <span className="hidden sm:inline">{language === 'ta' ? 'தவறான விடை' : 'Incorrect'}</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Instant Explanation in Practice Mode */}
                          {testMode === 'practice' && selectedAnswers[currentQ.id] !== undefined && (
                            <div className={cn(
                              "rounded-xl border p-4 sm:p-5 space-y-3 animate-in fade-in-50 duration-200",
                              selectedAnswers[currentQ.id] === currentQ.correctOptionIndex
                                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30"
                                : "border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30"
                            )}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {selectedAnswers[currentQ.id] === currentQ.correctOptionIndex ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-rose-700 dark:text-rose-400 shrink-0" />
                                  )}
                                  <span className={cn(
                                    "font-bold text-sm",
                                    selectedAnswers[currentQ.id] === currentQ.correctOptionIndex
                                      ? "text-emerald-900 dark:text-emerald-100"
                                      : "text-rose-900 dark:text-rose-100"
                                  )}>
                                    {selectedAnswers[currentQ.id] === currentQ.correctOptionIndex
                                      ? (language === 'ta' ? 'சரியான விடை!' : 'Correct Answer!')
                                      : (language === 'ta' ? 'தவறான விடை — விளக்கத்தைக் காண்க' : 'Incorrect — Review Rationale')}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold border-border bg-card">
                                  {currentQ.examGroup}
                                </Badge>
                              </div>

                              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                                {language === 'ta' ? currentQ.explanation_ta : currentQ.explanation_en}
                              </p>

                              {currentQ.textbookCitation && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-secondary pt-2 border-t border-border/40">
                                  <BookMarked className="h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    {currentQ.textbookCitation.standard} {currentQ.textbookCitation.subject}
                                    {currentQ.textbookCitation.pageNumber ? ` · பக்கம் ${currentQ.textbookCitation.pageNumber}` : ''}
                                    {currentQ.textbookCitation.lessonName ? ` · ${currentQ.textbookCitation.lessonName}` : ''}
                                  </span>
                                </div>
                              )}

                              {currentQ.sourceRef && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground pt-1">
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  <span>{currentQ.sourceRef}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Navigation Buttons and Question Palette */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                            {/* Previous Button */}
                            <Button
                              variant="outline"
                              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                              disabled={currentQuestionIndex === 0}
                              className="w-full sm:w-auto rounded-xl gap-2 h-10 px-4 text-xs font-bold"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>{language === 'ta' ? 'முந்தைய வினா' : 'Previous'}</span>
                            </Button>

                            {/* Mini Question Jump Dots */}
                            <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
                              {questions.map((q, idx) => {
                                const isCurrent = idx === currentQuestionIndex;
                                const hasAnswer = selectedAnswers[q.id] !== undefined;

                                return (
                                  <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                    className={cn(
                                      "h-6 w-6 rounded-md text-[11px] font-bold transition-all flex items-center justify-center",
                                      isCurrent
                                        ? "ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground"
                                        : hasAnswer
                                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                  >
                                    {idx + 1}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Next / Submit Button */}
                            {currentQuestionIndex < questions.length - 1 ? (
                              <Button
                                onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                                className="w-full sm:w-auto rounded-xl gap-2 h-10 px-5 text-xs font-bold"
                              >
                                <span>{language === 'ta' ? 'அடுத்த வினா' : 'Next Question'}</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={handleSubmitTest}
                                className="w-full sm:w-auto rounded-xl gap-2 h-10 px-6 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{language === 'ta' ? 'தேர்வை சமர்ப்பிக்கவும்' : 'Submit & View Score'}</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            </TabsContent>
          );
        })}

          {/* TAB CONTENT 4: AI TUTOR INTERACTIVE PRECOMPUTED DEMO */}
          <TabsContent value="ai_tutor" className="focus-visible:outline-none focus-visible:ring-0">
            <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-4 sm:p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-accent text-accent-foreground text-[10px] font-black uppercase tracking-wider">
                      Interactive Demonstration
                    </Badge>
                    <Badge variant="outline" className="border-amber-400/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      Zero Cost · Precomputed High-Yield Concepts
                    </Badge>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    {language === 'ta' ? 'TNPSC99 AI வழிகாட்டி மாதிரி விளக்கம்' : 'TNPSC99 AI Tutor Interactive Demo'}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {language === 'ta'
                      ? 'கடினமான இலக்கண விதிகளுக்கும், அறிவியல் சூத்திரங்களுக்கும் AI எவ்வாறு எளிமையான நினைவாற்றல் குறுக்குவழிகளை உருவாக்குகிறது என்பதைப் பாருங்கள்.'
                      : 'Experience how our AI Tutor deconstructs tricky questions, detects TNPSC trap options, and provides memory mnemonics.'}
                  </p>
                </div>

                <div className="text-right">
                  <Badge variant="secondary" className="text-xs font-bold text-muted-foreground">
                    Coming Soon — Optional Add-on
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">Standard MCQ Academy remains ₹99/mo</p>
                </div>
              </div>

              <CardContent className="p-4 sm:p-8 space-y-8">
                {/* 3 Topic Selector Pills */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {language === 'ta' ? 'மாதிரி தலைப்பைத் தேர்ந்தெடுக்கவும்:' : 'Select a Demo Concept Topic:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {AI_TUTOR_PRECOMPUTED_DEMOS.map((demo, dIdx) => (
                      <button
                        key={demo.id}
                        onClick={() => handleSelectAiDemo(dIdx)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          activeAiDemoIndex === dIdx
                            ? "border-accent bg-accent/10 shadow-sm"
                            : "border-border bg-card hover:bg-muted/40"
                        )}
                      >
                        <div className="text-[11px] font-bold text-primary mb-1">
                          {language === 'ta' ? demo.subject_ta : demo.subject_en}
                        </div>
                        <div className="text-xs font-black text-foreground leading-snug">
                          {language === 'ta' ? demo.topicName_ta : demo.topicName_en}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Demo Question & Interactive Prompt */}
                {(() => {
                  const demo = AI_TUTOR_PRECOMPUTED_DEMOS[activeAiDemoIndex];
                  return (
                    <div className="space-y-6 rounded-2xl border border-border bg-muted/20 p-5 sm:p-7">
                      <div className="space-y-2">
                        <Badge variant="secondary" className="text-xs font-bold text-primary">
                          {language === 'ta' ? demo.subject_ta : demo.subject_en}
                        </Badge>
                        <h4 className="text-base sm:text-lg font-bold text-foreground">
                          {language === 'ta' ? demo.sampleQuestion_ta : demo.sampleQuestion_en}
                        </h4>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(language === 'ta' ? demo.options_ta : demo.options_en).map((opt, oIdx) => {
                          const isSelected = aiDemoSelectedOption === oIdx;
                          const isCorrect = oIdx === demo.correctOptionIndex;

                          let style = "border-border bg-card hover:bg-muted/50 text-foreground";
                          if (aiDemoSelectedOption !== null) {
                            if (isCorrect) {
                              style = "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-bold";
                            } else if (isSelected) {
                              style = "border-red-500 bg-red-500/10 text-red-900 dark:text-red-200";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              onClick={() => {
                                setAiDemoSelectedOption(oIdx);
                                setShowAiBreakdown(true);
                              }}
                              className={cn(
                                "flex items-center gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all",
                                style
                              )}
                            >
                              <span className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center shrink-0 font-bold text-xs">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span className="flex-1">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Trigger Button if not yet clicked */}
                      {!showAiBreakdown && (
                        <div className="text-center pt-2">
                          <Button
                            onClick={() => setShowAiBreakdown(true)}
                            variant="outline"
                            className="rounded-xl border-accent/40 text-accent-foreground hover:bg-accent/10 font-bold text-xs gap-2"
                          >
                            <BrainCircuit className="h-4 w-4 text-accent" />
                            <span>{language === 'ta' ? 'AI வழிகாட்டியின் முழு விளக்கத்தைக் காண்க' : 'Reveal AI Tutor Concept Breakdown'}</span>
                          </Button>
                        </div>
                      )}

                      {/* Precomputed Deep-Dive Breakdown */}
                      {showAiBreakdown && (
                        <div className="space-y-4 pt-4 border-t border-border animate-in fade-in-50 duration-300">
                          <div className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-accent" />
                            <h5 className="text-sm font-black uppercase tracking-wider text-foreground">
                              {language === 'ta' ? 'AI வழிகாட்டி பகுப்பாய்வு (Breakdown)' : 'AI Tutor Conceptual Deconstruction'}
                            </h5>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Core Concept */}
                            <div className="rounded-xl bg-card border border-border p-4 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                <BookOpen className="h-4 w-4" />
                                <span>{language === 'ta' ? 'அடிப்படை பாடம் (Core Concept)' : 'Core Concept'}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                                {language === 'ta' ? demo.aiBreakdown.coreConcept_ta : demo.aiBreakdown.coreConcept_en}
                              </p>
                            </div>

                            {/* Mnemonic Shortcut */}
                            <div className="rounded-xl bg-card border border-amber-300/60 dark:border-amber-800/60 p-4 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                                <Sparkles className="h-4 w-4" />
                                <span>{language === 'ta' ? 'நினைவாற்றல் குறுக்குவழி (Mnemonic)' : 'Mnemonic Memory Shortcut'}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
                                {language === 'ta' ? demo.aiBreakdown.mnemonicShortcut_ta : demo.aiBreakdown.mnemonicShortcut_en}
                              </p>
                            </div>

                            {/* Why Distractors Fail */}
                            <div className="rounded-xl bg-card border border-border p-4 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                <HelpCircle className="h-4 w-4" />
                                <span>{language === 'ta' ? 'மாற்று விடைகள் தவறானதன் காரணம்' : 'Why Distractors Fail'}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                {language === 'ta' ? demo.aiBreakdown.whyDistractorsFail_ta : demo.aiBreakdown.whyDistractorsFail_en}
                              </p>
                            </div>

                            {/* TNPSC Trap Alert */}
                            <div className="rounded-xl bg-card border border-red-300/60 dark:border-red-900/60 p-4 space-y-1.5 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-4 w-4" />
                                <span>{language === 'ta' ? 'TNPSC தேர்வு பொறி எச்சரிக்கை' : 'TNPSC Exam Trap Alert'}</span>
                              </div>
                              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                                {language === 'ta' ? demo.aiBreakdown.examTrapAlert_ta : demo.aiBreakdown.examTrapAlert_en}
                              </p>
                            </div>
                          </div>

                          {/* Samacheer Kalvi Textbook Citation */}
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-semibold text-primary">
                            <BookMarked className="h-4 w-4 shrink-0" />
                            <span>{demo.aiBreakdown.textbookCitation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI Tutor Future Availability Callout */}
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 sm:p-6 text-center space-y-3">
                  <h5 className="text-sm sm:text-base font-bold text-foreground">
                    {language === 'ta'
                      ? 'AI வழிகாட்டி விரைவில் விருப்பத் தேர்வாக (Optional Add-on) வரவுள்ளது'
                      : 'AI Tutor will be available soon as an optional prepaid add-on'}
                  </h5>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                    {language === 'ta'
                      ? 'நிலையான ₹99/மாத சந்தாவில் பள்ளிப் பாடநூல் அடிப்படையிலான அனைத்து MCQs, விளக்கங்கள் மற்றும் தேர்வு முறைகள் முழுமையாகக் கிடைக்கும்.'
                      : 'Our standard ₹99/month MCQ Academy includes all 5,000+ textbook MCQs, instant explanations, and exam modes with zero AI charges.'}
                  </p>
                  <Button asChild size="sm" className="rounded-xl font-bold px-6">
                    <Link
                      href="/subscription"
                      onClick={() => PublicAnalytics.trackCheckoutStart('ai_tutor_demo_banner')}
                    >
                      {language === 'ta' ? 'MCQ Academy-ல் இணையுங்கள் (₹99/மாதம்)' : 'Join MCQ Academy (₹99/mo)'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
