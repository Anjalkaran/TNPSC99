'use client';
import { McqTest } from '@/components/mcq-test';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Test, Question, UserTestAttempt } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export default function TestPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestionsInTopic, setTotalQuestionsInTopic] = useState(0);
  const [answeredQuestionsCount, setAnsweredQuestionsCount] = useState(0);
  const [inProgressAttempt, setInProgressAttempt] = useState<UserTestAttempt | null>(null);

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resolveResume, setResolveResume] = useState<((choice: 'resume' | 'new') => void) | null>(null);


  useEffect(() => {
    if (!firestore || !slug || !user) return;

    const fetchTest = async () => {
      setIsLoading(true);
      const testId = Array.isArray(slug) ? slug[0] : decodeURIComponent(slug);
      
      const testDocRef = doc(firestore, 'tests', testId);
      const testDocSnap = await getDoc(testDocRef);

      if (!testDocSnap.exists()) {
        notFound();
        return;
      }

      const testData = { id: testDocSnap.id, ...testDocSnap.data() } as Test;
      setTotalQuestionsInTopic(testData.questionIds.length);

      // Check for an in-progress attempt
      const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
      const inProgressQuery = query(attemptsRef, where('testId', '==', testId), where('status', '==', 'in-progress'));
      const inProgressSnap = await getDocs(inProgressQuery);
      
      let loadedAttempt: UserTestAttempt | null = null;
      let userChoice: 'resume' | 'new' = 'new';

      if (!inProgressSnap.empty) {
        loadedAttempt = { id: inProgressSnap.docs[0].id, ...inProgressSnap.docs[0].data() } as UserTestAttempt;
        
        userChoice = await new Promise((resolve) => {
            setResolveResume(() => resolve);
            setShowResumePrompt(true);
        });
        
        setShowResumePrompt(false);
        setResolveResume(null);

        if (userChoice === 'new' && loadedAttempt) {
            await deleteDoc(doc(firestore, `users/${user.uid}/testAttempts`, loadedAttempt.id));
            loadedAttempt = null;
        }
      }

      // Fetch all questions for the test
      const allQuestions: Question[] = [];
      if (testData.questionIds) {
        const questionIdChunks: string[][] = [];
        for (let i = 0; i < testData.questionIds.length; i += 30) {
          questionIdChunks.push(testData.questionIds.slice(i, i + 30));
        }

        for (const chunk of questionIdChunks) {
          if (chunk.length > 0) {
            const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
            const questionsSnap = await getDocs(questionsQuery);
            questionsSnap.forEach(doc => {
              allQuestions.push({ id: doc.id, ...doc.data() } as Question);
            });
          }
        }
      }

      let sessionQuestions: Question[] = [];
      
      if (userChoice === 'resume' && loadedAttempt) {
          setInProgressAttempt(loadedAttempt);
          const questionMap = new Map(allQuestions.map(q => [q.id, q]));
          sessionQuestions = (loadedAttempt.sessionQuestionIds || []).map(id => questionMap.get(id)).filter(Boolean) as Question[];
      } else {
        setInProgressAttempt(null);
        const completedAttemptsQuery = query(attemptsRef, where('testId', '==', testData.id), where('status', '==', 'completed'));
        const completedAttemptsSnapshot = await getDocs(completedAttemptsQuery);
        
        const correctlyAnsweredIds = new Set<string>();
        completedAttemptsSnapshot.forEach(doc => {
            const attempt = doc.data() as UserTestAttempt;
            if (attempt.correctlyAnsweredQuestionIds) {
                attempt.correctlyAnsweredQuestionIds.forEach(id => correctlyAnsweredIds.add(id));
            }
        });
        setAnsweredQuestionsCount(correctlyAnsweredIds.size);
        
        let filteredQuestions = allQuestions.filter(q => !correctlyAnsweredIds.has(q.id));

        if (filteredQuestions.length === 0 && allQuestions.length > 0) {
            filteredQuestions = allQuestions;
        }
        
        const shuffledQuestions = shuffleArray(filteredQuestions);

        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : null;
        if (limit && !isNaN(limit) && limit > 0) {
          sessionQuestions = shuffledQuestions.slice(0, limit);
        } else {
          sessionQuestions = shuffledQuestions;
        }
      }

      testData.questions = sessionQuestions;
      setTest(testData);
      setIsLoading(false);
    };

    fetchTest();
  }, [firestore, slug, user, searchParams]);
  
  const handleResumeChoice = (choice: 'resume' | 'new') => {
    if (resolveResume) {
        resolveResume(choice);
    }
  };


  if (isLoading) {
    return (
        <>
            <div className="flex min-h-screen items-center justify-center">Loading...</div>
            <AlertDialog open={showResumePrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('resume_test_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('resume_test_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                          onClick={() => handleResumeChoice('new')}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('start_new_test')}
                        </AlertDialogAction>
                        <AlertDialogAction onClick={() => handleResumeChoice('resume')}>
                            {t('continue_test')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
  }
  
  if (!test) {
    return notFound();
  }

  return <McqTest test={test} totalQuestions={totalQuestionsInTopic} answeredQuestions={answeredQuestionsCount} inProgressAttempt={inProgressAttempt} />;
}
