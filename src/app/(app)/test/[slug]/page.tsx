'use client';
import { McqTest } from '@/components/mcq-test';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, documentId } from 'firebase/firestore';
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
import { buttonVariants } from '@/components/ui/button';

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

  const [testData, setTestData] = useState<Test | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestionsInTopic, setTotalQuestionsInTopic] = useState(0);
  const [answeredQuestionsCount, setAnsweredQuestionsCount] = useState(0);
  const [inProgressAttempt, setInProgressAttempt] = useState<UserTestAttempt | null>(null);

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resolveResume, setResolveResume] = useState<((choice: 'resume' | 'new') => void) | null>(null);


  useEffect(() => {
    if (!firestore || !slug || !user) return;

    const fetchTestAndQuestions = async () => {
      setIsLoading(true);
      const testId = Array.isArray(slug) ? slug[0] : decodeURIComponent(slug);
      
      const testDocRef = doc(firestore, 'tests', testId);
      const testDocSnap = await getDoc(testDocRef);

      if (!testDocSnap.exists()) {
        notFound();
        return;
      }

      const test = { id: testDocSnap.id, ...testDocSnap.data() } as Test;
      setTestData(test);
      setTotalQuestionsInTopic(test.questionIds.length);

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

      let questionsForSession: Question[] = [];
      let questionIdsForSession: string[] = [];
      
      if (userChoice === 'resume' && loadedAttempt?.questionIds) {
          setInProgressAttempt(loadedAttempt);
          questionIdsForSession = loadedAttempt.questionIds;
      } else {
        setInProgressAttempt(null);
        
        const completedAttemptsQuery = query(attemptsRef, where('testId', '==', test.id), where('status', '==', 'completed'));
        const completedAttemptsSnapshot = await getDocs(completedAttemptsQuery);
        
        const correctlyAnsweredIds = new Set<string>();
        for (const attemptDoc of completedAttemptsSnapshot.docs) {
          const attemptData = attemptDoc.data();
          const qSnapshot = await getDocs(query(collection(firestore, 'questions'), where(documentId(), 'in', attemptData.questionIds)))
          qSnapshot.forEach((qDoc, index) => {
            const qData = qDoc.data() as Question;
            if(qData.answerOptions[attemptData.answers[index]] === qData.correctAnswer) {
              correctlyAnsweredIds.add(qDoc.id);
            }
          })
        }
        setAnsweredQuestionsCount(correctlyAnsweredIds.size);
        
        let availableQuestionIds = test.questionIds.filter(id => !correctlyAnsweredIds.has(id));

        if (availableQuestionIds.length === 0 && test.questionIds.length > 0) {
            availableQuestionIds = test.questionIds;
        }
        
        const shuffledIds = shuffleArray(availableQuestionIds);

        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : null;
        if (limit && !isNaN(limit) && limit > 0) {
          questionIdsForSession = shuffledIds.slice(0, limit);
        } else {
          questionIdsForSession = shuffledIds;
        }
      }

      if (questionIdsForSession.length > 0) {
        const questionIdChunks: string[][] = [];
        for (let i = 0; i < questionIdsForSession.length; i += 30) {
          questionIdChunks.push(questionIdsForSession.slice(i, i + 30));
        }

        const fetchedQuestions: Question[] = [];
        for (const chunk of questionIdChunks) {
          if (chunk.length > 0) {
            const questionsQuery = query(collection(firestore, 'questions'), where(documentId(), 'in', chunk));
            const questionsSnap = await getDocs(questionsQuery);
            questionsSnap.forEach(doc => {
              fetchedQuestions.push({ id: doc.id, ...doc.data() } as Question);
            });
          }
        }
        // Ensure the order of questions matches the session IDs
        const questionMap = new Map(fetchedQuestions.map(q => [q.id, q]));
        questionsForSession = questionIdsForSession.map(id => questionMap.get(id)).filter(Boolean) as Question[];

        // Shuffle answer options only for new sessions
        if (userChoice === 'new') {
            questionsForSession = questionsForSession.map(q => ({
                ...q,
                answerOptions: shuffleArray([...q.answerOptions])
            }));
        }
      }

      setSessionQuestions(questionsForSession);
      setIsLoading(false);
    };

    fetchTestAndQuestions();
  }, [firestore, slug, user, searchParams]);
  
  const handleResumeChoice = (choice: 'resume' | 'new') => {
    if (resolveResume) {
        resolveResume(choice);
    }
  };


  if (isLoading || !testData) {
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
  
  const finalTestProps = { ...testData, questions: sessionQuestions };

  return <McqTest test={finalTestProps} totalQuestions={totalQuestionsInTopic} answeredQuestions={answeredQuestionsCount} inProgressAttempt={inProgressAttempt} />;
}
