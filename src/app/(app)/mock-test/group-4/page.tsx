'use client';
    
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { UserTestAttempt } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { generateGroup4MockTest } from './actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function Group4MockTestPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const completedAttemptsQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/testAttempts`),
            where('status', '==', 'completed')
        );
    }, [user, firestore]);
    const { data: completedAttempts, isLoading: isLoadingAttempts } = useCollection<UserTestAttempt>(completedAttemptsQuery);

    const handleGenerateTest = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication required', description: 'You must be logged in to generate a mock test.' });
            return;
        }

        const correctlyAnsweredIds = new Set<string>();
        if (completedAttempts) {
            completedAttempts.forEach(attempt => {
                if (attempt.correctlyAnsweredQuestionIds) {
                    attempt.correctlyAnsweredQuestionIds.forEach((id: string) => correctlyAnsweredIds.add(id));
                }
            });
        }

        startTransition(async () => {
            const result = await generateGroup4MockTest(user.uid, Array.from(correctlyAnsweredIds));
            if (result.error) {
                toast({ variant: 'destructive', title: 'Error Generating Test', description: result.error });
            } else if (result.testId) {
                toast({ title: 'Test Generated!', description: 'Redirecting you to your mock test...' });
                router.push(`/test/${result.testId}`);
            }
        });
    };

    const isGenerating = isPending || isLoadingAttempts;

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="mb-8">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/exam-wise/group-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Group IV
                    </Link>
                </Button>
                <h1 className="text-3xl md:text-4xl font-bold">Group IV - Mock Test Generator</h1>
                <p className="text-muted-foreground mt-2">Generate a full-length mock test based on the official Group IV syllabus distribution.</p>
            </div>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Generate New Mock Test</CardTitle>
                    <CardDescription>
                        Click the button below to create a new 200-question mock test. Questions are pulled from all available syllabus units. Previously answered questions will not be repeated until you have attempted all available questions in a unit.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Button onClick={handleGenerateTest} disabled={isGenerating} size="lg">
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Test...
                            </>
                        ) : (
                            "Generate Group IV Mock Test"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
