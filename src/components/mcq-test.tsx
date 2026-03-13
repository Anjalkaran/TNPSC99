
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Test, UserTestAttempt, Score, Question, BookmarkedQuestion, StudyMaterial } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCw, Timer, Info, Bookmark, Save, MessageSquareQuote } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
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
import { CommentDialog } from './comment-dialog';


const formatQuestionText = (text: string) => {
    if (!text) {
        return '';
    }
    // Automatically add line breaks before list items like a), b), c), d)
    // to fix formatting for questions where options were pasted into the text body.
    return text.replace(/\s+([a-d]\))/g, '\n$1');
};

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
  const [totalTimeLeft, setTotalTimeLeft] = useState(test.isPreviousYearPaper ? 3 * 60 * 60 : questions.length * 45);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(inProgressAttempt?.id || null);
  const isSavingRef = useRef(false);
  const isExitingIntentionally = useRef(false);

  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [commentQuestion, setCommentQuestion] = useState<Question | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const studyMaterialQuery = useMemoFirebase(() => {
    // Query should only be created if all required test properties are present
    if (!firestore || !test.classId || !test.subjectId || !test.term) {
        return null;
    }
    const qConstraints = [
        where('classId', '==', test.classId),
        where('subjectId', '==', test.subjectId),
        where('term', '==', test.term),
    ];
    if (test.bookType) qConstraints.push(where('bookType', '==', test.bookType));
    if (test.medium) qConstraints.push(where('medium', '==', test.medium));
    
    return query(collection(firestore, 'studyMaterials'), ...qConstraints);
  }, [firestore, test.classId, test.subjectId, test.term, test.bookType, test.medium]);

  const { data: studyMaterials } = useCollection<StudyMaterial>(studyMaterialQuery);
  const studyMaterial = useMemo(() => (studyMaterials && studyMaterials.length > 0 ? studyMaterials[0] : null), [studyMaterials]);

  const decodedTitle = decodeURIComponent(test.title);
  const currentQuestion = questions[currentQuestionIndex];

  const handleOpenCommentDialog = (question: Question) => {
    setCommentQuestion(question);
    setIsCommentDialogOpen(true);
  };

  const getReturnHref = useCallback(() => {
    // Special handling for Tamil categories which have a different URL structure
    // and don't seem to use the bookType parameter.
    if (test.classId && test.subjectId === 'tamil' && test.categoryId) {
      const categoryName = test.title.includes('இலக்கணம்') ? 'ilakkanam' : 'urai-seyyul';
      return `/class/${test.classId}/tamil/${categoryName}`;
    }

    // For all other class-based tests
    if (test.classId && test.subjectId) {
      const params = new URLSearchParams();
      if (test.bookType) {
        params.set('bookType', test.bookType);
      }
      // If coming from a categorized view within a subject, preserve it.
      if (test.categoryId) {
        params.set('category', test.categoryId);
      }

      const queryString = params.toString();
      const basePath = `/class/${test.classId}/subject/${test.subjectId}`;
      
      return `${basePath}${queryString ? `?${queryString}` : ''}`;
    }

    // Fallback for tests that aren't tied to a class/subject (e.g., previous year papers)
    return '/dashboard';
  }, [test]);

  const saveProgress = useCallback(async (status: 'in-progress' | 'completed' = 'in-progress') => {
    if (!user || !firestore || isSavingRef.current) return null;
    isSavingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    let calculatedScore = 0;
    const correctlyAnsweredQuestionIds: string[] = [];
    const incorrectlyAnsweredQuestionIds: string[] = [];
    
    if (status === 'completed') {
        questions.forEach((q, index) => {
            const answerIndex = answers[index];
            if (answerIndex !== undefined) {
                const isCorrect = q.answerOptions[answerIndex] === q.correctAnswer;
                if (isCorrect) {
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
      sessionQuestions: questions,
      status,
      currentQuestionIndex,
      isMockTest: test.isMockTest || false,
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
            classId: test.classId,
            subjectId: test.subjectId,
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
  }, [user, firestore, questions, answers, test, decodedTitle, currentQuestionIndex, attemptId]);
  
  const handleExit = useCallback(async () => {
    if (isExitingIntentionally.current) return;
    isExitingIntentionally.current = true;
    await saveProgress('in-progress');
    toast({ description: t('progress_saved') });
    router.push(getReturnHref());
  }, [saveProgress, toast, router, getReturnHref, t]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmitted && !isExitingIntentionally.current) {
        saveProgress('in-progress');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveProgress, isSubmitted, isExitingIntentionally]);

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
  
  const handleFinalSubmit = useCallback(async () => {
    isExitingIntentionally.current = true; // Prevent unload listeners from firing
    await saveProgress('completed');
    setIsSubmitted(true);
    toast({
        title: "தேர்வு சமர்ப்பிக்கப்பட்டது",
        description: "உங்கள் மதிப்பெண் சேமிக்கப்பட்டது.",
    });
  }, [saveProgress, toast]);

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
  
  const pdfReferenceUrl = useMemo(() => {
    const baseUrl = studyMaterial?.downloadURL || currentQuestion?.referenceUrl?.split('#')[0];
    if (!baseUrl) {
      return null;
    }
    
    const questionPage = currentQuestion?.referencePage;
    if (typeof questionPage === 'number' && questionPage > 0) {
      const pageOffset = test.referencePageOffset || 0;
      const targetPage = questionPage + pageOffset;
      return `${baseUrl}#page=${targetPage}`;
    }
    
    return baseUrl;
  }, [currentQuestion, studyMaterial, test.referencePageOffset]);


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
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
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
            {questions.slice(0, questionsInThisSession).map((q, index) => {
                const isCorrect = q.answerOptions[answers[index]!] === q.correctAnswer;
                return (
                  <div key={q.id} className="text-left p-2 rounded-md bg-muted/50">
                    <p className="font-semibold flex items-center gap-2 whitespace-pre-line">
                      {isCorrect ? <CheckCircle2 className="text-green-500"/> : <XCircle className="text-red-500"/>}
                      {formatQuestionText(q.text)}
                    </p>
                    <p className="text-sm pl-8">உங்கள் பதில்: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{answers[index] !== undefined ? q.answerOptions[answers[index]!] : 'பதிலளிக்கப்படவில்லை'}</span></p>
                    <p className="text-sm pl-8">சரியான பதில்: <span className="text-green-600">{q.correctAnswer}</span></p>
                     {q.explanation && (
                        <div className="mt-2 text-xs text-muted-foreground pl-8 flex gap-2">
                            <Info className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-pre-line">{q.explanation}</span>
                        </div>
                    )}
                  </div>
                )
            })}
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
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="w-full sm:w-auto">
                  <CardTitle>{decodedTitle}</CardTitle>
                  <div className="flex flex-wrap items-center text-sm text-muted-foreground mt-2 gap-4">
                      <span>கேள்வி {currentQuestionIndex + 1} / {questions.length}</span>
                      <Badge variant="outline">
                          முன்னேற்றம்: {answeredQuestions} / {totalQuestions}
                      </Badge>
                  </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                   <div className={cn("flex items-center gap-2 font-mono text-xl sm:text-2xl p-2 rounded-md", totalTimeLeft < 60 ? "text-destructive-foreground bg-destructive" : "bg-muted")}>
                      <Timer className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>{formatTime(totalTimeLeft)}</span>
                  </div>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="outline" className="w-full flex-1 sm:w-auto sm:flex-none">
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
           {test.passage && (
                <div className="mb-6 p-4 bg-muted/50 border rounded-lg">
                    <h3 className="font-semibold mb-2">Passage</h3>
                    <p className="whitespace-pre-line text-muted-foreground">{test.passage}</p>
                </div>
            )}
            {currentQuestion.imageUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question illustration"
                  className="max-w-full h-auto max-h-[300px] rounded-md object-contain border"
                />
              </div>
            )}
          <div className="flex justify-between items-start">
              <p className="font-semibold text-lg mb-6 flex-1 whitespace-pre-line">{formatQuestionText(currentQuestion.text)}</p>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={() => toggleBookmark(currentQuestion.id)}>
                    <Bookmark className={cn("h-6 w-6", bookmarks.includes(currentQuestion.id) ? "fill-primary text-primary" : "text-muted-foreground")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleOpenCommentDialog(currentQuestion)}>
                    <MessageSquareQuote className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
          </div>
          <RadioGroup
              key={currentQuestionIndex}
              onValueChange={handleAnswerChange}
              disabled={isAnswered}
              value={userAnswer?.toString()}
          >
            <div className="space-y-4">
              {currentQuestion.answerOptions.map((option, index) => {
                const isCorrect = option === currentQuestion.correctAnswer;
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

          <div className="flex flex-col sm:flex-row gap-2 justify-between pt-6">
            <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="w-full sm:w-auto"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                முந்தைய
            </Button>
            {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={handleNext} className="w-full sm:w-auto">
                அடுத்தது
                <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            ) : (
                <Button onClick={handleFinalSubmit} className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                சமர்ப்பிக்கவும்
                </Button>
            )}
          </div>

          {(isAnswered && (currentQuestion.reference || currentQuestion.explanation || pdfReferenceUrl)) && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                  {pdfReferenceUrl && (
                      <div>
                          <p className="text-sm font-semibold">குறிப்பு</p>
                          <Button asChild variant="link" className="p-0 h-auto text-sm text-blue-600 hover:underline dark:text-blue-400 text-left whitespace-normal">
                             <Link href={pdfReferenceUrl} target="_blank" rel="noopener noreferrer">
                                {currentQuestion.reference || 'View Reference PDF'}
                             </Link>
                          </Button>
                      </div>
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
      </Card>
      <CommentDialog
        isOpen={isCommentDialogOpen}
        onOpenChange={setIsCommentDialogOpen}
        question={commentQuestion}
      />
    </>
  );
}
