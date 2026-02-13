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
import { Edit, Trash, View, Download } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';


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
  medium: z.enum(['tamil', 'english'], { required_error: "Please select a medium." }),
  term: z.string().min(1, { message: "Please select a term." }),
  addUnitForFullBook: z.enum(['yes', 'no']).optional(),
  unitNumber: z.coerce.number().optional(),
  unitName: z.string().optional(),
  categoryName: z.string().optional(),
  referencePageOffset: z.coerce.number().int().optional(),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
}).superRefine((data, ctx) => {
    if ( (data.subjectName === 'தமிழ்' || data.subjectName.toLowerCase() === 'tamil') && (!data.categoryName || data.categoryName.trim().length < 1) ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['categoryName'],
            message: 'Category name is required for Tamil subject.',
        });
    }

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
        const subjectMap = new Map(subjects.map(s => {
            if (language === 'ta') {
                return [s.id, s.name_ta || (s.name === 'Social Science' ? 'சமூக அறிவியல்' : s.name)];
            }
            return [s.id, s.name];
        }));
        const categoryMap = new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));

        const mappedUnits = units.map(unit => ({
            ...unit,
            bookType: unit.bookType || 'samacheer',
            medium: unit.medium || 'tamil',
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || 'Uncategorized',
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }));
        
        const groupedByBookType: Record<string, Record<string, Record<string, typeof mappedUnits[0][]>>> = {
            samacheer: {},
            old: {}
        };
        
        mappedUnits.forEach(unit => {
            const bookTypeKey = unit.bookType as 'samacheer' | 'old';
            if (!groupedByBookType[bookTypeKey]) groupedByBookType[bookTypeKey] = {};

            const classKey = unit.className;
            if (!groupedByBookType[bookTypeKey][classKey]) {
                groupedByBookType[bookTypeKey][classKey] = {};
            }

            const subjectKey = unit.subjectName;
            if (!groupedByBookType[bookTypeKey][classKey][subjectKey]) {
                groupedByBookType[bookTypeKey][classKey][subjectKey] = [];
            }
            groupedByBookType[bookTypeKey][classKey][subjectKey].push(unit);
        });

        const getNumber = (name: string) => {
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        for (const bookType in groupedByBookType) {
            const classesInBookType = groupedByBookType[bookType as 'samacheer' | 'old'];
            const sortedClassNames = Object.keys(classesInBookType).sort((a, b) => getNumber(a) - getNumber(b));
            
            const finalGroupedForBook: Record<string, Record<string, typeof mappedUnits[0][]>> = {};
            for (const className of sortedClassNames) {
                const subjectsInClass = classesInBookType[className];
                const sortedSubjectNames = Object.keys(subjectsInClass).sort((a, b) => a.localeCompare(b));
                
                const finalGroupedForClass: Record<string, typeof mappedUnits[0][]> = {};
                for (const subjectName of sortedSubjectNames) {
                    finalGroupedForClass[subjectName] = subjectsInClass[subjectName].sort((a, b) => {
                        if ((a.term || '').localeCompare(b.term || '') !== 0) {
                            return (a.term || '').localeCompare(b.term || '');
                        }
                         if ((a.unitNumber || 0) - (b.unitNumber || 0) !== 0) {
                           return (a.unitNumber || 0) - (b.unitNumber || 0);
                         }
                        return (a.categoryName || '').localeCompare(b.categoryName || '');
                    });
                }
                finalGroupedForBook[className] = finalGroupedForClass;
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
                description: t('error_deleting_unit_desc'),
            });
        }
    };

    if (isLoading) return <p>{t('Loading units...')}...</p>

    const renderAccordion = (unitsByClass: Record<string, Record<string, any[]>>, bookType: string) => (
        <Accordion type="multiple" className="w-full max-h-96 overflow-y-auto">
            {Object.entries(unitsByClass).map(([className, subjectsInClass]) => (
                 <AccordionItem value={`${bookType}-${className}`} key={`${bookType}-${className}`}>
                    <AccordionTrigger className="text-lg font-semibold">{className}</AccordionTrigger>
                    <AccordionContent>
                         <Accordion type="multiple" className="w-full pl-4" defaultValue={Object.keys(subjectsInClass).map(s => `${bookType}-${className}-${s}`)}>
                            {Object.entries(subjectsInClass).map(([subjectName, subjectUnits]) => (
                                <AccordionItem value={`${bookType}-${className}-${subjectName}`} key={`${bookType}-${className}-${subjectName}`} className="border-b-0">
                                    <AccordionTrigger className="border-b text-base font-medium">{subjectName}</AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <ul className="space-y-2">
                                            {subjectUnits.map(unit => (
                                                <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                                    <button type="button" className="text-left flex-grow" onClick={() => onUnitSelect(unit)}>
                                                        <p className="font-semibold">{unit.unitName || unit.categoryName || unit.term}</p>
                                                        <div className="text-sm text-muted-foreground flex items-center gap-x-2 flex-wrap">
                                                            <span>{unit.term}</span>
                                                            {unit.unitNumber && <span> • {t('Unit')} {unit.unitNumber}</span>}
                                                            {unit.categoryName && unit.unitName && <span> • {unit.categoryName}</span>}
                                                            <Badge variant="outline">{unit.medium}</Badge>
                                                        </div>
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

function ExistingMcqBanksList() {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    const testsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tests'), where('classId', '!=', null)) : null, [firestore]);
    const { data: allTests, isLoading } = useCollection<Test>(testsQuery);
    
    const tests = useMemo(() => allTests?.filter(test => !test.examGroup), [allTests]);

    const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes } = useCollection<Class>(classesCollection);

    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects } = useCollection<Subject>(subjectsCollection);


    const filteredTests = useMemo(() => {
        if (!tests) return [];
        if (!searchTerm) return tests;

        const lowerCaseSearch = searchTerm.toLowerCase();

        return tests.filter(test => {
            return (test.title.toLowerCase().includes(lowerCaseSearch));
        });
    }, [tests, searchTerm]);
    
    const groupedAndSortedTests = useMemo(() => {
        if (!filteredTests || !classes || !subjects) return { samacheer: {}, old: {} };
        
        const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
        const subjectMap = new Map(subjects.map(s => {
            if (language === 'ta') {
                return [s.id, s.name_ta || (s.name === 'Social Science' ? 'சமூக அறிவியல்' : s.name)];
            }
            return [s.id, s.name];
        }));

        const grouped: {
            samacheer: Record<string, Record<string, Record<string, Test[]>>>,
            old: Record<string, Record<string, Record<string, Test[]>>>,
        } = {
            samacheer: {},
            old: {},
        };

        filteredTests.forEach(test => {
            const bookTypeKey = test.bookType || 'samacheer';
            if (!test.classId || !test.subjectId) return;

            const className = classMap.get(test.classId) || 'Uncategorized Class';
            const subjectName = subjectMap.get(test.subjectId) || 'Uncategorized Subject';
            const termName = test.term || 'Uncategorized Term';

            if (!grouped[bookTypeKey][className]) {
                grouped[bookTypeKey][className] = {};
            }
            if (!grouped[bookTypeKey][className][subjectName]) {
                grouped[bookTypeKey][className][subjectName] = {};
            }
            if (!grouped[bookTypeKey][className][subjectName][termName]) {
                grouped[bookTypeKey][className][subjectName][termName] = [];
            }
            
            grouped[bookTypeKey][className][subjectName][termName].push(test);
        });

        const getNumber = (name: string) => {
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        const sortInnerObject = (obj: Record<string, Record<string, Record<string, Test[]>>>) => {
            const sortedClasses = Object.keys(obj).sort((a, b) => getNumber(a) - getNumber(b));
            const result: Record<string, Record<string, Record<string, Test[]>>> = {};
            for (const className of sortedClasses) {
                result[className] = {};
                const sortedSubjects = Object.keys(obj[className]).sort((a, b) => a.localeCompare(b));
                for (const subjectName of sortedSubjects) {
                    result[className][subjectName] = {};
                    const sortedTerms = Object.keys(obj[className][subjectName]).sort((a,b) => {
                         if (a.startsWith('பருவம்')) {
                            const numA = getNumber(a);
                            const numB = getNumber(b);
                            return numA - numB;
                         }
                         return a.localeCompare(b);
                    });
                     for (const termName of sortedTerms) {
                        const sortedTests = obj[className][subjectName][termName].sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0));
                        result[className][subjectName][termName] = sortedTests;
                    }
                }
            }
            return result;
        };
        
        return {
            samacheer: sortInnerObject(grouped.samacheer),
            old: sortInnerObject(grouped.old),
        };

    }, [filteredTests, classes, subjects, language]);


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
    
    const renderAccordionFor = (groupedData: Record<string, Record<string, Record<string, Test[]>>>, bookType: string) => {
        const sortedClassNames = Object.keys(groupedData);
        if (sortedClassNames.length === 0) {
            return (
                <p className="text-muted-foreground text-center p-8">
                    {searchTerm ? `No results for "${searchTerm}" in ${bookType} books.` : `No ${bookType} question banks created yet.`}
                </p>
            );
        }

        return (
            <Accordion type="multiple" className="w-full">
                {sortedClassNames.map((className) => (
                    <AccordionItem value={`${bookType}-${className}`} key={`${bookType}-${className}`}>
                        <AccordionTrigger className="text-lg font-semibold">{className}</AccordionTrigger>
                        <AccordionContent>
                             <Accordion type="multiple" className="w-full pl-4" defaultValue={Object.keys(groupedData[className]).map(s => `${bookType}-${className}-${s}`)}>
                                {Object.keys(groupedData[className]).map(subjectName => (
                                    <AccordionItem value={`${bookType}-${className}-${subjectName}`} key={`${bookType}-${className}-${subjectName}`} className="border-b-0">
                                        <AccordionTrigger className="border-b text-base font-medium">{subjectName}</AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                             <Accordion type="multiple" className="w-full pl-2" defaultValue={Object.keys(groupedData[className][subjectName]).map(term => `${bookType}-${className}-${subjectName}-${term}`)}>
                                                {Object.entries(groupedData[className][subjectName]).map(([termName, testsInTerm]) => (
                                                    <AccordionItem value={`${bookType}-${className}-${subjectName}-${termName}`} key={`${bookType}-${className}-${subjectName}-${termName}`} className="border-b-0">
                                                        <AccordionTrigger className="text-sm font-semibold">{termName}</AccordionTrigger>
                                                        <AccordionContent className="pt-2 pl-2">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Unit / Test Title</TableHead>
                                                                        <TableHead>No. of Questions</TableHead>
                                                                        <TableHead className="text-right">Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                {testsInTerm.map(test => (
                                                                    <TableRow key={test.id}>
                                                                        <TableCell className="font-medium">
                                                                            {test.unitName ? `Unit ${test.unitNumber}: ${test.unitName}` : test.title}
                                                                            {test.categoryName && <p className="text-xs text-muted-foreground">{test.categoryName}</p>}
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
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        );
    }


    if (isLoading) return <p>{t('Loading tests...')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Class-wise Banks</CardTitle>
                 <CardDescription>View, edit, or delete your existing class-wise question banks.</CardDescription>
                 <div className="pt-2">
                    <Input
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {(!filteredTests || filteredTests.length === 0) ? (
                    <p className="text-muted-foreground text-center p-8">
                         {searchTerm ? `No results for "${searchTerm}"` : "No class-wise question banks created yet."}
                    </p>
                ) : (
                    <Tabs defaultValue="samacheer" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="samacheer">Samacheer Kalvi</TabsTrigger>
                            <TabsTrigger value="old">Old Books</TabsTrigger>
                        </TabsList>
                        <TabsContent value="samacheer" className="pt-4">
                           {renderAccordionFor(groupedAndSortedTests.samacheer, 'Samacheer')}
                        </TabsContent>
                        <TabsContent value="old" className="pt-4">
                           {renderAccordionFor(groupedAndSortedTests.old, 'Old Book')}
                        </TabsContent>
                    </Tabs>
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
      classId: '', subjectName: '', term: '', unitNumber: undefined, unitName: '', categoryName: '', jsonInput: '', referencePageOffset: undefined, addUnitForFullBook: 'yes', medium: 'tamil'
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
  
  const isTamil = subjectNameValue.toLowerCase() === 'tamil' || subjectNameValue === 'தமிழ்';
  const isEnglish = subjectNameValue.toLowerCase() === 'english';
  const unitCount = isTamil || isEnglish ? 10 : 30;
  const unitLabel = isTamil ? 'இயல்' : 'Unit';

    useEffect(() => {
        if (isTamil) {
            form.setValue('medium', 'tamil');
        }
    }, [isTamil, form]);
  
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
        form.setValue('medium', unit.medium || 'tamil');
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

      const { bookType, classId, subjectName, medium, term, unitNumber, unitName, categoryName, referencePageOffset, addUnitForFullBook } = values;
      const effectiveCategoryName = categoryName || subjectName;

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
      if (effectiveCategoryName && subjectId) {
        const categoriesRef = collection(firestore, 'categories');
        const categoryQuery = query(categoriesRef, where('name', '==', effectiveCategoryName), where('subjectId', '==', subjectId));
        const categorySnapshot = await getDocs(categoryQuery);

        if(categorySnapshot.empty) {
            const newCategoryRef = doc(categoriesRef);
            const newCategory: Category = { id: newCategoryRef.id, name: effectiveCategoryName, subjectId: subjectId };
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
        where('bookType', '==', bookType),
        where('medium', '==', medium)
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
          const unitData: Partial<Unit> = { id: newUnitRef.id, classId, subjectId, term, categoryId, bookType, medium };
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
          if (medium && unitDoc.data().medium !== medium) {
            updatePayload.medium = medium;
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
      
      if (effectiveCategoryName) {
        testTitle += ` - ${effectiveCategoryName}`;
      }
      
      const testQuery = query(testsCollectionRef, where('title', '==', testTitle), where('bookType', '==', bookType), where('medium', '==', medium));
      
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
                  term: term,
                  unitId: unitId,
                  bookType: bookType,
                  medium: medium,
              };

              if (categoryId) {
                newTest.categoryId = categoryId;
              }

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
              const updateData: any = { questionIds: updatedQuestionIds, bookType: bookType, medium: medium };
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
        <div className="mb-8">
            <h1 className="text-3xl font-bold">MCQ Bank</h1>
            <p className="text-muted-foreground">Create and manage class-wise tests by uploading questions for specific units.</p>
        </div>
        <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload MCQs</TabsTrigger>
                <TabsTrigger value="existing">Existing Banks</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-6">
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

                                <FormField
                                    control={form.control}
                                    name="medium"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Medium</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    className="flex gap-4"
                                                    disabled={isTamil}
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="tamil" /></FormControl>
                                                        <FormLabel className="font-normal">தமிழ்</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="english" /></FormControl>
                                                        <FormLabel className="font-normal">English</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
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
                                                        {Array.from({ length: unitCount }, (_, i) => i + 1).map(num => (
                                                            <SelectItem key={num} value={String(num)}>{unitLabel} {num}</SelectItem>
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
            </TabsContent>
            <TabsContent value="existing">
                <ExistingMcqBanksList />
            </TabsContent>
        </Tabs>
    </div>
  );
}
