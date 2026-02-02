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
  deleteField,
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
import { Trash } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  bookType: z.enum(['samacheer', 'old'], { required_error: "Please select a book type." }),
  classId: z.string().min(1, { message: "Please select a class." }),
  subjectName: z.string().min(1, { message: "Subject name must be at least 1 character." }),
  term: z.string().min(1, { message: "Please select a term." }),
  addUnitForFullBook: z.enum(['yes', 'no']).optional(),
  unitNumber: z.coerce.number().optional(),
  unitName: z.string().optional(),
  categoryName: z.string().optional(),
  referencePageOffset: z.coerce.number().int().optional(),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
}).superRefine((data, ctx) => {
    const needsUnit = data.term !== 'Full Book' || (data.term === 'Full Book' && data.addUnitForFullBook === 'yes');

    if (needsUnit) {
        if (data.unitNumber === undefined || data.unitNumber < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['unitNumber'],
                message: "Unit number must be at least 1.",
            });
        }
        if (!data.unitName || data.unitName.trim().length < 1) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['unitName'],
                message: 'Unit name must be at least 1 character.',
            });
        }
    }
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

    const groupedUnits = useMemo(() => {
        if (!units || !classes || !subjects || !categories) return {};

        const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));
        const categoryMap = new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));

        const mappedUnits = units.map(unit => ({
            ...unit,
            bookType: unit.bookType || 'samacheer',
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || unit.subjectId,
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }));
        
        const groupedByBookType: Record<string, Record<string, typeof mappedUnits[0][]>> = {
            samacheer: {},
            old: {}
        };
        
        mappedUnits.forEach(unit => {
            const bookTypeKey = unit.bookType as 'samacheer' | 'old';
            if (!groupedByBookType[bookTypeKey]) groupedByBookType[bookTypeKey] = {};

            const classKey = unit.className;
            if (!groupedByBookType[bookTypeKey][classKey]) {
                groupedByBookType[bookTypeKey][classKey] = [];
            }
            groupedByBookType[bookTypeKey][classKey].push(unit);
        });

        const getNumber = (name: string) => {
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        for (const bookType in groupedByBookType) {
            const classesInBookType = groupedByBookType[bookType as 'samacheer' | 'old'];
            const sortedClassNames = Object.keys(classesInBookType).sort((a, b) => getNumber(a) - getNumber(b));
            
            const finalGroupedForBook: Record<string, typeof mappedUnits[0][]> = {};
            for (const className of sortedClassNames) {
                finalGroupedForBook[className] = classesInBookType[className].sort((a, b) => {
                    if ((a.subjectName || '').localeCompare(b.subjectName || '') !== 0) {
                        return (a.subjectName || '').localeCompare(b.subjectName || '');
                    }
                    if ((a.term || '').localeCompare(b.term || '') !== 0) {
                        return (a.term || '').localeCompare(b.term || '');
                    }
                     if ((a.unitNumber || 0) - (b.unitNumber || 0) !== 0) {
                       return (a.unitNumber || 0) - (b.unitNumber || 0);
                     }
                    return (a.categoryName || '').localeCompare(b.categoryName || '');
                });
            }
            groupedByBookType[bookType as 'samacheer' | 'old'] = finalGroupedForBook;
        }
        
        return groupedByBookType;

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

    const renderAccordion = (unitsByClass: Record<string, any[]>, bookType: string) => (
        <Accordion type="multiple" className="w-full max-h-96 overflow-y-auto">
            {Object.entries(unitsByClass).map(([className, classUnits]) => (
                 <AccordionItem value={`${bookType}-${className}`} key={`${bookType}-${className}`}>
                    <AccordionTrigger className="text-lg font-semibold">{className}</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 pt-2">
                            {classUnits.map(unit => (
                                <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                    <button type="button" className="text-left flex-grow" onClick={() => onUnitSelect(unit)}>
                                        <p className="font-semibold text-sm">{unit.subjectName} - {unit.term}</p>
                                        { (unit.unitNumber && unit.unitName) ? 
                                            <p className="font-bold text-base">{t('Unit')} {unit.unitNumber}: {unit.unitName}</p>
                                            :
                                            <p className="font-bold text-base">{unit.categoryName || 'Full Book'}</p>
                                        }
                                        { unit.unitNumber && unit.unitName && unit.categoryName && <p className="text-xs text-muted-foreground">Category: {unit.categoryName}</p>}
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
                                                        {t('This action will permanently delete the unit \'{{unitName}}\'.', { unitName: unit.unitName || unit.id })}
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
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Existing Units')}</CardTitle>
                 <CardDescription>{t('Click a unit to populate the form below.')}</CardDescription>
            </CardHeader>
            <CardContent>
                {Object.keys(groupedUnits).length > 0 ? (
                    <Tabs defaultValue="samacheer" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="samacheer">Samacheer Kalvi</TabsTrigger>
                            <TabsTrigger value="old">Old Books</TabsTrigger>
                        </TabsList>
                        <TabsContent value="samacheer">
                            {groupedUnits.samacheer && Object.keys(groupedUnits.samacheer).length > 0 ?
                                renderAccordion(groupedUnits.samacheer, 'samacheer')
                                : <p className="text-center text-muted-foreground pt-4">{t('No units found for Samacheer Kalvi.')}</p>
                            }
                        </TabsContent>
                        <TabsContent value="old">
                             {groupedUnits.old && Object.keys(groupedUnits.old).length > 0 ?
                                renderAccordion(groupedUnits.old, 'old')
                                : <p className="text-center text-muted-foreground pt-4">{t('No units found for Old Books.')}</p>
                            }
                        </TabsContent>
                    </Tabs>
                ) : (
                    <p className="text-muted-foreground">{t('No units found.')}</p>
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
      bookType: 'samacheer',
      classId: '', subjectName: '', term: '', unitNumber: undefined, unitName: '', categoryName: '', jsonInput: '', referencePageOffset: undefined, addUnitForFullBook: 'yes'
    },
  });

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const sortedClasses = useMemo(() => {
    if (!classes) return [];
    const getNumber = (cls: Class) => {
        const nameToUse = language === 'ta' && cls.name_ta ? cls.name_ta : cls.name;
        const match = nameToUse.match(/\d+/);
        if (match) {
            return parseInt(match[0], 10);
        }
        const idMatch = cls.id.match(/\d+/);
        if (idMatch) {
            return parseInt(idMatch[0], 10);
        }
        return Infinity;
    };
    return [...classes].sort((a, b) => getNumber(a) - getNumber(b));
  }, [classes, language]);
  
  const subjectNameValue = form.watch('subjectName');
  const showTamilCategories = subjectNameValue === 'தமிழ்' || subjectNameValue === 'Tamil';
  
  const termValue = form.watch('term');
  const addUnitForFullBookValue = form.watch('addUnitForFullBook');
  
  const showFullBookUnitQuestion = termValue === 'Full Book';
  const showUnitFields = termValue !== 'Full Book' || (termValue === 'Full Book' && addUnitForFullBookValue === 'yes');
  
  useEffect(() => {
    if (termValue !== 'Full Book') {
        form.setValue('addUnitForFullBook', undefined);
    }
  }, [termValue, form]);

  useEffect(() => {
    if (!showUnitFields) {
        form.setValue('unitNumber', undefined);
        form.setValue('unitName', '');
    }
  }, [showUnitFields, form]);


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
        form.setValue('bookType', unit.bookType || 'samacheer');
        form.setValue('classId', unit.classId);
        form.setValue('subjectName', unit.subjectName || unit.subjectId);
        form.setValue('term', unit.term);
        form.setValue('unitNumber', unit.unitNumber);
        form.setValue('unitName', unit.unitName);
        form.setValue('categoryName', unit.categoryName || '');
        form.setValue('referencePageOffset', undefined);
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

      const { bookType, classId, subjectName, term, unitNumber, unitName, categoryName, referencePageOffset, addUnitForFullBook } = values;
      const shouldAddUnitDetails = term !== 'Full Book' || (term === 'Full Book' && addUnitForFullBook === 'yes');

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
      const unitsCollectionRef = collection(firestore, 'units');
      
      const unitQueryConstraints = [
        where('classId', '==', classId),
        where('subjectId', '==', subjectId),
        where('term', '==', term),
        where('bookType', '==', bookType)
      ];

      if (shouldAddUnitDetails) {
        unitQueryConstraints.push(where('unitNumber', '==', unitNumber));
        unitQueryConstraints.push(where('unitName', '==', unitName));
      }
      
      const unitQuery = query(unitsCollectionRef, ...unitQueryConstraints);
      const unitSnapshot = await getDocs(unitQuery);
      let unitDoc = unitSnapshot.docs.find(doc => shouldAddUnitDetails ? true : !doc.data().unitNumber);


      if (!unitDoc) {
          const newUnitRef = doc(collection(firestore, 'units'));
          const unitData: Partial<Unit> = { id: newUnitRef.id, classId, subjectId, term, categoryId, bookType };
          if(shouldAddUnitDetails) {
              unitData.unitNumber = unitNumber;
              unitData.unitName = unitName;
          }
          await setDoc(newUnitRef, unitData);
          unitId = newUnitRef.id;
      } else {
          unitId = unitDoc.id;
          const updatePayload: { [key: string]: any } = {};
          if (categoryId && unitDoc.data().categoryId !== categoryId) {
              updatePayload.categoryId = categoryId;
          } else if (!categoryId && unitDoc.data().categoryId) {
              updatePayload.categoryId = deleteField();
          }
          if (bookType && unitDoc.data().bookType !== bookType) {
              updatePayload.bookType = bookType;
          }
          if (Object.keys(updatePayload).length > 0) {
              await updateDoc(doc(firestore, 'units', unitId), updatePayload);
          }
      }


      // 4. Add Questions
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
              classId,
              subjectId,
              unitId: q.unitId || unitId,
              explanation: q.explanation || '',
              reference: q.reference || '',
          };

          if (q.referenceUrl) {
            questionData.referenceUrl = q.referenceUrl;
          }
          if (q.referencePage !== null && q.referencePage !== undefined) {
            questionData.referencePage = q.referencePage;
          }

          batch.set(questionRef, questionData);
          newQuestionIds.push(q.id);
      });
      await batch.commit();
      
      // 5. Find or create test and update it
      const testsCollectionRef = collection(firestore, 'tests');
      const selectedClass = classes?.find(c => c.id === classId);
      const className = language === 'ta' && selectedClass?.name_ta ? selectedClass.name_ta : selectedClass?.name;
      
      let testTitle = shouldAddUnitDetails 
        ? `${className || 'Class'} - ${subjectName} - ${term} - இயல் ${unitNumber} - ${unitName}`
        : `${className || 'Class'} - ${subjectName} - ${term}`;
      
      if (categoryName) {
        testTitle += ` - ${categoryName}`;
      }
      
      const testQuery = query(testsCollectionRef, where('title', '==', testTitle), where('bookType', '==', bookType));
      
      await runTransaction(firestore, async (transaction) => {
          const testSnapshot = await getDocs(testQuery);
          if (testSnapshot.empty) {
              const newTestRef = doc(testsCollectionRef);
              const newTest: Partial<Test> = {
                  id: newTestRef.id,
                  title: testTitle,
                  description: t('test_for_class_subject', {classId: className || classId, subjectId: subjectName}),
                  questionIds: newQuestionIds,
                  classId: classId,
                  subjectId: subjectId,
                  categoryId: categoryId,
                  term: term,
                  unitId: unitId,
                  bookType: bookType,
              };
              if (shouldAddUnitDetails) {
                newTest.unitNumber = unitNumber;
                newTest.unitName = unitName;
              }
              if (referencePageOffset !== undefined) {
                newTest.referencePageOffset = referencePageOffset;
              }

              transaction.set(newTestRef, newTest);
          } else {
              const testDoc = testSnapshot.docs[0];
              const existingQuestionIds = testDoc.data().questionIds || [];
              const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
              const updateData: any = { questionIds: updatedQuestionIds, bookType: bookType };
              if (categoryId) {
                updateData.categoryId = categoryId;
              }
              if (referencePageOffset !== undefined) {
                updateData.referencePageOffset = referencePageOffset;
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
                      name="bookType"
                      render={({ field }) => (
                          <FormItem className="space-y-3">
                              <FormLabel>Book Type</FormLabel>
                              <FormControl>
                                  <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      className="flex gap-4"
                                  >
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl><RadioGroupItem value="samacheer" /></FormControl>
                                          <FormLabel className="font-normal">Samacheer Kalvi</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl><RadioGroupItem value="old" /></FormControl>
                                          <FormLabel className="font-normal">Old Book</FormLabel>
                                      </FormItem>
                                  </RadioGroup>
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
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
                                {sortedClasses?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
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

                    {showFullBookUnitQuestion && (
                      <FormField
                          control={form.control}
                          name="addUnitForFullBook"
                          render={({ field }) => (
                              <FormItem className="space-y-3">
                                  <FormLabel>Add unit for full book?</FormLabel>
                                  <FormControl>
                                      <RadioGroup
                                          onValueChange={field.onChange}
                                          value={field.value}
                                          className="flex gap-4"
                                      >
                                          <FormItem className="flex items-center space-x-2 space-y-0">
                                              <FormControl><RadioGroupItem value="yes" /></FormControl>
                                              <FormLabel className="font-normal">Yes</FormLabel>
                                          </FormItem>
                                          <FormItem className="flex items-center space-x-2 space-y-0">
                                              <FormControl><RadioGroupItem value="no" /></FormControl>
                                              <FormLabel className="font-normal">No</FormLabel>
                                          </FormItem>
                                      </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                    )}

                    {showUnitFields && (
                      <>
                        <FormField
                            control={form.control}
                            name="unitNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('Unit')}</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a unit" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
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
                      </>
                    )}

                    <FormField
                        control={form.control}
                        name="referencePageOffset"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>PDF Page Offset</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        placeholder="e.g., 14" 
                                        {...field} 
                                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        value={field.value ?? ''}
                                    />
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
    </div>
  );
}
