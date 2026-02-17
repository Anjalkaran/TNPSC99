'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  writeBatch,
  collection,
  doc,
  deleteDoc,
  query,
  where,
  getDocs,
  setDoc,
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
import { Edit, Trash, View, Download, Archive } from 'lucide-react';
import Link from 'next/link';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';

const jsonStructureExample = `[
  {
    "id": "your-unique-question-id",
    "text": "Your question text here?",
    "answerOptions": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Detailed explanation for the correct answer (optional)",
    "reference": "TNPSC Group IV 2022 (optional)"
  }
]`;

const paperUploadFormSchema = z.object({
  examGroup: z.enum(['Group I', 'Group II', 'Group IV'], { required_error: "Please select an exam group." }),
  year: z.coerce.number().min(1990, { message: "Year must be 1990 or later." }).max(new Date().getFullYear(), { message: "Year cannot be in the future." }),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
});

type UploadFormValues = z.infer<typeof paperUploadFormSchema>;


function ExistingPapersList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const testsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tests'), where('isPreviousYearPaper', '==', true)) : null, [firestore]);
    const { data: papers, isLoading } = useCollection<Test>(testsQuery);

    const filteredPapers = useMemo(() => {
        if (!papers) return [];
        const sorted = [...papers].sort((a, b) => (b.year || 0) - (a.year || 0));
        if (!searchTerm) return sorted;

        const lowerCaseSearch = searchTerm.toLowerCase();

        return sorted.filter(paper => {
            return (paper.examGroup?.toLowerCase().includes(lowerCaseSearch) ||
                   String(paper.year || '').includes(lowerCaseSearch) ||
                   paper.title.toLowerCase().includes(lowerCaseSearch));
        });
    }, [papers, searchTerm]);

    const handleDelete = async (testId: string) => {
        if (!firestore) return;
        const testDocRef = doc(firestore, 'tests', testId);
        try {
            await deleteDoc(testDocRef);
            toast({
                title: 'Paper Deleted',
                description: 'The previous year paper has been successfully deleted.',
            });
        } catch (error) {
            console.error("Error deleting paper: ", error);
            toast({
                variant: 'destructive',
                title: 'Error Deleting Paper',
                description: 'There was a problem deleting the paper.',
            });
        }
    };

    if (isLoading) return <p>{t('Loading tests...')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Previous Year Papers</CardTitle>
                 <CardDescription>View, edit, or delete existing papers.</CardDescription>
                 <div className="pt-2">
                    <Input
                        placeholder="Search by group or year..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {(!filteredPapers || filteredPapers.length === 0) ? (
                    <p className="text-muted-foreground text-center p-8">
                        {searchTerm ? `No results for "${searchTerm}"` : "No previous year papers uploaded yet."}
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paper Title</TableHead>
                                <TableHead># of Qs</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredPapers.map(paper => (
                            <TableRow key={paper.id}>
                                <TableCell className="font-medium">
                                    {paper.title}
                                </TableCell>
                                <TableCell>{paper.questionIds.length}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button asChild variant="outline" size="icon">
                                        <Link href={`/admin/upload/${encodeURIComponent(paper.id)}/edit`}>
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
                                                    {'This will permanently delete the paper, but not the questions themselves.'}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(paper.id)}>{t('delete')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function PreviousYearPaperUploadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(paperUploadFormSchema),
    defaultValues: {
      jsonInput: '',
    },
  });

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

      const { examGroup, year } = values;

      // 1. Add Questions
      const batch = writeBatch(firestore);
      const questionsCollectionRef = collection(firestore, 'questions');
      const newQuestionIds: string[] = [];
      questions.forEach(q => {
          const questionRef = doc(questionsCollectionRef, q.id);
          const questionData: Partial<Question> = {
              id: q.id,
              text: q.text,
              answerOptions: q.answerOptions,
              correctAnswerIndex: q.correctAnswerIndex,
              explanation: q.explanation || '',
              reference: q.reference || `${year} ${examGroup}`,
          };
          batch.set(questionRef, questionData);
          newQuestionIds.push(q.id);
      });
      
      // 2. Create Test document
      const testTitle = `${year} - ${examGroup} Previous Year Paper`;
      const newTestRef = doc(collection(firestore, 'tests'));
      const newTest: Partial<Test> = {
          id: newTestRef.id,
          title: testTitle,
          description: `Previous Year Question Paper for ${examGroup} from ${year}.`,
          questionIds: newQuestionIds,
          examGroup: examGroup,
          year: year,
          isPreviousYearPaper: true,
      };
      batch.set(newTestRef, newTest);
      
      await batch.commit();
      
      toast({
        title: t('upload_successful_title'),
        description: `Successfully uploaded ${questions.length} questions for ${testTitle}.`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Error uploading paper:', error);
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
            <h1 className="text-3xl font-bold">Previous Year Papers</h1>
            <p className="text-muted-foreground">Upload and manage question banks for past exams.</p>
        </div>
       <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>Upload New Paper</CardTitle>
            <CardDescription>
                Bulk add questions for a specific previous year paper.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        name="year"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="e.g., 2023" {...field} value={field.value ?? ''} />
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
                        {isSubmitting ? t('submitting') : 'Submit Paper'}
                        </Button>
                    </div>
                </form>
            </Form>
            </CardContent>
        </Card>

        <div className="space-y-8">
            <ExistingPapersList />
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
