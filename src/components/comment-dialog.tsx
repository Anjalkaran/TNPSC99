'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { Question, QuestionComment } from '@/lib/types';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

const commentSchema = z.object({
  comment: z.string().min(10, { message: 'Comment must be at least 10 characters.' }).max(500, { message: 'Comment must not exceed 500 characters.' }),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  question: Question | null;
}

export function CommentDialog({ isOpen, onOpenChange, question }: CommentDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { comment: '' },
  });

  const onSubmit = async (values: CommentFormValues) => {
    if (!user || !firestore || !question) return;

    setIsSubmitting(true);
    
    const commentsCollectionRef = collection(firestore, 'questionComments');
    const newComment: Omit<QuestionComment, 'id'> = {
        questionId: question.id,
        questionText: question.text,
        userId: user.uid,
        username: user.displayName || user.email || 'Anonymous',
        comment: values.comment,
        status: 'open',
        createdAt: new Date().toISOString(),
    };
    
    try {
      await addDoc(commentsCollectionRef, newComment);
      
      toast({
        title: "Comment Submitted",
        description: "Thank you for your feedback. An admin will review it shortly.",
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      
      const isPermissionError = error?.code === 'permission-denied';
      
      if (isPermissionError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: commentsCollectionRef.path,
          operation: 'create',
          requestResourceData: newComment,
        }));
      }

      toast({
        variant: 'destructive',
        title: isPermissionError ? "Permission Denied" : "Submission Failed",
        description: isPermissionError 
          ? "You don't have permission to submit comments. This might be due to outdated security rules on the server."
          : (error?.message || "Could not submit your comment. Please try again later."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue or Add a Comment</DialogTitle>
          <DialogDescription>
            Found an error in this question or have a suggestion? Let us know. Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>
        {question && <p className="text-sm font-medium bg-muted p-2 rounded-md">Question: {question.text}</p>}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Comment</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the issue or your suggestion..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Comment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
