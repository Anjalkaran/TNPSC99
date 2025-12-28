'use client';
import { notFound, useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Test, Question } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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


export default function EditTestPage() {
  const { slug } = useParams();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [test, setTest] = useState<Test | null>(null);
  const [testRef, setTestRef] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
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
        setTestRef(testDoc.ref);


        const fetchedQuestions: Question[] = [];
        if (testData.questionIds && testData.questionIds.length > 0) {
          // Firestore 'in' query is limited to 30 elements. 
          // We chunk the array to avoid this limitation.
          const questionIdsChunks = [];
          for (let i = 0; i < testData.questionIds.length; i += 30) {
            questionIdsChunks.push(testData.questionIds.slice(i, i + 30));
          }

          for (const chunk of questionIdsChunks) {
             if (chunk.length > 0) {
                const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                const questionsSnap = await getDocs(questionsQuery);
                questionsSnap.forEach(doc => {
                    fetchedQuestions.push({ id: doc.id, ...doc.data() } as Question);
                });
             }
          }
        }
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching test data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load test data."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestAndQuestions();
  }, [slug, toast, firestore]);

  const handleRemoveQuestion = async (questionId: string) => {
      if(!test || !testRef) return;

      const updatedQuestionIds = test.questionIds.filter(id => id !== questionId);
      
      try {
          const batch = writeBatch(firestore);
          batch.update(testRef, { questionIds: updatedQuestionIds });
          // Optionally, delete the question document itself if it's not used in other tests.
          // For now, we just remove the reference.
          // batch.delete(doc(firestore, 'questions', questionId));
          await batch.commit();

          setTest(prev => prev ? { ...prev, questionIds: updatedQuestionIds } : null);
          setQuestions(prev => prev.filter(q => q.id !== questionId));

          toast({
              title: "Question Removed",
              description: "The question has been removed from this test."
          });

      } catch (error) {
          console.error("Error removing question:", error);
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to remove the question from the test."
          });
      }
  }


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
          <CardTitle>{t('Edit Question Bank')}: {test.title}</CardTitle>
          <CardDescription>
            {t('Manage the questions within this test. You can remove questions from this test bank.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Question Text')}</TableHead>
                        <TableHead>{t('Actions')}</TableHead>
                        <TableHead>{t('Unit ID')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {questions.map(q => (
                        <TableRow key={q.id}>
                            <TableCell className="max-w-prose">{q.text}</TableCell>
                            <TableCell className="text-right">
                               <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('confirm_deletion_title')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('This action will remove the question from the test, but not delete it permanently.')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveQuestion(q.id)}>{t('Remove')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                            <TableCell>{q.unitId}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">{t('This test has no questions yet.')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
