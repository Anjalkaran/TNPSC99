'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { QuestionComment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';


export default function AdminCommentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const commentsQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'questionComments'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: comments, isLoading } = useCollection<QuestionComment>(commentsQuery);

  const handleResolve = async (commentId: string) => {
    if (!firestore) return;
    const commentRef = doc(firestore, 'questionComments', commentId);
    try {
      await updateDoc(commentRef, { status: 'resolved' });
      toast({ title: "Comment marked as resolved." });
    } catch (error) {
      console.error("Error resolving comment:", error);
      toast({ variant: 'destructive', title: "Error", description: "Could not update the comment." });
    }
  };
  
  const openComments = comments?.filter(c => c.status === 'open') || [];
  const resolvedComments = comments?.filter(c => c.status === 'resolved') || [];


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>User Feedback on Questions</CardTitle>
          <CardDescription>Review and manage comments submitted by users for MCQs.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="new">
                <TabsList className="mb-4">
                    <TabsTrigger value="new">New ({openComments.length})</TabsTrigger>
                    <TabsTrigger value="resolved">Resolved ({resolvedComments.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="new" className="space-y-4">
                    {isLoading && <p>Loading comments...</p>}
                    {!isLoading && openComments.length === 0 && <p className="text-muted-foreground p-4 text-center">No new comments.</p>}
                    {openComments.map(comment => (
                        <div key={comment.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">From: {comment.username}</p>
                                    <p className="text-sm text-muted-foreground">Date: {comment.createdAt ? format(new Date(comment.createdAt), 'PPp') : 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button asChild variant="outline" size="sm">
                                      <Link href={`/admin/questions/${comment.questionId}/edit`}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit Question
                                      </Link>
                                  </Button>
                                  <Button size="sm" onClick={() => handleResolve(comment.id)}>
                                      <Check className="mr-2 h-4 w-4" />
                                      Mark as Resolved
                                  </Button>
                                </div>
                            </div>
                            <p className="font-semibold mt-2 bg-muted p-2 rounded-md">Question: "{comment.questionText}"</p>
                            <p className="mt-2 whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                    ))}
                </TabsContent>
                <TabsContent value="resolved" className="space-y-4">
                     {isLoading && <p>Loading comments...</p>}
                    {!isLoading && resolvedComments.length === 0 && <p className="text-muted-foreground p-4 text-center">No resolved comments.</p>}
                    {resolvedComments.map(comment => (
                        <div key={comment.id} className="p-4 border rounded-lg bg-muted/50">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">From: {comment.username}</p>
                                    <p className="text-sm text-muted-foreground">Date: {comment.createdAt ? format(new Date(comment.createdAt), 'PPp') : 'N/A'}</p>
                                </div>
                                <Badge variant="secondary">Resolved</Badge>
                            </div>
                            <p className="font-semibold mt-2 bg-background p-2 rounded-md">Question: "{comment.questionText}"</p>
                            <p className="mt-2 text-muted-foreground italic whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                    ))}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
