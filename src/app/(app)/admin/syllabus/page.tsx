

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
  addDoc,
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
import type { Test, Question, Syllabus } from '@/lib/types';
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
import { Edit, Trash, Download } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


const syllabusSchema = z.object({
  examGroup: z.enum(['Group I', 'Group II', 'Group IV'], { required_error: "Please select an exam group." }),
  part: z.string().min(1, { message: "Syllabus part is required." }),
  unit: z.string().min(1, { message: "Syllabus unit is required." }),
  unitName: z.string().min(1, { message: "Unit name is required." }),
  topic: z.string().min(1, { message: "Syllabus topic is required." }),
});
type SyllabusFormValues = z.infer<typeof syllabusSchema>;

const syllabusStructure = {
    'Group IV': {
      'பகுதி அ': {
        'அலகு I': 'பொது அறிவியல்',
        'அலகு II': 'புவியியல்',
        'அலகு III': 'இந்தியாவின் வரலாறு, பண்பாடு மற்றும் இந்திய தேசிய இயக்கம்',
        'அலகு IV': 'இந்திய ஆட்சியியல்',
        'அலகு V': 'இந்தியப் பொருளாதாரம் மற்றும் தமிழ்நாட்டில் வளர்ச்சி நிர்வாகம்',
        'அலகு VI': 'தமிழ்நாட்டின் வரலாறு, பண்பாடு, மரபு மற்றும் சமூக - அரசியல் இயக்கங்கள்'
      },
      'பகுதி ஆ': {
          'அலகு I': 'திறனறிவு',
          'அலகு II': 'காரணவியல்'
      },
      'பகுதி இ': {
          'அலகு I': 'இலக்கணம்',
          'அலகு II': 'சொல்லகராதி',
          'அலகு III': 'எழுதும் திறன்',
          'அலகு IV': 'கலைச் சொற்கள்',
          'அலகு V': 'வாசித்தல் – புரிந்து கொள்ளும் திறன்',
          'அலகு VI': 'எளிய மொழி பெயர்ப்பு',
          'அலகு VII': 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்'
      }
    }
  };

function ManageSyllabusStructure() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const syllabusQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'syllabus')) : null, [firestore]);
    const { data: syllabusTopics, isLoading } = useCollection<Syllabus>(syllabusQuery);

    const form = useForm<SyllabusFormValues>({
        resolver: zodResolver(syllabusSchema),
        defaultValues: { examGroup: undefined, part: '', unit: '', unitName: '', topic: '' },
    });

    const examGroupValue = form.watch('examGroup');
    const partValue = form.watch('part');
    const unitValue = form.watch('unit');

    const availableParts = useMemo(() => {
        if (examGroupValue && syllabusStructure[examGroupValue]) {
            return Object.keys(syllabusStructure[examGroupValue]);
        }
        return ['பகுதி அ', 'பகுதி ஆ', 'பகுதி இ'];
    }, [examGroupValue]);

    const availableUnits = useMemo(() => {
        if (examGroupValue && partValue && syllabusStructure[examGroupValue]?.[partValue]) {
            return Object.keys(syllabusStructure[examGroupValue][partValue]);
        }
        return [];
    }, [examGroupValue, partValue]);

    const isUnitNamePrefilled = availableUnits.length > 0;

     useEffect(() => {
        if (examGroupValue && partValue && unitValue && syllabusStructure[examGroupValue]?.[partValue]?.[unitValue]) {
            form.setValue('unitName', syllabusStructure[examGroupValue][partValue][unitValue]);
        } else {
             form.setValue('unitName', '');
        }
    }, [examGroupValue, partValue, unitValue, form]);

    useEffect(() => {
        form.setValue('unit', '');
        form.setValue('unitName', '');
    }, [partValue, form]);

    useEffect(() => {
        form.setValue('part', '');
        form.setValue('unit', '');
        form.setValue('unitName', '');
    }, [examGroupValue, form]);


    const onSubmit: SubmitHandler<SyllabusFormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            if (!firestore) throw new Error("Firestore not available");
            const newDocRef = doc(collection(firestore, 'syllabus'));
            await setDoc(newDocRef, {
                ...values,
                id: newDocRef.id,
            });
            toast({ title: "Syllabus Topic Added" });
            form.reset();
             form.setValue('examGroup', examGroupValue);
             form.setValue('part', partValue);
             form.setValue('unit', unitValue);
             form.setValue('unitName', form.getValues('unitName'));
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'syllabus', id));
            toast({ title: "Syllabus Topic Deleted" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };

    const groupedSyllabus = useMemo(() => {
        if (!syllabusTopics) return {};
        return syllabusTopics.reduce((acc, topic) => {
            const { examGroup, part, unit, unitName } = topic;
            const unitKey = `${unit}: ${unitName}`;
            if (!acc[examGroup]) acc[examGroup] = {};
            if (!acc[examGroup][part]) acc[examGroup][part] = {};
            if (!acc[examGroup][part][unitKey]) acc[examGroup][part][unitKey] = [];
            acc[examGroup][part][unitKey].push(topic);
            return acc;
        }, {} as Record<string, Record<string, Record<string, Syllabus[]>>>);
    }, [syllabusTopics]);

    return (
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Add Syllabus Topic</CardTitle>
                    <CardDescription>Define a new topic in the syllabus hierarchy.</CardDescription>
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
                                        <SelectTrigger><SelectValue placeholder="Select an Exam Group" /></SelectTrigger>
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
                                name="part"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Syllabus Part</FormLabel>
                                     <Select onValueChange={field.onChange} value={field.value} disabled={!examGroupValue}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="e.g., பகுதி அ" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableParts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Syllabus Unit</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={availableUnits.length === 0}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="e.g., அலகு I" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                                    <FormLabel>Unit Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., பொது அறிவியல்" {...field} readOnly={isUnitNamePrefilled} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="topic"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Syllabus Topic</FormLabel>
                                    <FormControl><Input placeholder="e.g., பேரண்டத்தின் இயல்பு" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting}>Add Topic</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Existing Syllabus Structure</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && <p>Loading syllabus...</p>}
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedSyllabus).map(([examGroup, parts]) => (
                            <AccordionItem value={examGroup} key={examGroup}>
                                <AccordionTrigger>{examGroup}</AccordionTrigger>
                                <AccordionContent>
                                    <Accordion type="multiple" className="w-full pl-4">
                                        {Object.entries(parts).sort((a, b) => {
                                            const order = ['பகுதி அ', 'பகுதி ஆ', 'பகுதி இ'];
                                            const indexA = order.indexOf(a[0]);
                                            const indexB = order.indexOf(b[0]);
                                            if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
                                            if (indexA === -1) return 1;
                                            if (indexB === -1) return -1;
                                            return indexA - indexB;
                                        }).map(([part, units]) => (
                                            <AccordionItem value={part} key={part}>
                                                <AccordionTrigger>{part}</AccordionTrigger>
                                                <AccordionContent>
                                                    <Accordion type="multiple" className="w-full pl-4">
                                                        {Object.entries(units).sort(([unitKeyA], [unitKeyB]) => {
                                                            const romanMap: { [key: string]: number } = { 'I': 1, 'V': 5, 'X': 10 };
                                                            const getUnitNumber = (unitKey: string): number => {
                                                                const match = unitKey.match(/அலகு\s+([IVXLCDM]+)/);
                                                                if (!match || !match[1]) return 99;
                                                                const roman = match[1];
                                                                let result = 0;
                                                                for (let i = 0; i < roman.length; i++) {
                                                                    const current = romanMap[roman[i]];
                                                                    const next = i + 1 < roman.length ? romanMap[roman[i + 1]] : undefined;
                                                                    if (next && current < next) {
                                                                        result -= current;
                                                                    } else {
                                                                        result += current;
                                                                    }
                                                                }
                                                                return result;
                                                            };
                                                            return getUnitNumber(unitKeyA) - getUnitNumber(unitKeyB);
                                                        }).map(([unitKey, topics]) => (
                                                            <AccordionItem value={unitKey} key={unitKey}>
                                                                <AccordionTrigger>{unitKey}</AccordionTrigger>
                                                                <AccordionContent>
                                                                    <ul className="space-y-2 pl-4">
                                                                        {topics.map(topic => (
                                                                            <li key={topic.id} className="flex justify-between items-center">
                                                                                <span>{topic.topic}</span>
                                                                                 <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button variant="ghost" size="icon"><Trash className="h-4 w-4 text-destructive" /></Button>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent>
                                                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the syllabus topic.</AlertDialogDescription></AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                            <AlertDialogAction onClick={() => handleDelete(topic.id)}>Delete</AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
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
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    );
}

const syllabusMcqUploadSchema = z.object({
  syllabusTopicId: z.string().min(1, "Please select a syllabus topic."),
  medium: z.enum(['tamil', 'english'], { required_error: "Please select a medium." }),
  syllabusCategory: z.string().optional(),
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
});

type SyllabusMcqUploadValues = z.infer<typeof syllabusMcqUploadSchema>;

function ExistingSyllabusMcqBanks() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();

    const testsQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'tests'), where('syllabusTopic', '!=', null)) : null,
        [firestore]
    );
    const { data: tests, isLoading } = useCollection<Test>(testsQuery);

    const groupedByExamGroup = useMemo(() => {
        if (!tests) return {};
        const grouped = tests.reduce((acc, test) => {
          const examGroup = test.examGroup || 'Uncategorized';
          if (!acc[examGroup]) {
            acc[examGroup] = {};
          }
          
          const part = test.syllabusPart || 'Uncategorized Part';
          if (!acc[examGroup][part]) {
            acc[examGroup][part] = {};
          }

          const unitKey = test.syllabusUnit && test.syllabusUnitName ? `${test.syllabusUnit}: ${test.syllabusUnitName}` : (test.syllabusUnitName || 'Uncategorized Unit');
          if (!acc[examGroup][part][unitKey]) {
            acc[examGroup][part][unitKey] = [];
          }
          acc[examGroup][part][unitKey].push(test);
          return acc;
        }, {} as Record<string, Record<string, Record<string, Test[]>>>);

        for (const examGroup in grouped) {
            for (const part in grouped[examGroup]) {
                for (const unitName in grouped[examGroup][part]) {
                    grouped[examGroup][part][unitName].sort((a, b) => (a.syllabusTopic || '').localeCompare(b.syllabusTopic || ''));
                }
            }
        }
        return grouped;
    }, [tests]);

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
            a.download = `${test.title.replace(/ /g, '_')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Download Started", description: `Downloading ${test.title} questions.` });
        } catch (error) {
            console.error("Error downloading test data:", error);
            toast({ variant: 'destructive', title: "Download Failed", description: "There was a problem downloading the question bank." });
        }
    };

    const handleDelete = async (testId: string) => {
        if (!firestore) return;
        const testDocRef = doc(firestore, 'tests', testId);
        try {
            await deleteDoc(testDocRef);
            toast({ title: 'Test Bank Deleted', description: 'The syllabus test bank has been successfully deleted.' });
        } catch (error) {
            console.error("Error deleting test bank: ", error);
            toast({ variant: 'destructive', title: 'Error Deleting Test Bank', description: 'There was a problem deleting the test bank.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Syllabus MCQ Banks</CardTitle>
                <CardDescription>View, edit, or delete existing syllabus-based test banks.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p>Loading test banks...</p>
                ) : Object.keys(groupedByExamGroup).length > 0 ? (
                    <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedByExamGroup)}>
                        {Object.entries(groupedByExamGroup).map(([examGroup, parts]) => (
                            <AccordionItem value={examGroup} key={examGroup}>
                                <AccordionTrigger className="text-xl font-bold">{examGroup}</AccordionTrigger>
                                <AccordionContent>
                                    <Accordion type="multiple" className="w-full pl-4 space-y-2" defaultValue={Object.keys(parts)}>
                                        {Object.entries(parts).sort((a, b) => a[0].localeCompare(b[0])).map(([part, units]) => (
                                            <AccordionItem value={part} key={part} className="border-b-0">
                                                <Card className="bg-muted/50">
                                                    <CardHeader className="p-3">
                                                        <AccordionTrigger className="text-lg p-0 hover:no-underline">{part}</AccordionTrigger>
                                                    </CardHeader>
                                                    <AccordionContent className="p-3">
                                                        <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(units)}>
                                                            {Object.entries(units).sort(([unitA], [unitB]) => unitA.localeCompare(unitB)).map(([unitKey, testList]) => (
                                                                <AccordionItem value={unitKey} key={unitKey} className="border-b-0">
                                                                    <Card>
                                                                        <CardHeader className="p-3">
                                                                            <AccordionTrigger className="font-semibold p-0 hover:no-underline">{unitKey}</AccordionTrigger>
                                                                        </CardHeader>
                                                                        <AccordionContent className="p-3">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow>
                                                                                        <TableHead>Topic</TableHead>
                                                                                        <TableHead>Category</TableHead>
                                                                                        <TableHead>Details</TableHead>
                                                                                        <TableHead className="text-right">Actions</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {(() => {
                                                                                        const testsByTopic = testList.reduce((acc, test) => {
                                                                                            const topic = test.syllabusTopic || 'Uncategorized';
                                                                                            if (!acc[topic]) {
                                                                                                acc[topic] = [];
                                                                                            }
                                                                                            acc[topic].push(test);
                                                                                            return acc;
                                                                                        }, {} as Record<string, Test[]>);

                                                                                        return Object.entries(testsByTopic).flatMap(([topicName, topicTests]) => 
                                                                                            topicTests.map((test, index) => (
                                                                                                <TableRow key={test.id}>
                                                                                                    <TableCell className="font-medium align-top">
                                                                                                        {index === 0 ? topicName : ''}
                                                                                                    </TableCell>
                                                                                                    <TableCell>{test.syllabusCategory || 'General'}</TableCell>
                                                                                                    <TableCell>
                                                                                                        <Badge variant="outline">{test.medium}</Badge>
                                                                                                        <span className="text-sm text-muted-foreground ml-2">({test.questionIds.length} Qs)</span>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="text-right space-x-1">
                                                                                                        <Button variant="outline" size="icon" onClick={() => handleDownload(test)}>
                                                                                                            <Download className="h-4 w-4" />
                                                                                                        </Button>
                                                                                                        <Button asChild variant="outline" size="icon">
                                                                                                            <Link href={`/admin/upload/${encodeURIComponent(test.id)}/edit`}>
                                                                                                                <Edit className="h-4 w-4" />
                                                                                                            </Link>
                                                                                                        </Button>
                                                                                                        <AlertDialog>
                                                                                                            <AlertDialogTrigger asChild>
                                                                                                                <Button variant="destructive" size="icon"><Trash className="h-4 w-4" /></Button>
                                                                                                            </AlertDialogTrigger>
                                                                                                            <AlertDialogContent>
                                                                                                                <AlertDialogHeader>
                                                                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                                                                    <AlertDialogDescription>This will permanently delete the test bank, but not the questions themselves.</AlertDialogDescription>
                                                                                                                </AlertDialogHeader>
                                                                                                                <AlertDialogFooter>
                                                                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                                                    <AlertDialogAction onClick={() => handleDelete(test.id)}>Delete</AlertDialogAction>
                                                                                                                </AlertDialogFooter>
                                                                                                            </AlertDialogContent>
                                                                                                        </AlertDialog>
                                                                                                    </TableCell>
                                                                                                </TableRow>
                                                                                            ))
                                                                                        );
                                                                                    })()}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </AccordionContent>
                                                                    </Card>
                                                                </AccordionItem>
                                                            ))}
                                                        </Accordion>
                                                    </AccordionContent>
                                                </Card>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <p className="text-center text-muted-foreground p-8">No syllabus-based MCQ banks uploaded yet.</p>
                )}
            </CardContent>
        </Card>
    );
}


function SyllabusMcqUpload() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const syllabusQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'syllabus')) : null, [firestore]);
    const { data: syllabusTopics, isLoading: isLoadingSyllabus } = useCollection<Syllabus>(syllabusQuery);
    
    const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
    const [selectedPart, setSelectedPart] = useState<string>('');
    const [selectedUnit, setSelectedUnit] = useState<string>('');

    const form = useForm<SyllabusMcqUploadValues>({
        resolver: zodResolver(syllabusMcqUploadSchema),
        defaultValues: { syllabusTopicId: '', medium: undefined, jsonInput: '', syllabusCategory: '' }
    });

    const uniqueExamGroups = useMemo(() => syllabusTopics ? [...new Set(syllabusTopics.map(t => t.examGroup))] : [], [syllabusTopics]);
    
    const uniqueParts = useMemo(() => {
        if (!syllabusTopics || !selectedExamGroup) return [];
        const parts = syllabusTopics
            .filter(t => t.examGroup === selectedExamGroup)
            .map(t => t.part);
        const unique = [...new Set(parts)];
        return unique.sort((a, b) => {
            const order = ['பகுதி அ', 'பகுதி ஆ', 'பகுதி இ'];
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [syllabusTopics, selectedExamGroup]);

    const uniqueUnits = useMemo(() => {
        if (!syllabusTopics || !selectedPart) return [];
        const units = syllabusTopics
            .filter(t => t.examGroup === selectedExamGroup && t.part === selectedPart)
            .map(t => `${t.unit}: ${t.unitName}`);
        return [...new Set(units)];
    }, [syllabusTopics, selectedExamGroup, selectedPart]);

    const filteredTopics = useMemo(() => {
        if (!syllabusTopics || !selectedUnit) return [];
        const [unit, unitName] = selectedUnit.split(': ');
        return syllabusTopics.filter(t => 
            t.examGroup === selectedExamGroup && 
            t.part === selectedPart && 
            t.unit === unit &&
            t.unitName === unitName
        );
    }, [syllabusTopics, selectedExamGroup, selectedPart, selectedUnit]);

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

    const syllabusJsonStructureExample = `[
  {
    "id": "your-unique-question-id-1",
    "text": "Which one of the following is a fundamental right?",
    "answerOptions": ["Right to Property", "Right to Equality", "Right to Work", "Right to Vote"],
    "correctAnswerIndex": 1,
    "category": "kootru kaarani",
    "explanation": "Right to Equality is a fundamental right under Article 14 of the Indian Constitution.",
    "reference": "Indian Polity - Laxmikanth",
    "referenceUrl": "https://your-pdf-host.com/book.pdf#page=42 (optional)"
  }
]`;
    
    const onSubmit: SubmitHandler<SyllabusMcqUploadValues> = async (values) => {
        setIsSubmitting(true);
        let questions: any[];
        try {
          questions = JSON.parse(values.jsonInput);
          if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('JSON must be a non-empty array of questions.');
          }
          for (const q of questions) {
            if (!q.id || !q.text || !q.answerOptions || !Array.isArray(q.answerOptions) || q.correctAnswerIndex === undefined) {
              throw new Error('Each question object must have id, text, answerOptions (array), and correctAnswerIndex.');
            }
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: "Invalid JSON", description: error.message || "The provided JSON is not valid." });
          setIsSubmitting(false);
          return;
        }

        const selectedTopic = syllabusTopics?.find(t => t.id === values.syllabusTopicId);
        if (!firestore || !selectedTopic) {
            toast({ variant: 'destructive', title: "Syllabus topic not found" });
            setIsSubmitting(false);
            return;
        }
        
        const questionsByCategory: Record<string, any[]> = questions.reduce((acc, q) => {
            const category = q.category || values.syllabusCategory || 'General';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(q);
            return acc;
        }, {} as Record<string, any[]>);

        try {
            for (const [categoryName, categoryQuestions] of Object.entries(questionsByCategory)) {
                const questionsBatch = writeBatch(firestore);
                const questionsCollectionRef = collection(firestore, 'questions');
                const newQuestionIds: string[] = [];
                categoryQuestions.forEach(q => {
                    const questionRef = doc(questionsCollectionRef, q.id);
                    const payload: any = { ...q, syllabusTopicId: selectedTopic.id, category: categoryName };
                    questionsBatch.set(questionRef, payload, { merge: true });
                    newQuestionIds.push(q.id);
                });
                await questionsBatch.commit();
                
                const testTitle = `${selectedTopic.examGroup} - ${selectedTopic.unitName} - ${selectedTopic.topic}` + (categoryName !== 'General' ? ` - ${categoryName}` : '');
                const testsCollectionRef = collection(firestore, 'tests');
                
                const testQuery = query(testsCollectionRef, 
                    where('syllabusTopic', '==', selectedTopic.topic),
                    where('syllabusUnitName', '==', selectedTopic.unitName),
                    where('medium', '==', values.medium),
                    where('syllabusCategory', '==', categoryName)
                );
                
                await runTransaction(firestore, async (transaction) => {
                    const testSnapshot = await getDocs(testQuery);
                    if (testSnapshot.empty) {
                        const newTestRef = doc(testsCollectionRef);
                        const newTest: Partial<Test> = {
                            id: newTestRef.id,
                            title: testTitle,
                            questionIds: newQuestionIds,
                            examGroup: selectedTopic.examGroup,
                            medium: values.medium,
                            syllabusPart: selectedTopic.part,
                            syllabusUnit: selectedTopic.unit,
                            syllabusUnitName: selectedTopic.unitName,
                            syllabusTopic: selectedTopic.topic,
                            syllabusCategory: categoryName,
                        };
                        transaction.set(newTestRef, newTest);
                    } else {
                        const testDoc = testSnapshot.docs[0];
                        const existingQuestionIds = testDoc.data().questionIds || [];
                        const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
                        transaction.update(testDoc.ref, { questionIds: updatedQuestionIds });
                    }
                });
            }
            
            toast({ title: "Upload Successful", description: `${questions.length} questions uploaded across ${Object.keys(questionsByCategory).length} categories.` });
            form.reset();

        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Upload Error', description: error.message });
        } finally {
          setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Syllabus MCQs</CardTitle>
                        <CardDescription>Upload questions for a predefined syllabus topic.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <Select onValueChange={setSelectedExamGroup} value={selectedExamGroup}>
                                        <SelectTrigger><SelectValue placeholder="Select Exam Group" /></SelectTrigger>
                                        <SelectContent>{uniqueExamGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select onValueChange={setSelectedPart} value={selectedPart} disabled={!selectedExamGroup}>
                                        <SelectTrigger><SelectValue placeholder="Select Part" /></SelectTrigger>
                                        <SelectContent>{uniqueParts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select onValueChange={setSelectedUnit} value={selectedUnit} disabled={!selectedPart}>
                                        <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                                        <SelectContent>{uniqueUnits.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormField
                                        control={form.control}
                                        name="syllabusTopicId"
                                        render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedUnit}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Topic" /></SelectTrigger></FormControl>
                                                <SelectContent>{filteredTopics.map(t => <SelectItem key={t.id} value={t.id}>{t.topic}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="medium"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Medium</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger><SelectValue placeholder="Select a Medium" /></SelectTrigger>
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
                                    name="syllabusCategory"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question Category (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., kootru kaarani" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Assign a category to all questions in this upload. Will be overridden by 'category' in JSON.
                                        </FormDescription>
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
                                        <FormControl><Textarea id="json-input" placeholder='[{"id": "q1", "category": "kootru kaarani", ...}]' className="h-48 font-mono text-sm" {...field}/></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="json-file">{t('or_upload_file')}</Label>
                                    <Input id="json-file" type="file" accept=".json" onChange={handleFileChange} />
                                </div>
                                <Button type="submit" disabled={isSubmitting}>Submit Questions</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('expected_json_structure')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 bg-muted rounded-md">
                            <pre className="text-xs font-mono overflow-auto max-h-80">
                                <code>{syllabusJsonStructureExample}</code>
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <ExistingSyllabusMcqBanks />
        </div>
    )
}

export default function SyllabusManagementPage() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold">Syllabus Management</h1>
            <p className="text-muted-foreground">Define the exam syllabus structure and upload corresponding MCQs.</p>
        </div>
        <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manage">Manage Syllabus</TabsTrigger>
                <TabsTrigger value="upload">Upload MCQs</TabsTrigger>
            </TabsList>
            <TabsContent value="manage" className="mt-6">
                <ManageSyllabusStructure />
            </TabsContent>
            <TabsContent value="upload" className="mt-6">
                <SyllabusMcqUpload />
            </TabsContent>
        </Tabs>
    </div>
  );
}
