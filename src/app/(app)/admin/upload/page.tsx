'use client';

import { useState, useEffect, useMemo } from 'react';
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
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Question, Test, QuestionInput, Subject, Class, Unit, Category } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
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


const jsonStructureExample = `[
  {
    "id": "your-unique-question-id",
    "text": "Your question text here?",
    "answerOptions": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "unitId": "your-unit-id-here",
    "explanation": "Detailed explanation for the correct answer (optional)",
    "reference": "6th std unit 1 page 5 (optional)",
    "referenceUrl": "https://your-pdf-host.com/book.pdf (optional)",
    "referencePage": 5 (optional)
  }
]`;



const uploadFormSchema = z.object({
  classId: z.string().min(1, { message: "Please select a class." }),
  subjectName: z.string().min(1, { message: "Subject name must be at least 1 character." }),
  term: z.string().min(1, { message: "Please select a term." }),
  unitNumber: z.coerce.number().min(1, "Unit number must be at least 1."),
  unitName: z.string().min(1, { message: 'Unit name must be at least 1 character.' }),
  categoryName: z.string().optional(),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;

interface UnitWithNames extends Unit {
    className?: string;
    subjectName?: string;
    categoryName?: string;
}

function ExistingUnitsList({ onUnitSelect }: { onUnitSelect: (unit: UnitWithNames) => void }) {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: units, isLoading } = useCollection<Unit>(unitsCollection);

    const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes } = useCollection<Class>(classesCollection);
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects } = useCollection<Subject>(subjectsCollection);
    const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesCollection);

    const unitsWithNames = useMemo(() => {
        if (!units || !classes || !subjects || !categories) return [];
        const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));
        const categoryMap = new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));
        
        const mappedUnits = units.map(unit => ({
            ...unit,
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || unit.subjectId,
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }));
        
        return mappedUnits.sort((a, b) => {
            const termA = a.term || '';
            const termB = b.term || '';
            const unitA = a.unitNumber || 0;
            const unitB = b.unitNumber || 0;

            if (termA.localeCompare(termB) !== 0) {
                return termA.localeCompare(termB);
            }
            return unitA - unitB;
        });

    }, [units, classes, subjects, categories, language]);


    const handleDelete = async (unitId: string) => {
        if (!firestore) return;
        const unitDocRef = doc(firestore, 'units', unitId);
        try {
            await deleteDoc(unitDocRef);
            toast({
                title: t('Unit Deleted'),
                description: t('The unit has been successfully deleted.'),
            });
        } catch (error) {
            console.error("Error deleting unit: ", error);
            toast({
                variant: 'destructive',
                title: t('Error Deleting Unit'),
                description: t('There was a problem deleting the unit.'),
            });
        }
    };

    if (isLoading) return <p>{t('Loading units...')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Existing Units')}</CardTitle>
                 <CardDescription>{t('Click a unit to populate the form below.')}</CardDescription>
            </CardHeader>
            <CardContent>
                {unitsWithNames && unitsWithNames.length > 0 ? (
                     <ul className="space-y-2 max-h-96 overflow-y-auto">
                        {unitsWithNames.map(unit => (
                            <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                <button type="button" className="text-left flex-grow" onClick={() => onUnitSelect(unit)}>
                                    <p className="font-semibold text-sm">{unit.className} - {unit.subjectName} - {unit.term}</p>
                                    <p className="font-bold text-base">{t('Unit')} {unit.unitNumber}: {unit.unitName}</p>
                                    {unit.categoryName && <p className="text-xs text-muted-foreground">Category: {unit.categoryName}</p>}
                                </button>
                                <div className="flex gap-2">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash className="h-4 w-4" />
                                                <span className="sr-only">{t('delete')}</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t('confirm_deletion_title')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t('This action will permanently delete the unit \'{{unitName}}\'.', { unitName: unit.unitName })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(unit.id)}>{t('delete')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground">{t('No units found.')}</p>
                )}
            </CardContent>
        </Card>
    );
}


function ExistingTestsList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const testsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'tests') : null, [firestore]);
    const { data: tests, isLoading } = useCollection<Test>(testsCollection);

    const sortedTests = useMemo(() => {
        if (!tests) return [];
        return [...tests].sort((a,b) => {
            const termA = a.term || '';
            const termB = b.term || '';
            const unitA = a.unitNumber || 0;
            const unitB = b.unitNumber || 0;

            if (termA.localeCompare(termB) !== 0) {
                return termA.localeCompare(termB);
            }
            return unitA - unitB;
        });
    }, [tests]);

    const handleDownload = async (test: Test) => {
        if (!firestore) return;
        
        try {
            const fetchedQuestions: Omit<Question, 'id' | 'classId' | 'subjectId'>[] = [];
            if (test.questionIds && test.questionIds.length > 0) {
              const questionIdsChunks = [];
              for (let i = 0; i < test.questionIds.length; i += 30) {
                questionIdsChunks.push(test.questionIds.slice(i, i + 30));
              }

              for (const chunk of questionIdsChunks) {
                 const questionsQuery = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                 const questionsSnap = await getDocs(questionsQuery);
                 questionsSnap.forEach(docSnap => {
                    const { id, classId, subjectId, ...questionData } = docSnap.data() as Question;
                    fetchedQuestions.push(questionData);
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
                <CardTitle>{t('Existing Question Banks')}</CardTitle>
                 <CardDescription>{t('View, edit, or delete your existing question banks.')}</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedTests && sortedTests.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Title</TableHead>
                                <TableHead>No. of Questions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedTests.map(test => (
                            <TableRow key={test.id}>
                                <TableCell className="font-medium">{test.title}</TableCell>
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
                ) : (
                    <p className="text-muted-foreground text-center p-8">{t('No question banks created yet.')}</p>
                )}
            </CardContent>
        </Card>
    );
}

export default function UploadMcqPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t, language } = useTranslation();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      classId: '', subjectName: '', term: '', unitNumber: 1, unitName: '', categoryName: '', jsonInput: ''
    },
  });

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const subjectNameValue = form.watch('subjectName');
  const showTamilCategories = subjectNameValue === 'தமிழ்' || subjectNameValue === 'Tamil';

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

    const handleUnitSelect = (unit: UnitWithNames) => {
        form.setValue('classId', unit.classId);
        form.setValue('subjectName', unit.subjectName || unit.subjectId);
        form.setValue('term', unit.term);
        form.setValue('unitNumber', unit.unitNumber);
        form.setValue('unitName', unit.unitName);
        form.setValue('categoryName', unit.categoryName || '');
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
        if (!q.id || !q.text || !q.answerOptions || q.correctAnswerIndex === undefined || !q.unitId) {
            throw new Error('Each question object must have id, text, answerOptions, correctAnswerIndex and unitId.');
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

      const { classId, subjectName, term, unitNumber, unitName, categoryName } = values;

      // 1. Find or Create Subject
      let subjectId: string;
      const subjectsRef = collection(firestore, 'subjects');
      const subjectQuery = query(subjectsRef, where('name', '==', subjectName));
      const subjectSnapshot = await getDocs(subjectQuery);
      
      if (subjectSnapshot.empty) {
          const newSubjectRef = doc(subjectsRef);
          const newSubject: Subject = { id: newSubjectRef.id, name: subjectName, description: `Subject for TNPSC exams` };
          await setDoc(newSubjectRef, newSubject);
          subjectId = newSubjectRef.id;
      } else {
          subjectId = subjectSnapshot.docs[0].id;
      }
      
      // 2. Find or Create Category
      let categoryId: string | undefined = undefined;
      if (categoryName && subjectId) {
        const categoriesRef = collection(firestore, 'categories');
        const categoryQuery = query(categoriesRef, where('name', '==', categoryName), where('subjectId', '==', subjectId));
        const categorySnapshot = await getDocs(categoryQuery);

        if(categorySnapshot.empty) {
            const newCategoryRef = doc(categoriesRef);
            const newCategory: Category = { id: newCategoryRef.id, name: categoryName, subjectId: subjectId };
            await setDoc(newCategoryRef, newCategory);
            categoryId = newCategoryRef.id;
        } else {
            categoryId = categorySnapshot.docs[0].id;
        }
      }

      // 3. Find or Create Unit
      let unitId: string;
      const unitQuery = query(collection(firestore, 'units'), 
        where('classId', '==', classId),
        where('subjectId', '==', subjectId),
        where('term', '==', term),
        where('unitNumber', '==', unitNumber),
        where('unitName', '==', unitName)
      );
      const unitSnapshot = await getDocs(unitQuery);

      if (unitSnapshot.empty) {
          const newUnitRef = doc(collection(firestore, 'units'));
          const unitData: Unit = { id: newUnitRef.id, classId, subjectId, term, unitNumber, unitName, categoryId };
          await setDoc(newUnitRef, unitData);
          unitId = newUnitRef.id;
      } else {
          unitId = unitSnapshot.docs[0].id;
          if (categoryId) {
             await updateDoc(doc(firestore, 'units', unitId), { categoryId });
          }
      }


      // 4. Add Questions
      const batch = writeBatch(firestore);
      const questionsCollectionRef = collection(firestore, 'questions');
      const newQuestionIds: string[] = [];
      questions.forEach(q => {
          const questionRef = doc(questionsCollectionRef, q.id);
          const questionData: Question = {
              id: q.id,
              text: q.text,
              answerOptions: q.answerOptions,
              correctAnswerIndex: q.correctAnswerIndex,
              classId,
              subjectId,
              unitId: q.unitId || unitId,
              explanation: q.explanation || '',
              reference: q.reference || '',
              referenceUrl: q.referenceUrl,
              referencePage: q.referencePage
          };
          batch.set(questionRef, questionData);
          newQuestionIds.push(q.id);
      });
      await batch.commit();
      
      // 5. Find or create test and update it
      const testsCollectionRef = collection(firestore, 'tests');
      const selectedClass = classes?.find(c => c.id === classId);
      const className = language === 'ta' && selectedClass?.name_ta ? selectedClass.name_ta : selectedClass?.name;
      const testTitle = `${className || 'Class'} - ${subjectName} - ${term} - இயல் ${unitNumber} - ${unitName}`;
      
      const testQuery = query(testsCollectionRef, where('title', '==', testTitle));
      
      await runTransaction(firestore, async (transaction) => {
          const testSnapshot = await getDocs(testQuery);
          if (testSnapshot.empty) {
              const newTestRef = doc(testsCollectionRef);
              const newTest: Test = {
                  id: newTestRef.id,
                  title: testTitle,
                  description: t('test_for_class_subject', {classId: className || classId, subjectId: subjectName}),
                  questionIds: newQuestionIds,
                  classId: classId,
                  subjectId: subjectId,
                  categoryId: categoryId,
                  term: term,
                  unitId: unitId,
                  unitNumber: unitNumber,
                  unitName: unitName,
              };
              transaction.set(newTestRef, newTest);
          } else {
              const testDoc = testSnapshot.docs[0];
              const existingQuestionIds = testDoc.data().questionIds || [];
              const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
              const updateData: any = { questionIds: updatedQuestionIds };
              if (categoryId) {
                updateData.categoryId = categoryId;
              }
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
       <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
            <ExistingUnitsList onUnitSelect={handleUnitSelect} />

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
        
        <Card>
            <CardHeader>
            <CardTitle>{t('upload_class_wise_mcqs')}</CardTitle>
            <CardDescription>
                {t('upload_class_wise_mcqs_desc')}
            </CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="classId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('class_name')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={t('select_a_class')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {classes?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subjectName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('subject_name')}</FormLabel>
                            <FormControl>
                            <Input placeholder={t('subject_name_placeholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., இலக்கணம்" {...form.control.register('categoryName')} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>

                    <FormField
                        control={form.control}
                        name="term"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('Term')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder={t('Select a Term')} />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="பருவம் 1">பருவம் 1</SelectItem>
                                <SelectItem value="பருவம் 2">பருவம் 2</SelectItem>
                                <SelectItem value="பருவம் 3">பருவம் 3</SelectItem>
                                <SelectItem value="Full Book">Full Book</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="unitNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('Unit')}</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a unit" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                                            <SelectItem key={num} value={String(num)}>இயல் {num}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="unitName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('Unit Name')}</FormLabel>
                            <FormControl>
                            <Input placeholder={t('Name of the unit')} {...field} />
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
      </div>
      
      <div className="mt-8">
        <ExistingTestsList />
      </div>
    </div>
  );
}
