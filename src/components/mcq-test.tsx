'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Test, UserTestAttempt, Score, Question, BookmarkedQuestion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCw, Timer, Info, Bookmark, Save } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, doc, setDoc, getDocs, query, where, deleteDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
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
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';


export function McqTest({ 
    test, 
    totalQuestions, 
    answeredQuestions,
    inProgressAttempt
}: { 
    test: Test, 
    totalQuestions: number, 
    answeredQuestions: number,
    inProgressAttempt: UserTestAttempt | null 
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const questions = test.questions || [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(inProgressAttempt?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<(number | undefined)[]>(
      inProgressAttempt?.answers.map(a => a === -1 ? undefined : a) || Array(questions.length).fill(undefined)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [totalTimeLeft, setTotalTimeLeft] = useState(questions.length * 45);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(inProgressAttempt?.id || null);
  const isSavingRef = useRef(false);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const decodedTitle = decodeURIComponent(test.title);
  const currentQuestion = questions[currentQuestionIndex];
  
  const referenceUrlWithPage = useMemo(() => {
    if (!currentQuestion?.referenceUrl) return '#';

    const offset = test.referencePageOffset || 0;
    const pageNumber = (currentQuestion.referencePage || 0) + offset;
    const finalPageNumber = pageNumber > 0 ? pageNumber : 1;

    const baseUrl = currentQuestion.referenceUrl.split('#')[0];
    
    return `${baseUrl}#page=${finalPageNumber}`;
  }, [currentQuestion, test.referencePageOffset]);


  const getReturnHref = useCallback(() => {
    if (test.classId && test.subjectId) {
        if (test.subjectId === 'tamil' && test.categoryId) {
            const categoryName = test.title.includes('இலக்கணம்') ? 'ilakkanam' : 'urai-seyyul';
            return `/class/${test.classId}/tamil/${categoryName}`;
        }
        return `/class/${test.classId}/subject/${test.subjectId}`;
    }
    return '/dashboard';
  }, [test]);

  const saveProgress = useCallback(async (status: 'in-progress' | 'completed' = 'in-progress') => {
    if (!user || !firestore || isSavingRef.current) return null;
    isSavingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    const sessionQuestionIds = questions.map(q => q.id);
    let calculatedScore = 0;
    const correctlyAnsweredQuestionIds: string[] = [];
    const incorrectlyAnsweredQuestionIds: string[] = [];
    
    if (status === 'completed') {
        questions.forEach((q, index) => {
            const answerIndex = answers[index];
            if (answerIndex !== undefined) {
                if (q.correctAnswerIndex === answerIndex) {
                    calculatedScore++;
                    correctlyAnsweredQuestionIds.push(q.id);
                } else {
                    incorrectlyAnsweredQuestionIds.push(q.id);
                }
            } else {
                incorrectlyAnsweredQuestionIds.push(q.id);
            }
        });
        setScore(calculatedScore);
    }
    
    const attemptData: Omit<UserTestAttempt, 'id'> = {
      userId: user.uid,
      testId: test.id,
      testTitle: decodedTitle,
      lastUpdatedDate: new Date().toISOString(),
      score: status === 'completed' ? calculatedScore : 0,
      answers: answers.map(a => a ?? -1),
      sessionQuestionIds,
      status,
      currentQuestionIndex,
      ...(status === 'completed' && { correctlyAnsweredQuestionIds, incorrectlyAnsweredQuestionIds })
    };

    try {
      let docRef;
      if (attemptId) {
        docRef = doc(firestore, `users/${user.uid}/testAttempts`, attemptId);
        await setDoc(docRef, attemptData, { merge: true });
      } else {
        docRef = doc(collection(firestore, `users/${user.uid}/testAttempts`));
        await setDoc(docRef, { ...attemptData, id: docRef.id });
        setAttemptId(docRef.id);
      }

      if (status === 'completed' && calculatedScore > 0) {
          const scoreData: Score = {
            userId: user.uid,
            username: user.displayName || 'Anonymous',
            score: calculatedScore,
            testId: test.id,
            testTitle: decodedTitle,
            createdAt: new Date().toISOString(),
          };
          const scoresCollectionRef = collection(firestore, `scores`);
          addDoc(scoresCollectionRef, scoreData).catch(error => {
              errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                  path: scoresCollectionRef.path,
                  operation: 'create',
                  requestResourceData: scoreData,
              })
              )
          });
      }
      isSavingRef.current = false;
      return docRef.id;

    } catch (error) {
       console.error("Error saving test attempt: ", error);
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: `users/${user.uid}/testAttempts/${attemptId || ''}`,
                operation: 'write',
                requestResourceData: attemptData,
            })
        )
       isSavingRef.current = false;
       return null;
    }
  }, [user, firestore, questions, answers, test.id, decodedTitle, currentQuestionIndex, attemptId]);
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isSubmitted) {
        saveProgress('in-progress');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveProgress, isSubmitted]);

  const handleFinalSubmit = useCallback(async () => {
    await saveProgress('completed');
    setIsSubmitted(true);
    toast({
        title: "தேர்வு சமர்ப்பிக்கப்பட்டது",
        description: "உங்கள் மதிப்பெண் சேமிக்கப்பட்டது.",
    });
  }, [saveProgress, toast]);

  const handleExit = useCallback(async () => {
    await saveProgress('in-progress');
    toast({ description: t('progress_saved') });
    router.push(getReturnHref());
  }, [saveProgress, toast, router, getReturnHref, t]);

  useEffect(() => {
    if (!user || !firestore) return;
    const fetchBookmarks = async () => {
        const q = query(collection(firestore, `users/${user.uid}/bookmarkedQuestions`));
        const querySnapshot = await getDocs(q);
        const questionIds = querySnapshot.docs.map(doc => doc.data().questionId);
        setBookmarks(questionIds);
    };
    fetchBookmarks();
  }, [user, firestore]);

  const toggleBookmark = (questionId: string) => {
    if (!user || !firestore) return;

    const isBookmarked = bookmarks.includes(questionId);
    const bookmarksRef = collection(firestore, `users/${user.uid}/bookmarkedQuestions`);

    if (isBookmarked) {
      const q = query(bookmarksRef, where('questionId', '==', questionId));
      getDocs(q).then((querySnapshot) => {
        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      }).then(() => {
        setBookmarks(bookmarks.filter(id => id !== questionId));
        toast({ description: "Bookmark removed." });
      }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: bookmarksRef.path,
          operation: 'delete'
        }));
      });

    } else {
      const newBookmark: Omit<BookmarkedQuestion, 'id'> = {
        userId: user.uid,
        questionId,
        createdAt: new Date().toISOString()
      };

      addDoc(bookmarksRef, newBookmark).then((docRef) => {
        setBookmarks([...bookmarks, questionId]);
        toast({ description: "Question bookmarked!" });
      }).catch(error => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: bookmarksRef.path,
          operation: 'create',
          requestResourceData: newBookmark
        }));
      });
    }
  };


  useEffect(() => {
    setIsAnswered(answers[currentQuestionIndex] !== undefined);
  }, [currentQuestionIndex, answers]);
  
  useEffect(() => {
    if (decodedTitle) {
        document.title = decodedTitle;
    }
  }, [decodedTitle]);

  useEffect(() => {
    if (isSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTotalTimeLeft(prevTime => {
        if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleFinalSubmit();
            return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, handleFinalSubmit]);


  const handleAnswerChange = (value: string) => {
    if (isAnswered) return;
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = parseInt(value, 10);
    setAnswers(newAnswers);
    setIsAnswered(true);
  };
  
  const handlePrevious = () => {
    setCurrentQuestionIndex(currentQuestionIndex - 1);
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
        handleFinalSubmit();
    }
  };

  const handleTryAgain = useCallback(async () => {
    if (attemptId && firestore && user) {
        const attemptRef = doc(firestore, `users/${user.uid}/testAttempts`, attemptId);
        await deleteDoc(attemptRef).catch(e => console.error("Failed to delete in-progress attempt", e));
    }
    window.location.reload();
  }, [attemptId, firestore, user]);

  const returnHref = getReturnHref();

  if (questions.length === 0) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{decodedTitle}</CardTitle>
           <CardDescription>
             <Badge variant="outline">
              முன்னேற்றம்: {answeredQuestions} / {totalQuestions} கேள்விகள் சரியாக பதிலளிக்கப்பட்டுள்ளன
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <p className="text-xl font-semibold mb-2">வாழ்த்துக்கள்!</p>
          <p className="text-muted-foreground">இந்த தலைப்பில் உள்ள அனைத்து கேள்விகளுக்கும் நீங்கள் சரியாக பதிலளித்துவிட்டீர்கள்.</p>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-4">
           <Button onClick={handleTryAgain} className="w-full sm:w-auto">
            <RotateCw className="mr-2 h-4 w-4" />
            மீண்டும் முயற்சிக்கவும்
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={returnHref}>முகப்புக்குத் திரும்பு</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const userAnswer = answers[currentQuestionIndex];
  
  const questionsInThisSession = isSubmitted ? answers.filter(a => a !== undefined).length : questions.length;
  const scorePercentage = (score / questionsInThisSession) * 100;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl">தேர்வு முடிந்தது!</CardTitle>
          <CardDescription>நீங்கள் {decodedTitle} தேர்வை முடித்துவிட்டீர்கள்.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-5xl font-bold" style={{ color: 'hsl(var(--accent))' }}>
            {score} / {questionsInThisSession}
          </div>
          <div className="w-full">
            <Progress value={scorePercentage} className="h-4" />
            <p className="text-sm text-muted-foreground mt-2">{scorePercentage.toFixed(0)}% சரி</p>
          </div>
           <Badge variant="outline">
            மொத்த முன்னேற்றம்: {answeredQuestions + score} / {totalQuestions} கேள்விகள் சரியாக பதிலளிக்கப்பட்டுள்ளன
          </Badge>
          <div className="space-y-4 max-h-60 overflow-y-auto p-4 border rounded-md">
            {questions.slice(0, questionsInThisSession).map((q, index) => (
              <div key={q.id} className="text-left p-2 rounded-md bg-muted/50">
                <p className="font-semibold flex items-center gap-2 whitespace-pre-line">
                  {answers[index] === q.correctAnswerIndex ? <CheckCircle2 className="text-green-500"/> : <XCircle className="text-red-500"/>}
                  {q.text}
                </p>
                <p className="text-sm pl-8">உங்கள் பதில்: <span className={answers[index] === q.correctAnswerIndex ? 'text-green-600' : 'text-red-600'}>{answers[index] !== undefined ? q.answerOptions[answers[index]!] : 'பதிலளிக்கப்படவில்லை'}</span></p>
                <p className="text-sm pl-8">சரியான பதில்: <span className="text-green-600">{q.answerOptions[q.correctAnswerIndex]}</span></p>
                 {q.explanation && (
                    <div className="mt-2 text-xs text-muted-foreground pl-8 flex gap-2">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span className="whitespace-pre-line">{q.explanation}</span>
                    </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-4">
          <Button onClick={handleTryAgain} className="w-full sm:w-auto">
            <RotateCw className="mr-2 h-4 w-4" />
            மீண்டும் முயற்சிக்கவும்
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={returnHref}>முகப்புக்குத் திரும்பு</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className='flex justify-between items-start'>
            <div>
                <CardTitle>{decodedTitle}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground mt-2 gap-4">
                    <span>கேள்வி {currentQuestionIndex + 1} / {questions.length}</span>
                    <Badge variant="outline">
                        முன்னேற்றம்: {answeredQuestions} / {totalQuestions}
                    </Badge>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <div className={cn("flex items-center gap-2 font-mono text-2xl p-2 rounded-md", totalTimeLeft < 60 ? "text-destructive-foreground bg-destructive" : "bg-muted")}>
                    <Timer className="h-6 w-6" />
                    <span>{formatTime(totalTimeLeft)}</span>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="outline">
                           <Save className="mr-2 h-4 w-4" />
                           {t('save_and_exit')}
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('save_and_exit_confirm_title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                               {t('save_and_exit_confirm_desc')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleExit}>{t('confirm_and_exit')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="py-6">
        <div className="flex justify-between items-start">
            <p className="font-semibold text-lg mb-6 flex-1 whitespace-pre-line">{currentQuestion.text}</p>
            <Button variant="ghost" size="icon" onClick={() => toggleBookmark(currentQuestion.id)}>
                <Bookmark className={cn("h-6 w-6", bookmarks.includes(currentQuestion.id) ? "fill-primary text-primary" : "text-muted-foreground")} />
            </Button>
        </div>
        <RadioGroup
            key={currentQuestionIndex}
            onValueChange={handleAnswerChange}
            disabled={isAnswered}
            value={userAnswer?.toString()}
        >
          <div className="space-y-4">
            {currentQuestion.answerOptions.map((option, index) => {
              const isCorrect = index === currentQuestion.correctAnswerIndex;
              const isSelected = index === userAnswer;

              const getOptionClass = () => {
                if (!isAnswered) return 'border-border has-[:checked]:bg-primary/20 has-[:checked]:border-primary';
                if (isCorrect) return 'border-green-500 bg-green-100 dark:bg-green-900';
                if (isSelected && !isCorrect) return 'border-red-500 bg-red-100 dark:bg-red-900';
                return 'border-border';
              };
              
              return (
              <Label key={option} className={cn("flex items-center space-x-3 p-4 border rounded-lg transition-colors cursor-pointer", getOptionClass())}>
                <RadioGroupItem value={index.toString()} id={option} />
                <span className='whitespace-pre-line'>{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="ml-auto text-green-600"/>}
                {isAnswered && isSelected && !isCorrect && <XCircle className="ml-auto text-red-600"/>}
              </Label>
            )})}
          </div>
        </RadioGroup>
        {(isAnswered && (currentQuestion.reference || currentQuestion.explanation)) && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                {currentQuestion.reference && (
                    <div>
                        <p className="text-sm font-semibold">குறிப்பு</p>
                        <a
                            href={referenceUrlWithPage}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                        >
                        {currentQuestion.reference}
                        </a>
                    </div>
                )}
                {currentQuestion.reference && currentQuestion.explanation && (
                    <div className="my-3 border-t border-border"></div>
                )}
                {currentQuestion.explanation && (
                    <div>
                        <p className="text-sm font-semibold">விளக்கம்</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{currentQuestion.explanation}</p>
                    </div>
                )}
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          முந்தைய
        </Button>
        {currentQuestionIndex < questions.length - 1 ? (
          <Button onClick={handleNext} disabled={!isAnswered}>
            அடுத்தது
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleFinalSubmit} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }} disabled={!isAnswered}>
            சமர்ப்பிக்கவும்
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
