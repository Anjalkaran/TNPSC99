'use client';
import { notFound, useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Test, Question } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ViewTestJsonPage() {
  const { slug } = useParams();
  const firestore = useFirestore();
  const { t } = useTranslation();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Omit<Question, 'id' | 'classId' | 'subjectId'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !slug) return;

    const fetchTestAndQuestions = async () => {
      setIsLoading(true);
      try {
        const decodedSlug = decodeURIComponent(Array.isArray(slug) ? slug[0] : slug);
        const testsRef = collection(firestore, 'tests');
        const q = query(testsRef, where('title', '==', decodedSlug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          notFound();
          return;
        }

        const testDoc = querySnapshot.docs[0];
        const testData = { id: testDoc.id, ...testDoc.data() } as Test;
        setTest(testData);

        const fetchedQuestions: Omit<Question, 'id' | 'classId' | 'subjectId'>[] = [];
        if (testData.questionIds && testData.questionIds.length > 0) {
          const questionIdsChunks = [];
          for (let i = 0; i < testData.questionIds.length; i += 30) {
            questionIdsChunks.push(testData.questionIds.slice(i, i + 30));
          }

          for (const chunk of questionIdsChunks) {
             if (chunk.length > 0) {
                const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                const questionsSnap = await getDocs(questionsQuery);
                questionsSnap.forEach(docSnap => {
                    const { id, classId, subjectId, ...questionData } = docSnap.data() as Question;
                    fetchedQuestions.push(questionData);
                });
             }
          }
        }
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching test data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestAndQuestions();
  }, [slug, firestore]);

  if (isLoading) {
    return <div className="container mx-auto p-8">{t('Loading tests...')}</div>;
  }

  if (!test) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('JSON View')}: {test.title}</CardTitle>
          <CardDescription>
            {t('Showing the questions for this test in JSON format.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-md text-sm overflow-auto">
            <code>{JSON.stringify(questions, null, 2)}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
