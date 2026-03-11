'use client';
    
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import type { Test, UserTestAttempt } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useTransition, useMemo, useEffect } from 'react';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Configuration for the mock test structure.
const MOCK_TEST_CONFIG = [
    { part: 'பகுதி இ', unit: 'அலகு I', unitName: 'இலக்கணம்', count: 25 },
    { part: 'பகுதி இ', unit: 'அலகு II', unitName: 'சொல்லகராதி', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு III', unitName: 'எழுதும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு IV', unitName: 'கலைச் சொற்கள்', count: 10 },
    { part: 'பகுதி இ', unit: 'அலகு V', unitName: 'வாசித்தல் – புரிந்து கொள்ளும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு VI', unitName: 'எளிய மொழி பெயர்ப்பு', count: 5 },
    { part: 'பகுதி இ', unit: 'அலகு VII', unitName: 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்', count: 15 },
    { part: 'பகுதி அ', unit: 'அலகு I', unitName: 'பொது அறிவியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு II', unitName: 'புவியியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு III', unitName: 'இந்தியாவின் வரலாறு, பண்பாடு மற்றும் இந்திய தேசிய இயக்கம்', count: 10 },
    { part: 'பகுதி அ', unit: 'அலகு IV', unitName: 'இந்திய ஆட்சியியல்', count: 15 },
    { part: 'பகுதி அ', unit: 'அலகு V', unitName: 'இந்தியப் பொருளாதாரம் மற்றும் தமிழ்நாட்டில் வளர்ச்சி நிர்வாகம்', count: 20 },
    { part: 'பகுதி அ', unit: 'அலகு VI', unitName: 'தமிழ்நாட்டின் வரலாறு, பண்பாடு, மரபு மற்றும் சமூக - அரசியல் இயக்கங்கள்', count: 20 },
    { part: 'பகுதி ஆ', unit: 'அலகு I', unitName: 'திறனறிவு', count: 15 },
    { part: 'பகுதி ஆ', unit: 'அலகு II', unitName: 'காரணவியல்', count: 10 },
];

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


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
    const { data: completedAttempts, isLoading: isLoadingCompleted } = useCollection<UserTestAttempt>(completedAttemptsQuery);
    
    const inProgressMockTestQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, `users/${user.uid}/testAttempts`),
            where('isMockTest', '==', true),
            where('status', '==', 'in-progress')
        );
    }, [user, firestore]);
    const { data: inProgressMockTests, isLoading: isLoadingInProgress } = useCollection<UserTestAttempt>(inProgressMockTestQuery);

    const inProgressTest = useMemo(() => inProgressMockTests?.[0], [inProgressMockTests]);

    const handleGenerateTest = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Authentication required', description: 'You must be logged in to generate a mock test.' });
            return;
        }

        startTransition(async () => {
            try {
                toast({ title: 'Generating Test...', description: 'Please wait while we assemble your mock test. This may take a moment.' });
                
                // 1. Get all question IDs the user has answered correctly before.
                const correctlyAnsweredIds = new Set<string>();
                if (completedAttempts) {
                    completedAttempts.forEach(attempt => {
                        if (attempt.correctlyAnsweredQuestionIds) {
                            attempt.correctlyAnsweredQuestionIds.forEach((id: string) => correctlyAnsweredIds.add(id));
                        }
                    });
                }

                // 2. Fetch all tests relevant to Group IV syllabus.
                const testsRef = collection(firestore, 'tests');
                const testsQuery = query(testsRef, where('examGroup', '==', 'Group IV'));
                const testsSnapshot = await getDocs(testsQuery);
                const allGroupIVTests = testsSnapshot.docs.map(doc => doc.data() as Test);
                
                // 3. Assemble question IDs based on the config.
                const allMockQuestionIds: string[] = [];

                for (const config of MOCK_TEST_CONFIG) {
                    // Find all source question IDs for the current config topic.
                    const sourceQuestionIds = new Set<string>();
                    allGroupIVTests
                        .filter(test => test.syllabusPart === config.part && test.syllabusUnit === config.unit && test.syllabusUnitName === config.unitName)
                        .forEach(test => {
                            if (Array.isArray(test.questionIds)) {
                                test.questionIds.forEach(id => sourceQuestionIds.add(id));
                            }
                        });

                    let questionPool = Array.from(sourceQuestionIds);
                    // Prioritize questions the user hasn't answered correctly.
                    let availableQuestions = questionPool.filter(id => !correctlyAnsweredIds.has(id));

                    // If not enough new questions, backfill with already answered ones.
                    if (availableQuestions.length < config.count) {
                        const answeredInThisUnit = questionPool.filter(id => correctlyAnsweredIds.has(id));
                        availableQuestions.push(...shuffleArray(answeredInThisUnit));
                    }

                    // If still not enough questions, something is wrong with the data.
                    if (availableQuestions.length < config.count) {
                         toast({ variant: 'destructive', title: 'Error Generating Test', description: `Not enough questions for "${config.unitName}". Found ${availableQuestions.length}, need ${config.count}.` });
                         return;
                    }
                    
                    // Select the required number of questions randomly from the pool.
                    const selectedIds = shuffleArray(availableQuestions).slice(0, config.count);
                    allMockQuestionIds.push(...selectedIds);
                }
                
                if (allMockQuestionIds.length !== 200) {
                     toast({ variant: 'destructive', title: 'Error Generating Test', description: `Generated test has ${allMockQuestionIds.length} questions, but expected 200.` });
                     return;
                }

                // 4. Create the new mock test document in Firestore.
                const newTestRef = doc(collection(firestore, 'tests'));
                const newMockTest: Partial<Test> = {
                    id: newTestRef.id,
                    title: `Group IV Mock Test - ${new Date().toLocaleDateString()}`,
                    description: "A dynamically generated mock test for Group IV.",
                    questionIds: allMockQuestionIds,
                    examGroup: 'Group IV',
                    isMockTest: true, // This flag is important!
                };
                
                await setDoc(newTestRef, newMockTest);

                toast({ title: 'Test Generated!', description: 'Redirecting you to your mock test...' });
                router.push(`/test/${newTestRef.id}`);

            } catch (e: any) {
                console.error("Error generating mock test:", e);
                toast({ variant: 'destructive', title: 'Error Generating Test', description: e.message || "An unexpected error occurred." });
            }
        });
    };

    const isLoading = isPending || isLoadingCompleted || isLoadingInProgress;

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
                    {inProgressTest ? (
                         <CardDescription>
                            You already have a mock test in progress. Please complete it before generating a new one.
                        </CardDescription>
                    ) : (
                        <CardDescription>
                            Click the button below to create a new 200-question mock test. Questions are pulled from all available syllabus units. Previously answered questions will not be repeated until you have attempted all available questions in a unit.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="text-center">
                    {isLoading ? (
                        <Button disabled size="lg">
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking for existing tests...
                        </Button>
                    ) : inProgressTest ? (
                        <Button asChild size="lg">
                            <Link href={`/test/${inProgressTest.testId}`}>
                                Resume Mock Test <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    ) : (
                        <Button onClick={handleGenerateTest} disabled={isPending} size="lg">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Test...
                                </>
                            ) : (
                                "Generate Group IV Mock Test"
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
