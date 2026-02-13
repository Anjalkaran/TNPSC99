'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  writeBatch,
  collection,
  doc,
  runTransaction,
  deleteDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Test, Question } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash, View, Download } from 'lucide-react';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';


const jsonStructureExample = `[
  {
    "id": "your-unique-question-id",
    "text": "Your question text here?",
    "answerOptions": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Detailed explanation for the correct answer (optional)",
    "reference": "Official Syllabus Section 1.2 (optional)"
  }
]`;

const syllabusUploadFormSchema = z.object({
  examGroup: z.enum(['Group I', 'Group II', 'Group IV'], { required_error: "Please select an exam group." }),
  medium: z.enum(['tamil', 'english'], { required_error: "Please select a medium." }),
  syllabusSubject: z.string().min(1, { message: "Syllabus subject is required." }),
  syllabusTopic: z.string().min(1, { message: "Syllabus topic is required." }),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
});

type UploadFormValues = z.infer<typeof syllabusUploadFormSchema>;


function ExistingSyllabusTestsList() {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const testsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tests'), where('examGroup', '!=', null)) : null, [firestore]);
    const { data: tests, isLoading } = useCollection<Test>(testsQuery);

    const filteredTests = useMemo(() => {
        if (!tests) return [];
        if (!searchTerm) return tests;

        const lowerCaseSearch = searchTerm.toLowerCase();

        return tests.filter(test => {
            return (test.examGroup?.toLowerCase().includes(lowerCaseSearch) ||
                   test.syllabusSubject?.toLowerCase().includes(lowerCaseSearch) ||
                   test.syllabusTopic?.toLowerCase().includes(lowerCaseSearch) ||
                   test.title.toLowerCase().includes(lowerCaseSearch));
        });
    }, [tests, searchTerm]);

    const groupedByExamGroup = useMemo(() => {
        if (!filteredTests) return {};

        return filteredTests.reduce((acc, test) => {
            const groupKey = test.examGroup || 'Uncategorized';
            if (!acc[groupKey]) {
                acc[groupKey] = [];
            }
            acc[groupKey].push(test);
            return acc;
        }, {} as Record<string, Test[]>);

    }, [filteredTests]);


    const handleDownload = async (test: Test) => {
        if (!firestore) return;
        
        try {
            const fetchedQuestions: Question[] = [];
            if (test.questionIds && test.questionIds.length > 0) {
              const questionIdsChunks = [];
              for (let i = 0; i < test.questionIds.length; i += 30) {
                questionIdsChunks.push(test.questionIds.slice(i, i + 30));
              }

              for (const chunk of questionIdsChunks) {
                 const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                 const questionsSnap = await getDocs(questionsQuery);
                 questionsSnap.forEach(docSnap => {
                    const { classId, subjectId, ...questionData } = docSnap.data() as any;
                    fetchedQuestions.push({ id: docSnap.id, ...questionData } as Question);
                 });
              }
            }

            const jsonString = JSON.stringify(fetchedQuestions, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${test.title}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({
                title: "Download Started",
                description: `Downloading ${test.title} questions.`,
            });

        } catch (error) {
            console.error("Error downloading test data:", error);
            toast({
                variant: 'destructive',
                title: "Download Failed",
                description: "There was a problem downloading the question bank.",
            });
        }
    };
    
    const handleDownloadAll = async () => {
        if (!firestore || !filteredTests || filteredTests.length === 0) return;

        toast({
            title: "Preparing Download",
            description: `Bundling ${filteredTests.length} syllabus banks. This may take a moment.`,
        });

        try {
            const allTestsData = [];

            for (const test of filteredTests) {
                const fetchedQuestions: Question[] = [];
                if (test.questionIds && test.questionIds.length > 0) {
                    const questionIdsChunks = [];
                    for (let i = 0; i < test.questionIds.length; i += 30) {
                        questionIdsChunks.push(test.questionIds.slice(i, i + 30));
                    }

                    for (const chunk of questionIdsChunks) {
                        if (chunk.length > 0) {
                            const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                            const questionsSnap = await getDocs(questionsQuery);
                            questionsSnap.forEach(docSnap => {
                                const { classId, subjectId, ...questionData } = docSnap.data() as any;
                                fetchedQuestions.push({ id: docSnap.id, ...questionData } as Question);
                            });
                        }
                    }
                }
                allTestsData.push({
                    testDetails: {
                        id: test.id,
                        title: test.title,
                        description: test.description
                    },
                    questions: fetchedQuestions
                });
            }

            const jsonString = JSON.stringify(allTestsData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `all_syllabus_mcq_banks.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({
                title: "Download Started",
                description: `Downloading all syllabus banks as a single JSON file.`,
            });

        } catch (error) {
            console.error("Error downloading all test data:", error);
            toast({
                variant: 'destructive',
                title: "Download Failed",
                description: "There was a problem bundling the question banks.",
            });
        }
    };


    const handleDelete = async (testId: string) => {
        if (!firestore) return;
        const testDocRef = doc(firestore, 'tests', testId);
        try {
            await deleteDoc(testDocRef);
            toast({
                title: t('Test Deleted'),
                description: t('The test has been successfully deleted.'),
            });
        } catch (error) {
            console.error("Error deleting test: ", error);
            toast({
                variant: 'destructive',
                title: t('Error Deleting Test'),
                description: t('There was a problem deleting the test.'),
            });
        }
    };

    if (isLoading) return <p>{t('Loading tests...')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Syllabus Banks</CardTitle>
                 <CardDescription>View, edit, or delete your existing syllabus-based question banks.</CardDescription>
                 <div className="flex items-center gap-2 pt-2">
                    <Input
                        placeholder="Search by group, subject, topic..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="flex-grow"
                    />
                    <Button onClick={handleDownloadAll} disabled={isLoading || !filteredTests || filteredTests.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download All
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {(!filteredTests || filteredTests.length === 0) ? (
                    <p className="text-muted-foreground text-center p-8">
                        {searchTerm ? `No results for "${searchTerm}"` : "No syllabus question banks created yet."}
                    </p>
                ) : (
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedByExamGroup).map(([examGroup, testsInGroup]) => (
                            <AccordionItem value={examGroup} key={examGroup}>
                                <AccordionTrigger className="text-lg font-semibold">{examGroup}</AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Test Title</TableHead>
                                                <TableHead>No. of Questions</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {testsInGroup.map(test => (
                                            <TableRow key={test.id}>
                                                <TableCell className="font-medium">
                                                    <div>
                                                        <span>{test.syllabusSubject}</span>
                                                        <p className="text-sm text-muted-foreground">{test.syllabusTopic}</p>
                                                    </div>
                                                    <Badge variant="outline" className="mt-1">{test.medium || 'tamil'}</Badge>
                                                </TableCell>
                                                <TableCell>{test.questionIds.length}</TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="outline" size="icon" onClick={() => handleDownload(test)}>
                                                        <Download className="h-4 w-4" />
                                                        <span className="sr-only">Download</span>
                                                    </Button>
                                                     <Button asChild variant="outline" size="icon">
                                                        <Link href={`/admin/upload/${encodeURIComponent(test.id)}/view`}>
                                                            <View className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="outline" size="icon">
                                                        <Link href={`/admin/upload/${encodeURIComponent(test.id)}/edit`}>
                                                            <Edit className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon">
                                                                <Trash className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>{t('confirm_deletion_title')}</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {t('This will permanently delete the test, but not the questions themselves.')}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(test.id)}>{t('delete')}</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

export default function SyllabusUploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(syllabusUploadFormSchema),
    defaultValues: {
      examGroup: undefined,
      medium: 'tamil',
      syllabusSubject: '',
      syllabusTopic: '',
      jsonInput: '',
    },
  });

  const subjectNameValue = form.watch('syllabusSubject');
  const isTamilSubject = subjectNameValue.toLowerCase() === 'tamil' || subjectNameValue === 'தமிழ்';

  useEffect(() => {
    if (isTamilSubject) {
        form.setValue('medium', 'tamil');
    }
  }, [isTamilSubject, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        form.setValue('jsonInput', content);
      };
      reader.readAsText(file);
    }
  };

  const onSubmit: SubmitHandler<UploadFormValues> = async (values) => {
    setIsSubmitting(true);
    let questions: any[];
    try {
      questions = JSON.parse(values.jsonInput);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('JSON must be a non-empty array of questions.');
      }
       for(const q of questions) {
        if (!q.id || !q.text || !q.answerOptions || q.correctAnswerIndex === undefined) {
            throw new Error('Each question object must have id, text, answerOptions, and correctAnswerIndex.');
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('invalid_json_format_title'),
        description: error.message || 'The provided JSON is not valid.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (!firestore) throw new Error('Firestore is not initialized');

      const { examGroup, medium, syllabusSubject, syllabusTopic } = values;

      // 1. Add Questions
      const batch = writeBatch(firestore);
      const questionsCollectionRef = collection(firestore, 'questions');
      const newQuestionIds: string[] = [];
      questions.forEach(q => {
          const questionRef = doc(questionsCollectionRef, q.id);
          const questionData: { [key: string]: any } = {
              id: q.id,
              text: q.text,
              answerOptions: q.answerOptions,
              correctAnswerIndex: q.correctAnswerIndex,
              explanation: q.explanation || '',
              reference: q.reference || '',
          };
          batch.set(questionRef, questionData);
          newQuestionIds.push(q.id);
      });
      await batch.commit();
      
      // 2. Find or create test and update it
      const testsCollectionRef = collection(firestore, 'tests');
      
      const testTitle = `${examGroup} - ${syllabusSubject} - ${syllabusTopic}`;
      
      const testQuery = query(testsCollectionRef, where('title', '==', testTitle), where('medium', '==', medium));
      
      await runTransaction(firestore, async (transaction) => {
          const testSnapshot = await getDocs(testQuery);
          if (testSnapshot.empty) {
              const newTestRef = doc(testsCollectionRef);
              const newTest: Partial<Test> = {
                  id: newTestRef.id,
                  title: testTitle,
                  description: `Syllabus-based test for ${examGroup}`,
                  questionIds: newQuestionIds,
                  examGroup: examGroup,
                  medium: medium,
                  syllabusSubject: syllabusSubject,
                  syllabusTopic: syllabusTopic,
              };
              transaction.set(newTestRef, newTest);
          } else {
              const testDoc = testSnapshot.docs[0];
              const existingQuestionIds = testDoc.data().questionIds || [];
              const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
              const updateData: any = { questionIds: updatedQuestionIds, medium: medium };
              transaction.update(testDoc.ref, updateData);
          }
      });
      
      toast({
        title: t('upload_successful_title'),
        description: t('upload_successful_desc', { count: questions.length }),
      });
      form.reset();
    } catch (error: any) {
      console.error('Error uploading questions:', error);
      toast({
        variant: 'destructive',
        title: t('upload_error_title'),
        description: error.message || t('upload_error_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold">Syllabus Question Banks</h1>
            <p className="text-muted-foreground">Create and manage tests based on the official TNPSC exam syllabus for different groups.</p>
        </div>
       <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>Upload Question Bank</CardTitle>
            <CardDescription>
                Bulk add new questions for a specific syllabus topic.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="examGroup"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Exam Group</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select an Exam Group" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Group I">Group I</SelectItem>
                                <SelectItem value="Group II">Group II</SelectItem>
                                <SelectItem value="Group IV">Group IV</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="medium"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Medium</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isTamilSubject}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a Medium" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="tamil">தமிழ்</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="syllabusSubject"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Syllabus Subject</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., General Science" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="syllabusTopic"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Syllabus Topic</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., Nature of Universe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="jsonInput"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="json-input">{t('json_data')}</FormLabel>
                            <FormControl>
                            <Textarea
                                id="json-input"
                                placeholder={t('json_data_placeholder')}
                                className="h-48 font-mono text-sm"
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="space-y-2">
                        <Label htmlFor="json-file">{t('or_upload_file')}</Label>
                        <Input
                        id="json-file"
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        />
                    </div>
                    
                    <div>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('submitting') : t('submit_questions')}
                        </Button>
                    </div>
                </div>
                </form>
            </Form>
            </CardContent>
        </Card>

        <div className="space-y-8">
            <ExistingSyllabusTestsList />
            <Card>
                <CardHeader>
                    <CardTitle>How to Upload</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>This page allows you to create question banks based on syllabus topics. The structure is created automatically as you upload questions.</p>
                    <ol className="list-decimal list-inside space-y-1 pt-2">
                        <li>Select the <strong>Exam Group</strong> (e.g., 'Group I').</li>
                        <li>Enter the name of the <strong>Syllabus Subject</strong> (e.g., 'General Science').</li>
                        <li>Enter the name of the specific <strong>Syllabus Topic</strong> (e.g., 'Nature of Universe').</li>
                        <li>Provide the question data in the required JSON format.</li>
                    </ol>
                    <p className="pt-2">The system will then create a test for that topic. If a test for that exact Group/Subject/Topic path already exists, new questions will be added to it.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t('expected_json_structure')}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 bg-muted rounded-md">
                    <pre className="text-xs font-mono overflow-auto max-h-80">
                        <code>{jsonStructureExample}</code>
                    </pre>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}
