'use client';
import { McqTest } from '@/components/mcq-test';
import { notFound, useParams } from 'next/navigation';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Test, Question } from '@/lib/types';

export default function TestPage() {
  const { slug } = useParams();
  const firestore = useFirestore();
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !slug) return;

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

      const questions: Question[] = [];
      if (testData.questionIds) {
        for (const questionId of testData.questionIds) {
          const questionRef = doc(firestore, 'questions', questionId);
          const questionSnap = await getDoc(questionRef);
          if (questionSnap.exists()) {
            questions.push({ id: questionSnap.id, ...questionSnap.data() } as Question);
          }
        }
      }
      testData.questions = questions;

      setTest(testData);
      setIsLoading(false);
    };

    fetchTest();
  }, [firestore, slug]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!test) {
    return notFound();
  }

  return <McqTest test={test} />;
}
