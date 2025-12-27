'use client';

import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Question, Test, QuestionInput, Subject, Class } from '@/lib/types';
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
import { Edit, Trash, View } from 'lucide-react';
import Link from 'next/link';


const jsonStructureExample = `[
  {
    "text": "Your question text here?",
    "answerOptions": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "reference": "Source or hint for the question (optional)"
  },
  {
    "text": "Another question?",
    "answerOptions": ["Yes", "No"],
    "correctAnswerIndex": 1
  }
]`;

// Helper to create a slug from a title
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
};

const findImage = (id: string) => {
    const image = PlaceHolderImages.find((img) => img.id === id);
    if (!image) {
      // Fallback to a default image if not found
      return PlaceHolderImages[0];
    }
    return image;
};

function ExistingTestsList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const testsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'tests') : null, [firestore]);
    const { data: tests, isLoading } = useCollection<Test>(testsCollection);

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
                {tests && tests.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Test Title</TableHead>
                                <TableHead>No. of Questions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {tests.map(test => (
                            <TableRow key={test.id}>
                                <TableCell className="font-medium">{test.title}</TableCell>
                                <TableCell>{test.questionIds.length}</TableCell>
                                <TableCell className="text-right space-x-2">
                                     <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/upload/${test.slug}/view`}>
                                            <View className="mr-2 h-4 w-4" />
                                            {t('View')}
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/admin/upload/${test.slug}/edit`}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            {t('edit')}
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash className="mr-2 h-4 w-4" />
                                                {t('delete')}
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
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);


  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);

  useEffect(() => {
    const fetchSubjectsForClass = async () => {
        if (!firestore || !selectedClassId) {
            setAvailableSubjects([]);
            return;
        }

        setSubjectsLoading(true);
        try {
            // Find all questions that belong to the selected class
            const questionsRef = collection(firestore, 'questions');
            const questionsQuery = query(questionsRef, where('classId', '==', selectedClassId));
            const questionSnapshots = await getDocs(questionsQuery);
            const questionsForClass = questionSnapshots.docs.map(d => d.data() as Question);
            
            if (questionsForClass.length > 0) {
                // Get the unique subject IDs from those questions
                const subjectIds = [...new Set(questionsForClass.map(q => q.subjectId).filter(Boolean) as string[])];

                if(subjectIds.length > 0) {
                    // Fetch the subject details for the relevant subjects
                    const subjectsRef = collection(firestore, 'subjects');
                    const subjectsQuery = query(subjectsRef, where('__name__', 'in', subjectIds));
                    const subjectsSnapshot = await getDocs(subjectsQuery);
                    const subjectsData = subjectsSnapshot.docs.map(d => ({id: d.id, ...d.data() } as Subject));
                    setAvailableSubjects(subjectsData);
                } else {
                    setAvailableSubjects([]);
                }
            } else {
                 // If no questions found for the class, maybe check tests as a fallback or just show all subjects?
                 // For now, if no questions link a subject, it won't appear.
                 // This logic might need to be re-evaluated based on how subjects are associated with classes.
                 // A direct link might be better. Let's fetch all subjects for now.
                 const allSubjectsRef = collection(firestore, 'subjects');
                 const allSubjectsSnapshot = await getDocs(allSubjectsRef);
                 const allSubjectsData = allSubjectsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Subject));
                 setAvailableSubjects(allSubjectsData);
            }
        } catch (error) {
            console.error("Error fetching subjects for class: ", error);
             const allSubjectsRef = collection(firestore, 'subjects');
             const allSubjectsSnapshot = await getDocs(allSubjectsRef);
             const allSubjectsData = allSubjectsSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Subject));
             setAvailableSubjects(allSubjectsData);
        } finally {
            setSubjectsLoading(false);
        }
    };
    
    fetchSubjectsForClass();
  }, [firestore, selectedClassId]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setSelectedSubjectId(''); // Reset subject when class changes
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      toast({
        variant: 'destructive',
        title: 'Selection Required',
        description: 'Please select a class and a subject before submitting.',
      });
      return;
    }

    if (!jsonInput.trim()) {
      toast({
        variant: 'destructive',
        title: t('json_input_required_title'),
        description: t('json_input_required_desc'),
      });
      return;
    }

    let questions: Omit<QuestionInput, 'classId' | 'subjectId'>[];
    try {
      questions = JSON.parse(jsonInput);
      // Basic validation
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('JSON must be a non-empty array of questions.');
      }
      for(const q of questions) {
        if (!q.text || !q.answerOptions || q.correctAnswerIndex === undefined) {
            throw new Error('Each question object must have text, answerOptions, and correctAnswerIndex.');
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('invalid_json_format_title'),
        description: error.message || 'The provided JSON is not valid.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!firestore) throw new Error('Firestore is not initialized');

      const batch = writeBatch(firestore);
      const questionsCollectionRef = collection(firestore, 'questions');
      const testsCollectionRef = collection(firestore, 'tests');
      
      const selectedSubject = availableSubjects.find(s => s.id === selectedSubjectId);
      const selectedClass = classes?.find(c => c.id === selectedClassId);

      const newQuestionIds: string[] = [];

      // Add new questions to batch with selected class and subject
      questions.forEach(q => {
          const questionRef = doc(questionsCollectionRef); // Auto-generate ID
          const questionData: QuestionInput = {
              ...q,
              classId: selectedClassId,
              subjectId: selectedSubjectId,
              reference: q.reference || ''
          };
          batch.set(questionRef, questionData);
          newQuestionIds.push(questionRef.id);
      });

      // Find or create test and update it
      const testTitle = `${selectedClass?.name || 'Class'} - ${selectedSubject?.name || 'Subject'}`;
      const testSlug = createSlug(testTitle);
      const testRef = doc(testsCollectionRef, testSlug);

      await runTransaction(firestore, async (transaction) => {
          const testDoc = await transaction.get(testRef);

          if (!testDoc.exists()) {
              const newTest: Test = {
                  id: testSlug,
                  slug: testSlug,
                  title: testTitle,
                  description: t('test_for_class_subject', {classId: selectedClass?.name || selectedClassId, subjectId: selectedSubject?.name || selectedSubjectId}),
                  category: 'class',
                  image: findImage('class-wise'),
                  questionIds: newQuestionIds,
                  classId: selectedClassId,
                  subjectId: selectedSubjectId,
              };
              transaction.set(testRef, newTest);
          } else {
              const existingQuestionIds = testDoc.data().questionIds || [];
              const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
              transaction.update(testRef, { questionIds: updatedQuestionIds });
          }
      });
      
      await batch.commit();

      toast({
        title: t('upload_successful_title'),
        description: t('upload_successful_desc', { count: questions.length }),
      });
      setJsonInput('');
      setSelectedClassId('');
      setSelectedSubjectId('');
    } catch (error: any) {
      console.error('Error uploading questions:', error);
      toast({
        variant: 'destructive',
        title: t('upload_error_title'),
        description:
          error.message || t('upload_error_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{t('upload_class_wise_mcqs')}</CardTitle>
          <CardDescription>
            {t('upload_class_wise_mcqs_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label>{t('Select Class')}</Label>
                <Select onValueChange={handleClassChange} value={selectedClassId} disabled={classesLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select a class...')} />
                    </SelectTrigger>
                    <SelectContent>
                        {classes?.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label>{t('Select Subject')}</Label>
                <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={subjectsLoading || !selectedClassId}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('Select a subject...')} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSubjects?.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label htmlFor="json-input">{t('json_data')}</Label>
              <Textarea
                id="json-input"
                placeholder={t('json_data_placeholder')}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="h-72 font-mono text-sm"
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
            </div>
            <div className="space-y-4">
              <Label>{t('expected_json_structure')}</Label>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <pre className="text-xs font-mono overflow-auto max-h-80">
                    <code>{jsonStructureExample}</code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
          <div>
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedClassId || !selectedSubjectId}>
              {isSubmitting ? t('submitting') : t('submit_questions')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <ExistingTestsList />
    </div>
  );
}
