'use client';

import { useRouter, notFound, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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

const questionEditSchema = z.object({
  text: z.string().min(1, 'Question text is required.'),
  answerOptions: z.array(z.string().min(1, 'Option text cannot be empty.')).min(2, 'Must have at least two options.'),
  correctAnswerIndex: z.coerce.number().min(0, 'Please select a correct answer.'),
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
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'answerOptions',
  });
  
  useEffect(() => {
    if (question) {
      form.reset({
        text: question.text,
        answerOptions: question.answerOptions,
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation || '',
        reference: question.reference || '',
      });
    }
  }, [question, form]);


  const onSubmit = async (values: QuestionEditFormValues) => {
    if (!questionRef) return;
    
    try {
      await updateDoc(questionRef, values);
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

  if (isQuestionLoading) {
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
    return notFound();
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

              <FormItem>
                <FormLabel>Answer Options</FormLabel>
                <RadioGroup 
                    onValueChange={(val) => form.setValue('correctAnswerIndex', parseInt(val))}
                    value={String(form.watch('correctAnswerIndex'))}
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
                            name={`answerOptions.${index}`}
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
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append('')}>
                    Add Option
                </Button>
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
              
              <div className="flex justify-end gap-2">
                 <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
