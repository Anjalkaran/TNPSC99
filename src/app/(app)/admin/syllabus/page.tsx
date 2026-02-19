'use client';

import { useState, useMemo } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const syllabusSchema = z.object({
  examGroup: z.enum(['Group I', 'Group II', 'Group IV'], { required_error: "Please select an exam group." }),
  part: z.string().min(1, { message: "Syllabus part is required." }),
  subject: z.string().min(1, { message: "Syllabus subject is required." }),
  topic: z.string().min(1, { message: "Syllabus topic is required." }),
});
type SyllabusFormValues = z.infer<typeof syllabusSchema>;

function ManageSyllabusStructure() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const syllabusQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'syllabus')) : null, [firestore]);
    const { data: syllabusTopics, isLoading } = useCollection<Syllabus>(syllabusQuery);

    const form = useForm<SyllabusFormValues>({
        resolver: zodResolver(syllabusSchema),
        defaultValues: { examGroup: undefined, part: '', subject: '', topic: '' },
    });

    const onSubmit: SubmitHandler<SyllabusFormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            if (!firestore) throw new Error("Firestore not available");
            await addDoc(collection(firestore, 'syllabus'), {
                ...values,
                id: doc(collection(firestore, 'syllabus')).id,
            });
            toast({ title: "Syllabus Topic Added" });
            form.reset();
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
            const { examGroup, part, subject } = topic;
            if (!acc[examGroup]) acc[examGroup] = {};
            if (!acc[examGroup][part]) acc[examGroup][part] = {};
            if (!acc[examGroup][part][subject]) acc[examGroup][part][subject] = [];
            acc[examGroup][part][subject].push(topic);
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
                                    <FormControl><Input placeholder="e.g., பகுதி அ: பொது அறிவு" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Syllabus Subject</FormLabel>
                                    <FormControl><Input placeholder="e.g., பொது அறிவியல்" {...field} /></FormControl>
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
                                        {Object.entries(parts).map(([part, subjects]) => (
                                            <AccordionItem value={part} key={part}>
                                                <AccordionTrigger>{part}</AccordionTrigger>
                                                <AccordionContent>
                                                    <Accordion type="multiple" className="w-full pl-4">
                                                        {Object.entries(subjects).map(([subject, topics]) => (
                                                            <AccordionItem value={subject} key={subject}>
                                                                <AccordionTrigger>{subject}</AccordionTrigger>
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
  jsonInput: z.string().min(1, { message: 'JSON data is required.' }),
});

type SyllabusMcqUploadValues = z.infer<typeof syllabusMcqUploadSchema>;

function SyllabusMcqUpload() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const syllabusQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'syllabus')) : null, [firestore]);
    const { data: syllabusTopics, isLoading: isLoadingSyllabus } = useCollection<Syllabus>(syllabusQuery);
    
    const [selectedExamGroup, setSelectedExamGroup] = useState<string>('');
    const [selectedPart, setSelectedPart] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    const form = useForm<SyllabusMcqUploadValues>({
        resolver: zodResolver(syllabusMcqUploadSchema),
        defaultValues: { syllabusTopicId: '', medium: undefined, jsonInput: '' }
    });

    const uniqueExamGroups = useMemo(() => syllabusTopics ? [...new Set(syllabusTopics.map(t => t.examGroup))] : [], [syllabusTopics]);
    const uniqueParts = useMemo(() => syllabusTopics ? [...new Set(syllabusTopics.filter(t => t.examGroup === selectedExamGroup).map(t => t.part))] : [], [syllabusTopics, selectedExamGroup]);
    const uniqueSubjects = useMemo(() => syllabusTopics ? [...new Set(syllabusTopics.filter(t => t.examGroup === selectedExamGroup && t.part === selectedPart).map(t => t.subject))] : [], [syllabusTopics, selectedExamGroup, selectedPart]);
    const filteredTopics = useMemo(() => syllabusTopics ? syllabusTopics.filter(t => t.examGroup === selectedExamGroup && t.part === selectedPart && t.subject === selectedSubject) : [], [syllabusTopics, selectedExamGroup, selectedPart, selectedSubject]);

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
    
    const onSubmit: SubmitHandler<SyllabusMcqUploadValues> = async (values) => {
        setIsSubmitting(true);
        let questions: any[];
        try {
          questions = JSON.parse(values.jsonInput);
        } catch (error) {
          toast({ variant: 'destructive', title: "Invalid JSON" });
          setIsSubmitting(false);
          return;
        }

        const selectedTopic = syllabusTopics?.find(t => t.id === values.syllabusTopicId);
        if (!firestore || !selectedTopic) {
            toast({ variant: 'destructive', title: "Syllabus topic not found" });
            setIsSubmitting(false);
            return;
        }
        
        try {
          const batch = writeBatch(firestore);
          const questionsCollectionRef = collection(firestore, 'questions');
          const newQuestionIds: string[] = [];
          questions.forEach(q => {
              const questionRef = doc(questionsCollectionRef, q.id);
              batch.set(questionRef, { ...q, syllabusTopicId: selectedTopic.id });
              newQuestionIds.push(q.id);
          });
          await batch.commit();

          const testTitle = `${selectedTopic.examGroup} - ${selectedTopic.subject} - ${selectedTopic.topic}`;
          const testsCollectionRef = collection(firestore, 'tests');
          const testQuery = query(testsCollectionRef, where('title', '==', testTitle), where('medium', '==', values.medium));
          
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
                      syllabusSubject: selectedTopic.subject,
                      syllabusTopic: selectedTopic.topic,
                  };
                  transaction.set(newTestRef, newTest);
              } else {
                  const testDoc = testSnapshot.docs[0];
                  const existingQuestionIds = testDoc.data().questionIds || [];
                  const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
                  transaction.update(testDoc.ref, { questionIds: updatedQuestionIds });
              }
          });
          
          toast({ title: "Upload Successful", description: `${questions.length} questions uploaded.` });
          form.reset();
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Upload Error', description: error.message });
        } finally {
          setIsSubmitting(false);
        }
    };

    return (
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
                            <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedPart}>
                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>{uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormField
                                control={form.control}
                                name="syllabusTopicId"
                                render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubject}>
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
                            name="jsonInput"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel htmlFor="json-input">{t('json_data')}</FormLabel>
                                <FormControl><Textarea id="json-input" placeholder='[{"id": "q1", ...}]' className="h-48 font-mono text-sm" {...field}/></FormControl>
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
    )
}

export default function SyllabusManagementPage() {
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
