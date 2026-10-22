'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Test, UserTestAttempt, Score, Question, BookmarkedQuestion, UserProfile } from '@/lib/types';
import { hasActiveSubscription } from '@/lib/subscription-utils';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Timer,
  Info,
  Bookmark,
  Save,
  MessageSquareQuote,
  ChevronLeft,
  BookOpen,
  Flag,
  RotateCcw,
  LayoutGrid,
  Send,
  HelpCircle,
  Eraser,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import {
  addDoc,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { CommentDialog } from './comment-dialog';
import { useStudyMaterialUrl } from '@/hooks/use-study-material-url';

import { ModeSelectDialog, type TestMode } from './test/mode-select-dialog';
import { QuestionPalette } from './test/question-palette';
import { TextbookReferenceDrawer } from './test/textbook-reference-drawer';
import { TestResultsView } from './test/test-results-view';
import { syncMistakesToVault } from '@/lib/mistake-vault-service';

// Clean test title helper
const cleanTitle = (title: string) => {
  return title.replace(/^Group\s+II\s*-\s*/i, '').replace(/^Group\s+II\s*/i, '').trim();
};

const formatQuestionText = (text: string) => {
  if (!text) return '';
  return text.replace(/\s*\([a-d]\)/g, '\n$1');
};

export function McqTest({
  test,
  totalQuestions,
  answeredQuestions,
  inProgressAttempt,
}: {
  test: Test;
  totalQuestions: number;
  answeredQuestions: number;
  inProgressAttempt: UserTestAttempt | null;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const questions: Question[] = useMemo(() => test.questions || [], [test.questions]);
  const decodedTitle = cleanTitle(decodeURIComponent(test.title || ''));

  // User Profile for authorization
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAuthorizedForReferences = Boolean(userProfile?.isAdmin || hasActiveSubscription(userProfile));

  // Study material link
  const { downloadURL } = useStudyMaterialUrl(test);

  // ---------------------------------------------------------------------------
  // 1. MODE SELECTION STATE
  // ---------------------------------------------------------------------------
  const initialMode: TestMode | null = inProgressAttempt?.mode || null;
  const [mode, setMode] = useState<TestMode | null>(initialMode);
  const [showModeModal, setShowModeModal] = useState<boolean>(!initialMode);

  // ---------------------------------------------------------------------------
  // 2. QUESTION & ANSWERS STATE
  // ---------------------------------------------------------------------------
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    inProgressAttempt?.currentQuestionIndex || 0
  );
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => {
    if (inProgressAttempt?.answers && inProgressAttempt.answers.length > 0) {
      return inProgressAttempt.answers.map(a => (a === -1 ? undefined : a));
    }
    return Array(questions.length).fill(undefined);
  });

  // Track questions already answered in Practice Mode to prevent re-scoring on click
  const [practiceAnswered, setPracticeAnswered] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    if (inProgressAttempt?.answers) {
      inProgressAttempt.answers.forEach((ans, idx) => {
        if (ans !== -1 && ans !== undefined) map[idx] = true;
      });
    }
    return map;
  });

  // Mark for review state
  const [markedForReview, setMarkedForReview] = useState<boolean[]>(() => {
    if (inProgressAttempt?.markedForReviewIds && questions.length > 0) {
      const set = new Set(inProgressAttempt.markedForReviewIds);
      return questions.map(q => set.has(q.id));
    }
    return Array(questions.length).fill(false);
  });

  // Bookmarks state (persisted to Firestore)
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // 3. TIMER & EXAM DEADLINE RECONCILIATION
  // ---------------------------------------------------------------------------
  // Duration: 1 min per question or test.duration
  const defaultExamDurationSeconds = useMemo(() => {
    if (test.duration && test.duration > 0) return test.duration * 60;
    if (test.isPreviousYearPaper) return 3 * 60 * 60;
    return Math.max(60, questions.length * 60);
  }, [test.duration, test.isPreviousYearPaper, questions.length]);

  const isInitialExpired = Boolean(
    inProgressAttempt?.mode === 'exam' &&
    inProgressAttempt?.examDeadline &&
    new Date(inProgressAttempt.examDeadline).getTime() <= Date.now()
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (inProgressAttempt?.mode === 'exam' && inProgressAttempt.examDeadline) {
      return Math.max(0, Math.round((new Date(inProgressAttempt.examDeadline).getTime() - Date.now()) / 1000));
    }
    return defaultExamDurationSeconds;
  });
  const [timeElapsedSeconds, setTimeElapsedSeconds] = useState<number>(
    inProgressAttempt?.timeSpentSeconds || 0
  );
  const examDeadlineRef = useRef<string | null>(inProgressAttempt?.examDeadline || null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // 4. SUBMISSION & RESULTS STATE
  // ---------------------------------------------------------------------------
  const [isSubmitted, setIsSubmitted] = useState<boolean>(
    inProgressAttempt?.status === 'completed' || isInitialExpired
  );
  const [score, setScore] = useState<number>(inProgressAttempt?.score || 0);
  const [attemptId, setAttemptId] = useState<string | null>(inProgressAttempt?.id || null);
  const attemptIdRef = useRef<string | null>(inProgressAttempt?.id || null);
  const isSavingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isExitingIntentionally = useRef(false);

  // Confirmation dialog state for manual submit
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Mobile Question Palette Drawer state
  const [isPaletteDrawerOpen, setIsPaletteDrawerOpen] = useState(false);

  // Inline Textbook Reference Drawer state
  const [isReferenceDrawerOpen, setIsReferenceDrawerOpen] = useState(false);

  // Comment dialog state
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentQuestion, setCommentQuestion] = useState<Question | null>(null);

  const currentQuestion = questions[currentQuestionIndex] || null;

  // ---------------------------------------------------------------------------
  // 5. TIMER INITIALIZATION & RECONCILIATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mode || isSubmitted) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    if (mode === 'exam') {
      // Reconcile or establish exam deadline
      if (!examDeadlineRef.current) {
        const deadline = new Date(Date.now() + defaultExamDurationSeconds * 1000).toISOString();
        examDeadlineRef.current = deadline;
      }

      const reconcileTime = () => {
        if (!examDeadlineRef.current) return;
        const now = Date.now();
        const deadlineMs = new Date(examDeadlineRef.current).getTime();
        const remaining = Math.max(0, Math.round((deadlineMs - now) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleAutoSubmit();
        }
      };

      reconcileTime();
      timerIntervalRef.current = setInterval(reconcileTime, 1000);

      // Reconcile time on tab focus or device wake
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isSubmitted) {
          reconcileTime();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      // Practice Mode: count UP elapsed time
      timerIntervalRef.current = setInterval(() => {
        setTimeElapsedSeconds(prev => prev + 1);
      }, 1000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [mode, isSubmitted, defaultExamDurationSeconds]);

  // Format timer display
  const formatTimerDisplay = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ---------------------------------------------------------------------------
  // 6. FIRESTORE PERSISTENCE
  // ---------------------------------------------------------------------------
  const saveProgress = useCallback(
    async (status: 'in-progress' | 'completed' = 'in-progress') => {
      if (!user || !firestore || isSavingRef.current) return null;
      isSavingRef.current = true;

      const attemptCollectionRef = collection(firestore, `users/${user.uid}/testAttempts`);
      let effectiveId = attemptId || attemptIdRef.current;
      let attemptDocRef = effectiveId ? doc(attemptCollectionRef, effectiveId) : doc(attemptCollectionRef);
      if (!effectiveId) {
        effectiveId = attemptDocRef.id;
        setAttemptId(effectiveId);
        attemptIdRef.current = effectiveId;
      }

      // Compute score
      let calculatedScore = 0;
      const correctlyAnsweredIds: string[] = [];
      const incorrectlyAnsweredIds: string[] = [];

      questions.forEach((q, idx) => {
        const ansIdx = answers[idx];
        if (ansIdx !== undefined && ansIdx !== -1) {
          if (q.answerOptions[ansIdx] === q.correctAnswer) {
            calculatedScore++;
            correctlyAnsweredIds.push(q.id);
          } else {
            incorrectlyAnsweredIds.push(q.id);
          }
        }
      });

      const totalTimeSpent =
        mode === 'exam'
          ? Math.max(0, defaultExamDurationSeconds - timeLeft)
          : timeElapsedSeconds;

      const markedIds = questions.filter((_, idx) => markedForReview[idx]).map(q => q.id);

      let effectiveDeadlineIso = examDeadlineRef.current || inProgressAttempt?.examDeadline;
      if (!effectiveDeadlineIso && mode === 'exam') {
        effectiveDeadlineIso = new Date(Date.now() + defaultExamDurationSeconds * 1000).toISOString();
        examDeadlineRef.current = effectiveDeadlineIso;
      }
      const effectiveDeadlineMillis = effectiveDeadlineIso ? new Date(effectiveDeadlineIso).getTime() : undefined;

      const attemptData: Partial<UserTestAttempt> = {
        userId: user.uid,
        testId: test.id,
        testTitle: decodedTitle,
        status: 'in-progress',
        currentQuestionIndex,
        answers: answers.map(a => (a === undefined ? -1 : a)),
        questionIds: questions.map(q => q.id),
        score: 0, // Authoritative score is calculated strictly server-side upon finalization
        isMockTest: test.isMockTest || false,
        examGroup: test.examGroup,
        mode: mode || 'practice',
        markedForReviewIds: markedIds,
        startedAt: inProgressAttempt?.startedAt || new Date().toISOString(),
        durationMinutes: Math.round(defaultExamDurationSeconds / 60),
        examDeadline: effectiveDeadlineIso || undefined,
        examDeadlineMillis: effectiveDeadlineMillis || undefined,
        timeSpentSeconds: totalTimeSpent,
        lastUpdatedDate: new Date().toISOString(),
      };

      try {
        await setDoc(attemptDocRef, attemptData, { merge: true });
        isSavingRef.current = false;
        return effectiveId;
      } catch (err: any) {
        console.error('Error saving in-progress test attempt:', err);
        isSavingRef.current = false;
        return effectiveId || null;
      }
    },
    [
      user,
      firestore,
      attemptId,
      questions,
      answers,
      markedForReview,
      mode,
      defaultExamDurationSeconds,
      timeLeft,
      timeElapsedSeconds,
      test,
      decodedTitle,
      currentQuestionIndex,
    ]
  );

  // ---------------------------------------------------------------------------
  // 7. SUBMISSION HANDLERS (SERVER-AUTHORITATIVE FINALIZATION)
  // ---------------------------------------------------------------------------
  const handleFinalSubmit = useCallback(async (isAutomatic = false) => {
    if (isSubmittingRef.current || isSubmitted) return;
    isSubmittingRef.current = true;
    isExitingIntentionally.current = true;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const totalTimeSpent =
      mode === 'exam'
        ? Math.max(0, defaultExamDurationSeconds - timeLeft)
        : timeElapsedSeconds;

    // First ensure latest answers are persisted to the in-progress attempt
    const effectiveAttemptId = (await saveProgress('in-progress')) || attemptIdRef.current || attemptId;

    let finalScore = 0;

    // Authenticated Server-Authoritative Finalization
    if (user && effectiveAttemptId) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/test/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            attemptId: effectiveAttemptId,
            testId: test.id,
            answers: answers.map(a => (a === undefined ? -1 : a)),
            timeSpentSeconds: totalTimeSpent,
            mode: mode || 'practice',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          finalScore = result.score ?? 0;
        } else {
          console.warn('Server finalization returned non-OK status:', response.status);
          // In-memory score fallback
          questions.forEach((q, idx) => {
            const a = answers[idx];
            if (a !== undefined && a !== -1 && q.answerOptions[a] === q.correctAnswer) {
              finalScore++;
            }
          });
        }
      } catch (submitErr) {
        console.error('Server finalization request failed:', submitErr);
        questions.forEach((q, idx) => {
          const a = answers[idx];
          if (a !== undefined && a !== -1 && q.answerOptions[a] === q.correctAnswer) {
            finalScore++;
          }
        });
      }
    } else {
      // In-memory calculation for unauthenticated preview mode
      questions.forEach((q, idx) => {
        const a = answers[idx];
        if (a !== undefined && a !== -1 && q.answerOptions[a] === q.correctAnswer) {
          finalScore++;
        }
      });
    }

    setScore(finalScore);
    setIsSubmitted(true);
    setShowSubmitConfirm(false);

    toast({
      title: isAutomatic ? "Time Expired — Exam Submitted" : "Examination Submitted Successfully",
      description: `Your final score is ${finalScore} / ${questions.length}. Review detailed explanations below.`,
    });
  }, [
    answers,
    questions,
    isSubmitted,
    saveProgress,
    toast,
    user,
    attemptId,
    test.id,
    mode,
    defaultExamDurationSeconds,
    timeLeft,
    timeElapsedSeconds,
  ]);

  const handleAutoSubmit = useCallback(() => {
    handleFinalSubmit(true);
  }, [handleFinalSubmit]);

  // ---------------------------------------------------------------------------
  // 8. ANSWER SELECTION & INTERACTION HANDLERS
  // ---------------------------------------------------------------------------
  const isExamExpired = () => {
    if (mode !== 'exam') return false;
    if (timeLeft <= 0) return true;
    if (examDeadlineRef.current && new Date(examDeadlineRef.current).getTime() <= Date.now()) {
      return true;
    }
    return false;
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (isSubmitted || isExamExpired()) return;

    if (mode === 'practice') {
      // In practice mode, once answered, prevent re-scoring repeatedly
      if (practiceAnswered[currentQuestionIndex]) return;

      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = optionIndex;
      setAnswers(newAnswers);

      setPracticeAnswered(prev => ({ ...prev, [currentQuestionIndex]: true }));
    } else {
      // In Exam Mode, options are freely changeable until final submit
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = optionIndex;
      setAnswers(newAnswers);
    }
  };

  const handleClearAnswer = () => {
    if (isSubmitted || isExamExpired()) return;
    if (mode === 'practice') return; // Cannot clear revealed answer in practice mode

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = undefined;
    setAnswers(newAnswers);
  };

  const toggleMarkForReview = () => {
    if (isSubmitted || isExamExpired()) return;
    setMarkedForReview(prev => {
      const next = [...prev];
      next[currentQuestionIndex] = !next[currentQuestionIndex];
      return next;
    });
  };

  // Previous / Next navigation
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePaletteSelect = (index: number) => {
    setCurrentQuestionIndex(index);
    setIsPaletteDrawerOpen(false);
  };

  // Exit & Save
  const handleSaveAndExit = async () => {
    if (isExitingIntentionally.current) return;
    isExitingIntentionally.current = true;
    await saveProgress('in-progress');
    toast({ description: "Your progress has been saved. You can resume anytime." });
    router.back();
  };

  // Bookmarks
  useEffect(() => {
    if (!user || !firestore) return;
    const fetchBookmarks = async () => {
      const q = query(collection(firestore, `users/${user.uid}/bookmarkedQuestions`));
      const snap = await getDocs(q);
      setBookmarks(snap.docs.map(d => d.data().questionId));
    };
    fetchBookmarks();
  }, [user, firestore]);

  const toggleBookmark = (questionId: string) => {
    if (!user || !firestore) return;
    const isBookmarked = bookmarks.includes(questionId);
    const bookmarksRef = collection(firestore, `users/${user.uid}/bookmarkedQuestions`);

    if (isBookmarked) {
      const q = query(bookmarksRef, where('questionId', '==', questionId));
      getDocs(q).then(snap => {
        const batch = writeBatch(firestore);
        snap.forEach(d => batch.delete(d.ref));
        return batch.commit();
      }).then(() => {
        setBookmarks(prev => prev.filter(id => id !== questionId));
        toast({ description: "Bookmark removed." });
      });
    } else {
      addDoc(bookmarksRef, {
        userId: user.uid,
        questionId,
        createdAt: new Date().toISOString(),
      }).then(() => {
        setBookmarks(prev => [...prev, questionId]);
        toast({ description: "Question bookmarked!" });
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 9. RETAKE HANDLER
  // ---------------------------------------------------------------------------
  const handleRetake = useCallback(
    async (newMode: 'practice' | 'exam') => {
      // Discard previous completed attempt record to allow fresh session
      if (attemptId && firestore && user) {
        const attemptRef = doc(firestore, `users/${user.uid}/testAttempts`, attemptId);
        await deleteDoc(attemptRef).catch(console.warn);
      }
      setMode(newMode);
      setAnswers(Array(questions.length).fill(undefined));
      setPracticeAnswered({});
      setMarkedForReview(Array(questions.length).fill(false));
      setCurrentQuestionIndex(0);
      setIsSubmitted(false);
      setScore(0);
      setAttemptId(null);
      examDeadlineRef.current = null;
      setTimeLeft(defaultExamDurationSeconds);
      setTimeElapsedSeconds(0);
      isSubmittingRef.current = false;
      isExitingIntentionally.current = false;
    },
    [attemptId, firestore, user, questions.length, defaultExamDurationSeconds]
  );

  // ---------------------------------------------------------------------------
  // 10. RENDER: MODE SELECTION MODAL
  // ---------------------------------------------------------------------------
  if (!mode || showModeModal) {
    return (
      <ModeSelectDialog
        open={showModeModal}
        testTitle={decodedTitle}
        totalQuestions={questions.length}
        estimatedDurationMinutes={Math.round(defaultExamDurationSeconds / 60)}
        onSelectMode={(selectedMode) => {
          setMode(selectedMode);
          setShowModeModal(false);
        }}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // 11. RENDER: POST-EXAM RESULTS VIEW
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    const totalTimeSpent =
      mode === 'exam'
        ? Math.max(0, defaultExamDurationSeconds - timeLeft)
        : timeElapsedSeconds;

    return (
      <TestResultsView
        test={test}
        questions={questions}
        answers={answers}
        markedForReview={markedForReview}
        timeTakenSeconds={totalTimeSpent}
        mode={mode}
        onRetake={handleRetake}
        onExit={() => router.back()}
        isAuthorizedForReferences={isAuthorizedForReferences}
        studyMaterialUrl={downloadURL}
      />
    );
  }

  // Active question parameters
  const currentAnswerIndex = answers[currentQuestionIndex];
  const isQuestionAnsweredInPractice = mode === 'practice' && practiceAnswered[currentQuestionIndex];
  const isCurrentQuestionMarked = markedForReview[currentQuestionIndex];

  // Palette metrics
  const answeredCount = answers.filter(a => a !== undefined && a !== -1).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = markedForReview.filter(Boolean).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* ===================================================================== */}
      {/* COMPACT STICKY TEST HEADER                                           */}
      {/* ===================================================================== */}
      <div className="sticky top-14 z-30 bg-card/95 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-2">
        {/* Left: Title & Mode Badge */}
        <div className="flex items-center gap-2 overflow-hidden">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-black uppercase tracking-wider shrink-0",
              mode === 'practice'
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                : "bg-primary/10 text-primary border-primary/30"
            )}
          >
            {mode === 'practice' ? 'Practice' : 'Exam Mode'}
          </Badge>
          <h2 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[140px] sm:max-w-xs md:max-w-md">
            {decodedTitle}
          </h2>
        </div>

        {/* Center: Timer / Elapsed Display */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black border transition-colors",
              mode === 'exam' && timeLeft < 300
                ? "bg-destructive/15 border-destructive text-destructive animate-pulse"
                : "bg-muted border-border text-foreground"
            )}
          >
            <Timer className="h-4 w-4 shrink-0" />
            <span>
              {mode === 'exam' ? formatTimerDisplay(timeLeft) : formatTimerDisplay(timeElapsedSeconds)}
            </span>
          </div>

          {/* Question Palette Trigger (Mobile Drawer) */}
          <Sheet open={isPaletteDrawerOpen} onOpenChange={setIsPaletteDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden h-8 px-2.5 rounded-xl text-xs font-bold">
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                <span>{currentQuestionIndex + 1}/{questions.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] p-6 bg-card border-t border-border">
              <SheetHeader className="pb-3 border-b border-border text-left">
                <SheetTitle className="text-base font-bold text-foreground">
                  Question Palette ({questions.length} Questions)
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Tap any number to jump directly to that question.
                </SheetDescription>
              </SheetHeader>
              <div className="pt-4">
                <QuestionPalette
                  totalQuestions={questions.length}
                  currentQuestionIndex={currentQuestionIndex}
                  answers={answers}
                  markedForReview={markedForReview}
                  onSelectQuestion={handlePaletteSelect}
                  onSubmitTest={() => setShowSubmitConfirm(true)}
                  mode={mode}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Right: Save & Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveAndExit}
            className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl"
            title="Save and exit test"
          >
            <Save className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Save & Exit</span>
          </Button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAIN TEST WORKSPACE (QUESTION CARD + PALETTE SIDEBAR)                 */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Question Card */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border-border bg-card shadow-md overflow-hidden">
            {/* Question Progress Bar */}
            <div className="bg-muted h-1.5 w-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <CardContent className="p-5 sm:p-7 space-y-5">
              {/* Question Subheader: Number, Bookmark & Report */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>

                  {isCurrentQuestionMarked && (
                    <Badge variant="outline" className="text-[10px] font-bold text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950">
                      <Flag className="h-3 w-3 mr-1 fill-purple-600" /> Marked for Review
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary"
                    title="Bookmark question"
                  >
                    <Bookmark
                      className={cn(
                        "h-4 w-4",
                        bookmarks.includes(currentQuestion.id) && "fill-primary text-primary"
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCommentQuestion(currentQuestion);
                      setIsCommentDialogOpen(true);
                    }}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    title="Report issue or add feedback"
                  >
                    <MessageSquareQuote className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Optional Passage Text */}
              {test.passage && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-48 overflow-y-auto">
                  <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Passage:</p>
                  <p className="whitespace-pre-line">{test.passage}</p>
                </div>
              )}

              {/* Optional Question Diagram / Image */}
              {currentQuestion.imageUrl && (
                <div className="flex justify-center p-3 rounded-xl bg-muted/20 border border-border">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question visual"
                    className="max-h-64 object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="pt-1">
                <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed whitespace-pre-line break-words">
                  {formatQuestionText(currentQuestion.text)}
                </p>
              </div>

              {/* Radio Answer Options */}
              <div className="space-y-3 pt-2">
                {currentQuestion.answerOptions.map((option, optIdx) => {
                  const isSelected = currentAnswerIndex === optIdx;
                  const isCorrect = option === currentQuestion.correctAnswer;

                  let optionBorder = 'border-border hover:border-primary/50 hover:bg-muted/30';
                  let optionBadge = null;

                  if (mode === 'practice' && isQuestionAnsweredInPractice) {
                    if (isCorrect) {
                      optionBorder = 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-bold';
                      optionBadge = (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 ml-2" />
                      );
                    } else if (isSelected && !isCorrect) {
                      optionBorder = 'border-destructive bg-destructive/10 text-destructive font-semibold';
                      optionBadge = (
                        <XCircle className="h-5 w-5 text-destructive shrink-0 ml-2" />
                      );
                    }
                  } else if (isSelected) {
                    optionBorder = 'border-primary bg-primary/10 text-foreground font-semibold shadow-sm';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleAnswerSelect(optIdx)}
                      className={cn(
                        "flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all duration-150 active:scale-[0.99]",
                        optionBorder,
                        isQuestionAnsweredInPractice && "cursor-default"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 text-muted-foreground"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="whitespace-pre-line leading-relaxed break-words">{option}</span>
                      </div>
                      {optionBadge}
                    </div>
                  );
                })}
              </div>

              {/* PRACTICE MODE: REVEALED EXPLANATION & REFERENCE */}
              {mode === 'practice' && isQuestionAnsweredInPractice && (
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 text-xs animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      விளக்கம் & பாடநூல் குறிப்பு (Rationale)
                    </span>

                    {currentQuestion.referencePage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsReferenceDrawerOpen(true)}
                        className="h-7 px-2.5 rounded-lg text-primary border-primary/30 text-xs font-bold hover:bg-primary/10"
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1" /> View Textbook Page {currentQuestion.referencePage}
                      </Button>
                    )}
                  </div>

                  {currentQuestion.explanation && (
                    <p className="text-foreground/90 whitespace-pre-line leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  )}

                  {currentQuestion.reference && (
                    <div className="pt-2 border-t border-primary/10">
                      <p className="font-bold text-primary">பாடநூல் குறிப்பு:</p>
                      <p className="text-foreground/80 mt-0.5 whitespace-pre-line">
                        {currentQuestion.reference}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* NAVIGATION ACTION BAR */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="rounded-xl h-10 px-4 text-xs font-bold"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Previous
                </Button>

                {/* Exam Mode: Clear Answer & Mark for Review Controls */}
                {mode === 'exam' && (
                  <div className="flex items-center gap-1.5">
                    {currentAnswerIndex !== undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAnswer}
                        className="h-9 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive"
                      >
                        <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
                      </Button>
                    )}
                    <Button
                      variant={isCurrentQuestionMarked ? "secondary" : "outline"}
                      size="sm"
                      onClick={toggleMarkForReview}
                      className={cn(
                        "h-9 px-3 rounded-xl text-xs font-bold",
                        isCurrentQuestionMarked && "bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-950 dark:text-purple-200"
                      )}
                    >
                      <Flag className="h-3.5 w-3.5 mr-1.5" />
                      {isCurrentQuestionMarked ? "Marked" : "Mark Review"}
                    </Button>
                  </div>
                )}

                {/* Next or Submit Button */}
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      if (mode === 'exam') {
                        setShowSubmitConfirm(true);
                      } else {
                        handleFinalSubmit(false);
                      }
                    }}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Test
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Desktop Sticky Question Palette Sidebar */}
        <div className="hidden lg:block lg:col-span-4 sticky top-32">
          <Card className="rounded-2xl border-border bg-card shadow-md p-5">
            <h3 className="font-bold text-sm text-foreground mb-3 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs font-normal text-muted-foreground">{questions.length} total</span>
            </h3>
            <QuestionPalette
              totalQuestions={questions.length}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              markedForReview={markedForReview}
              onSelectQuestion={handlePaletteSelect}
              onSubmitTest={() => setShowSubmitConfirm(true)}
              mode={mode}
            />
          </Card>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXAM SUBMISSION CONFIRMATION DIALOG                                    */}
      {/* ===================================================================== */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-md p-6 bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-foreground">
              Submit Examination?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-xs sm:text-sm text-muted-foreground">
                <p>Are you sure you want to finish and submit your test?</p>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs font-semibold text-foreground">
                  <div className="flex justify-between">
                    <span>Total Questions:</span>
                    <strong>{questions.length}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Answered:</span>
                    <strong>{answeredCount}</strong>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Unanswered / Skipped:</span>
                    <strong>{unansweredCount}</strong>
                  </div>
                  {markedCount > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Marked for Review:</span>
                      <strong>{markedCount}</strong>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl">Continue Test</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleFinalSubmit(false)}
              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              Confirm Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===================================================================== */}
      {/* INLINE TEXTBOOK REFERENCE DRAWER                                       */}
      {/* ===================================================================== */}
      {currentQuestion && (
        <TextbookReferenceDrawer
          open={isReferenceDrawerOpen}
          onOpenChange={setIsReferenceDrawerOpen}
          url={currentQuestion.referenceUrl || downloadURL}
          printedPage={currentQuestion.referencePage}
          offset={test.referencePageOffset || 0}
          title={test.title}
          citation={currentQuestion.reference}
          isAuthorized={isAuthorizedForReferences}
        />
      )}

      {/* ===================================================================== */}
      {/* COMMENT / REPORT ISSUE DIALOG                                         */}
      {/* ===================================================================== */}
      <CommentDialog
        isOpen={isCommentDialogOpen}
        onOpenChange={setIsCommentDialogOpen}
        question={commentQuestion}
      />
    </div>
  );
}
