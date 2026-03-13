'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, where, deleteDoc } from 'firebase/firestore';
import type { BookmarkedQuestion, Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bookmark, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function BookmarksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const bookmarksCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/bookmarkedQuestions`) : null, 
    [user, firestore]
  );
  
  const bookmarksQuery = useMemoFirebase(() => 
    bookmarksCollection ? query(bookmarksCollection, orderBy('createdAt', 'desc')) : null,
    [bookmarksCollection]
  );

  const { data: bookmarks, isLoading: bookmarksLoading } = useCollection<BookmarkedQuestion>(bookmarksQuery);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  useEffect(() => {
    if (!bookmarks || bookmarks.length === 0 || !firestore) {
        setQuestions([]);
        return;
    };
    
    const fetchQuestions = async () => {
        setIsLoadingQuestions(true);
        const questionIds = bookmarks.map(b => b.questionId);
        const fetchedQuestions: Question[] = [];
        
        // Firestore 'in' query limit is 30
        const chunks = [];
        for (let i = 0; i < questionIds.length; i += 30) {
            chunks.push(questionIds.slice(i, i + 30));
        }
        
        for (const chunk of chunks) {
            if (chunk.length > 0) {
                const q = query(collection(firestore, 'questions'), where('__name__', 'in', chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(doc => {
                    fetchedQuestions.push({ id: doc.id, ...doc.data() } as Question);
                });
            }
        }
        
        // Preserve bookmark order
        const questionMap = new Map(fetchedQuestions.map(q => [q.id, q]));
        const sortedQuestions = bookmarks.map(b => questionMap.get(b.questionId)).filter(Boolean) as Question[];

        setQuestions(sortedQuestions);
        setIsLoadingQuestions(false);
    };

    fetchQuestions();
  }, [bookmarks, firestore]);

  const removeBookmark = async (questionId: string) => {
    if (!user || !firestore) return;
    const bookmarksRef = collection(firestore, `users/${user.uid}/bookmarkedQuestions`);
    const q = query(bookmarksRef, where('questionId', '==', questionId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
    });
    toast({ description: "Bookmark removed." });
    // The collection listener will automatically update the UI
  };

  const isLoading = isUserLoading || bookmarksLoading || isLoadingQuestions;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bookmark className="h-6 w-6"/> Bookmarked Questions</CardTitle>
          <CardDescription>Review questions you've saved for later.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading bookmarks...</p>
          ) : questions.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4">
              {questions.map((q, index) => (
                <AccordionItem value={q.id} key={q.id} className="border-b-0">
                    <Card>
                        <CardHeader className="p-4">
                           <div className="flex justify-between items-start gap-4">
                             <AccordionTrigger className="text-left font-semibold flex-1 hover:no-underline p-0">
                                {index + 1}. {q.text}
                             </AccordionTrigger>
                             <Button variant="ghost" size="icon" onClick={() => removeBookmark(q.id)} aria-label="Remove bookmark">
                                <Bookmark className="h-5 w-5 fill-primary text-primary" />
                             </Button>
                           </div>
                        </CardHeader>
                        <AccordionContent>
                           <div className="px-4 pb-4">
                             <div className="space-y-2">
                                {q.answerOptions.map((option, i) => {
                                    const isCorrectAnswer = option === q.correctAnswer;
                                    return (
                                        <div key={i} className={`p-2 rounded-md ${isCorrectAnswer ? 'bg-green-100 dark:bg-green-900' : 'bg-muted/50'}`}>
                                            <p className={`font-medium ${isCorrectAnswer ? 'text-green-800 dark:text-green-200' : ''}`}>
                                                {option} {isCorrectAnswer && '(Correct Answer)'}
                                            </p>
                                        </div>
                                    )
                                })}
                             </div>
                             {q.explanation && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800 flex gap-2">
                                    <Info className="h-4 w-4 flex-shrink-0 text-blue-600 mt-1" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Explanation</h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-400">{q.explanation}</p>
                                    </div>
                                </div>
                             )}
                           </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">You haven't bookmarked any questions yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
