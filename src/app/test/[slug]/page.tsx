'use client';
import { McqTest } from '@/components/mcq-test';
import { notFound, useParams } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Test, Question, UserTestAttempt } from '@/lib/types';

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
  const { user } = useUser();
  const firestore = useFirestore();
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestionsInTopic, setTotalQuestionsInTopic] = useState(0);
  const [answeredQuestionsCount, setAnsweredQuestionsCount] = useState(0);


  useEffect(() => {
    if (!firestore || !slug || !user) return;

    const fetchTest = async () => {
      setIsLoading(true);
      const testsRef = collection(firestore, 'tests');
      const q = query(testsRef, where('slug', '==', slug));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        notFound();
        return;
      }

      const testDoc = querySnapshot.docs[0];
      const testData = { id: testDoc.id, ...testDoc.data() } as Test;

      // Fetch all questions for the test
      const allQuestions: Question[] = [];
      if (testData.questionIds) {
        setTotalQuestionsInTopic(testData.questionIds.length);
        // Use 'in' query to fetch multiple documents, respecting the 30-item limit per query
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

      // Fetch user's past attempts for this test
      const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
      const attemptsQuery = query(attemptsRef, where('testId', '==', testData.id));
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      const correctlyAnsweredIds = new Set<string>();
      attemptsSnapshot.forEach(doc => {
          const attempt = doc.data() as UserTestAttempt;
          if (attempt.correctlyAnsweredQuestionIds) {
              attempt.correctlyAnsweredQuestionIds.forEach(id => correctlyAnsweredIds.add(id));
          }
      });
      setAnsweredQuestionsCount(correctlyAnsweredIds.size);
      
      // Filter out questions that have been answered correctly
      let filteredQuestions = allQuestions.filter(q => !correctlyAnsweredIds.has(q.id));

      // If all questions have been answered correctly, reset and show all questions again
      if (filteredQuestions.length === 0 && allQuestions.length > 0) {
          filteredQuestions = allQuestions;
      }
      
      // Shuffle the questions for the current session
      testData.questions = shuffleArray(filteredQuestions);

      setTest(testData);
      setIsLoading(false);
    };

    fetchTest();
  }, [firestore, slug, user]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!test) {
    return notFound();
  }

  return <McqTest test={test} totalQuestions={totalQuestionsInTopic} answeredQuestions={answeredQuestionsCount} />;
}
