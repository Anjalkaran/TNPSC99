'use client';

import { useRouter, notFound, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, arrayRemove, deleteField } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Question } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash } from 'lucide-react';
import { useEffect } from 'react';
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

const questionEditSchema = z.object({
  text: z.string().min(1, 'Question text is required.'),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  answerOptions: z.array(z.object({ text: z.string().min(1, 'Option text cannot be empty.') })).min(2, 'Must have at least two options.'),
  correctAnswer: z.string({ required_error: 'Please select a correct answer.'}).min(1, 'Please select a correct answer.'),
  explanation: z.string().optional(),
  reference: z.string().optional(),
});

type QuestionEditFormValues = z.infer<typeof questionEditSchema>;

export default function EditQuestionPage() {
  const params = useParams();
  const questionId = params.questionId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const questionRef = useMemoFirebase(() => (firestore && questionId ? doc(firestore, 'questions', questionId) : null), [firestore, questionId]);
  const { data: question, isLoading: isQuestionLoading } = useDoc<Question>(questionRef);

  const form = useForm<QuestionEditFormValues>({
    resolver: zodResolver(questionEditSchema),
    defaultValues: {
      text: '',
      imageUrl: '',
      answerOptions: [],
      correctAnswer: '',
      explanation: '',
      reference: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'answerOptions',
  });
  
  useEffect(() => {
    if (question) {
      form.reset({
        text: question.text,
        imageUrl: question.imageUrl || '',
        answerOptions: question.answerOptions.map(opt => ({ text: opt })),
        correctAnswer: question.correctAnswer || '',
        explanation: question.explanation || '',
        reference: question.reference || '',
      });
    }
  }, [question, form]);


  const onSubmit = async (values: QuestionEditFormValues) => {
    if (!questionRef) return;
    
    const { answerOptions, ...rest } = values;

    const valuesToSubmit: { [key: string]: any } = {
        ...rest,
        answerOptions: answerOptions.map(opt => opt.text),
        correctAnswerIndex: deleteField()
    };
    
    if (values.imageUrl) {
        valuesToSubmit.imageUrl = values.imageUrl;
    } else {
        valuesToSubmit.imageUrl = deleteField();
    }

    try {
      await updateDoc(questionRef, valuesToSubmit);
      toast({
        title: 'Question Updated',
        description: 'The question has been successfully updated.',
      });
      router.back(); // Go back to the comments page
    } catch (error: any) {
      console.error('Error updating question:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'Could not update the question.',
      });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !questionId) return;

    try {
        const batch = writeBatch(firestore);

        // Find all tests containing the question
        const testsRef = collection(firestore, 'tests');
        const q = query(testsRef, where('questionIds', 'array-contains', questionId));
        const testSnapshots = await getDocs(q);

        // For each test, remove the questionId from its questionIds array
        testSnapshots.forEach(testDoc => {
            batch.update(testDoc.ref, {
                questionIds: arrayRemove(questionId)
            });
        });
        
        // Delete the question document itself
        if (questionRef) {
          batch.delete(questionRef);
        }
        
        await batch.commit();
        
        toast({
            title: "Question Deleted",
            description: "The question and its references in tests have been deleted.",
        });

        router.back();

    } catch (error: any) {
        console.error("Error deleting question:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error.message || "Could not delete the question.",
        });
    }
  };

  const pageIsLoading = isQuestionLoading || !questionId;

  if (pageIsLoading) {
    return (
        <div className="container mx-auto p-8 space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
  }

  if (!question) {
    return (
        <div className="container mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Question Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The question with ID <code className="bg-muted p-1 rounded-sm">{questionId}</code> could not be found.</p>
                    <p className="text-muted-foreground mt-2">It may have been deleted or the link might be incorrect.</p>
                    <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Question</CardTitle>
          <CardDescription>Make corrections to the question details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Answer Options</FormLabel>
                 <RadioGroup 
                    onValueChange={(val) => {
                        const newIndex = parseInt(val, 10);
                        const options = form.getValues('answerOptions');
                        if (options && options[newIndex]) {
                            form.setValue('correctAnswer', options[newIndex].text);
                        }
                    }}
                    value={String(form.getValues('answerOptions').findIndex(opt => opt.text === form.watch('correctAnswer')))}
                >
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                        <FormControl>
                            <RadioGroupItem value={String(index)} id={`correct-option-${index}`} />
                        </FormControl>
                        <Label htmlFor={`correct-option-${index}`} className="sr-only">Set as correct answer</Label>
                        <FormField
                            control={form.control}
                            name={`answerOptions.${index}.text`}
                            render={({ field }) => (
                            <Input {...field} />
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                            <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                        </div>
                    ))}
                    </div>
                </RadioGroup>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ text: '' })}>
                    Add Option
                </Button>
                 <FormMessage>{form.formState.errors.correctAnswer?.message}</FormMessage>
              </FormItem>
              
              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explanation</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-between items-center pt-4">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete Question
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this question
                                and remove it from all tests it belongs to.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
