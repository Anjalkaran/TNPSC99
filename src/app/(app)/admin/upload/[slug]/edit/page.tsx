'use client';
import { notFound, useParams } from 'next/navigation';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { Test, Question } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash, Edit } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const testEditSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  syllabusCategory: z.string().optional(),
});
type TestEditFormValues = z.infer<typeof testEditSchema>;

export default function EditTestPage() {
  const { slug: testId } = useParams();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [test, setTest] = useState<Test | null>(null);
  const [testRef, setTestRef] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<TestEditFormValues>({
    resolver: zodResolver(testEditSchema),
    defaultValues: {
      title: '',
      syllabusCategory: '',
    },
  });


  useEffect(() => {
    if (!firestore || !testId) return;

    const fetchTestAndQuestions = async () => {
      setIsLoading(true);
      try {
        const decodedId = Array.isArray(testId) ? testId[0] : decodeURIComponent(testId);
        const testDocRef = doc(firestore, 'tests', decodedId);
        const testDocSnap = await getDoc(testDocRef);


        if (!testDocSnap.exists()) {
          notFound();
          return;
        }

        const testData = { id: testDocSnap.id, ...testDocSnap.data() } as Test;
        setTest(testData);
        setTestRef(testDocSnap.ref);
        form.reset({
            title: testData.title,
            syllabusCategory: testData.syllabusCategory || ''
        });


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
          title: t('error_title'),
          description: "Failed to load test data."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestAndQuestions();
  }, [testId, toast, firestore, t, form]);

  const onTestDetailsUpdate = async (values: TestEditFormValues) => {
    if (!testRef || !test) return;
    
    const updatePayload: { title: string; syllabusCategory?: string } = {
        title: values.title
    };

    // Only include syllabusCategory if it's a syllabus-based test
    if (test.syllabusTopic) {
        updatePayload.syllabusCategory = values.syllabusCategory;
    }

    try {
      await updateDoc(testRef, updatePayload);
      toast({
        title: "Test Updated",
        description: "The test details have been successfully updated.",
      });
      // Update local state to reflect change immediately in the UI
      setTest(prev => prev ? { ...prev, ...updatePayload } : null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the test details.",
      });
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    if (!searchTerm) return questions;
    return questions.filter(q =>
      q.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [questions, searchTerm]);

  const handleRemoveQuestion = async (questionId: string) => {
      if(!test || !testRef || !firestore) return;

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
              title: t('question_removed_title'),
              description: t('question_removed_desc')
          });

      } catch (error) {
          console.error("Error removing question:", error);
          toast({
              variant: "destructive",
              title: t('error_title'),
              description: t('remove_question_error_desc')
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
            {t('manage_test_questions_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Accordion type="single" collapsible className="w-full mb-6">
            <AccordionItem value="item-1">
              <AccordionTrigger>Edit Test Details</AccordionTrigger>
              <AccordionContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onTestDetailsUpdate)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Test Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {test.syllabusTopic && (
                      <FormField
                        control={form.control}
                        name="syllabusCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Syllabus Category</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., kootru kaarani" {...field} />
                            </FormControl>
                             <FormDescription>
                                This is the category shown in the syllabus test lists.
                             </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? 'Saving...' : 'Save Details'}
                    </Button>
                  </form>
                </Form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="mb-4">
            <Input
              placeholder="Search questions by text..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {filteredQuestions.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Question ID</TableHead>
                        <TableHead>{t('question_text')}</TableHead>
                        <TableHead>{t('unit_id')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredQuestions.map(q => (
                        <TableRow key={q.id}>
                            <TableCell className="font-mono text-xs break-all">{q.id}</TableCell>
                            <TableCell className="max-w-prose">{q.text}</TableCell>
                            <TableCell>{q.unitId}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                    <Button asChild variant="outline" size="icon">
                                    <Link href={`/admin/questions/${q.id}/edit`}>
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                    </Button>
                                <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('confirm_remove_title')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t('remove_question_from_test_desc')}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleRemoveQuestion(q.id)}>{t('remove')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          ) : (
            <p className="text-center p-4 text-muted-foreground">
              {searchTerm ? 'No questions found matching your search.' : t('test_has_no_questions')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
