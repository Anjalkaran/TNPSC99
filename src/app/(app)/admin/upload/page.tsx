'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import {
  writeBatch,
  collection,
  doc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Question, Test, QuestionInput } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRouter } from 'next/navigation';
import { useDoc, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

const jsonStructureExample = `[
  {
    "text": "Your question text here?",
    "subjectId": "science",
    "classId": "6",
    "answerOptions": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0
  },
  {
    "text": "Another question for the same class and subject?",
    "subjectId": "science",
    "classId": "6",
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

export default function UploadMcqPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const { user, isUserLoading } = useUser();
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);


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
    if (!jsonInput.trim()) {
      toast({
        variant: 'destructive',
        title: t('json_input_required_title'),
        description: t('json_input_required_desc'),
      });
      return;
    }

    let questions: QuestionInput[];
    try {
      questions = JSON.parse(jsonInput);
      // Basic validation
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('JSON must be a non-empty array of questions.');
      }
      for(const q of questions) {
        if (!q.text || !q.subjectId || !q.classId || !q.answerOptions || q.correctAnswerIndex === undefined) {
            throw new Error('Each question object must have text, subjectId, classId, answerOptions, and correctAnswerIndex.');
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
      
      // Group questions by classId and subjectId
      const groupedQuestions = questions.reduce((acc, q) => {
        const key = `${q.classId}-${q.subjectId}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(q);
        return acc;
      }, {} as Record<string, QuestionInput[]>);


      const batch = writeBatch(firestore);
      const questionsCollection = collection(firestore, 'questions');
      const testsCollection = collection(firestore, 'tests');

      for (const key in groupedQuestions) {
        const [classId, subjectId] = key.split('-');
        const questionsInGroup = groupedQuestions[key];
        const newQuestionIds: string[] = [];

        // Add new questions to batch
        questionsInGroup.forEach(q => {
            const questionRef = doc(questionsCollection); // Auto-generate ID
            batch.set(questionRef, q);
            newQuestionIds.push(questionRef.id);
        });

        // Find or create test and update it
        const testTitle = `${t('class')} ${classId} - ${subjectId}`;
        const testSlug = createSlug(testTitle);
        const testRef = doc(testsCollection, testSlug);

        // We need to run a transaction to safely read-then-write the test document
        await runTransaction(firestore, async (transaction) => {
            const testDoc = await transaction.get(testRef);

            if (!testDoc.exists()) {
                // Create new test
                const newTest: Test = {
                    id: testSlug,
                    slug: testSlug,
                    title: testTitle,
                    description: t('test_for_class_subject', {classId, subjectId}),
                    category: 'class',
                    image: findImage('class-wise'), // Or choose dynamically
                    questionIds: newQuestionIds,
                    classId: classId,
                    subjectId: subjectId,
                };
                transaction.set(testRef, newTest);
            } else {
                // Update existing test
                const existingQuestionIds = testDoc.data().questionIds || [];
                const updatedQuestionIds = [...new Set([...existingQuestionIds, ...newQuestionIds])];
                transaction.update(testRef, { questionIds: updatedQuestionIds });
            }
        });
      }

      await batch.commit();

      toast({
        title: t('upload_successful_title'),
        description: t('upload_successful_desc', { count: questions.length }),
      });
      setJsonInput('');
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

  if (isUserLoading || isProfileLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!userProfile?.isAdmin) {
    return <div className="container mx-auto p-4">You are not authorized to view this page.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{t('upload_class_wise_mcqs')}</CardTitle>
          <CardDescription>
            {t('upload_class_wise_mcqs_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t('submitting') : t('submit_questions')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
