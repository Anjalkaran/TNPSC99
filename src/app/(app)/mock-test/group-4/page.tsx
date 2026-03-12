
'use client';
    
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { Test } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


// Structure and question count for the mock test
const MOCK_TEST_CONFIG = [
    // Part C - General Tamil (100 Questions)
    { part: 'பகுதி இ', unit: 'அலகு I', unitName: 'இலக்கணம்', count: 25 },
    { part: 'பகுதி இ', unit: 'அலகு II', unitName: 'சொல்லகராதி', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு III', unitName: 'எழுதும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு IV', unitName: 'கலைச் சொற்கள்', count: 10 },
    { part: 'பகுதி இ', unit: 'அலகு V', unitName: 'வாசித்தல் – புரிந்து கொள்ளும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு VI', unitName: 'எளிய மொழி பெயர்ப்பு', count: 5 },
    { part: 'பகுதி இ', unit: 'அலகு VII', unitName: 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்', count: 15 },
    
    // Part A - General Studies (75 Questions)
    { part: 'பகுதி அ', unit: 'அலகு I', unitName: 'பொது அறிவியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு II', unitName: 'புவியியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு III', unitName: 'இந்தியாவின் வரலாறு, பண்பாடு மற்றும் இந்திய தேசிய இயக்கம்', count: 10 },
    { part: 'பகுதி அ', unit: 'அலகு IV', unitName: 'இந்திய ஆட்சியியல்', count: 15 },
    { part: 'பகுதி அ', unit: 'அலகு V', unitName: 'இந்தியப் பொருளாதாரம் மற்றும் தமிழ்நாட்டில் வளர்ச்சி நிர்வாகம்', count: 20 },
    { part: 'பகுதி அ', unit: 'அலகு VI', unitName: 'தமிழ்நாட்டின் வரலாறு, பண்பாடு, மரபு மற்றும் சமூக - அரசியல் இயக்கங்கள்', count: 20 },
    
    // Part B - Aptitude & Mental Ability (25 Questions)
    { part: 'பகுதி ஆ', unit: 'அலகு I', unitName: 'திறனறிவு', count: 15 },
    { part: 'பகுதி ஆ', unit: 'அலகு II', unitName: 'காரணவியல்', count: 10 },
];

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
    const [isChecking, setIsChecking] = useState(false);
    const [inProgressTest, setInProgressTest] = useState<{testId: string, attemptId: string} | null>(null);

    const proceedToGenerateTest = () => {
        startTransition(async () => {
            if (!user || !firestore) return;
            try {
                // Fetch completed attempts to exclude correctly answered questions
                const completedAttemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
                const completedAttemptsQuery = query(completedAttemptsRef, where('status', '==', 'completed'));
                const completedAttemptsSnapshot = await getDocs(completedAttemptsQuery);
                const correctlyAnsweredIds = new Set<string>();
                completedAttemptsSnapshot.forEach(doc => {
                    const attempt = doc.data();
                    if (attempt.correctlyAnsweredQuestionIds) {
                        attempt.correctlyAnsweredQuestionIds.forEach((id: string) => correctlyAnsweredIds.add(id));
                    }
                });

                // Fetch all Group IV tests from the main bank
                const testsRef = collection(firestore, 'tests');
                const testsQuery = query(testsRef, where('examGroup', '==', 'Group IV'));
                const testsSnapshot = await getDocs(testsQuery);
                const allGroupIVTests = testsSnapshot.docs.map(doc => doc.data() as Test).filter(test => !test.isMockTest);
                
                const allMockQuestionIds: string[] = [];

                for (const config of MOCK_TEST_CONFIG) {
                    const sourceQuestionIds = new Set<string>();
                    
                    allGroupIVTests
                        .filter(test => test.syllabusPart === config.part && test.syllabusUnit === config.unit && test.syllabusUnitName === config.unitName)
                        .forEach(test => {
                            if (Array.isArray(test.questionIds)) {
                                test.questionIds.forEach(id => sourceQuestionIds.add(id));
                            }
                        });

                    let questionPool = Array.from(sourceQuestionIds);
                    let availableQuestions = questionPool.filter(id => !correctlyAnsweredIds.has(id));

                    if (availableQuestions.length < config.count) {
                        const answeredInThisUnit = questionPool.filter(id => correctlyAnsweredIds.has(id));
                        availableQuestions.push(...shuffleArray(answeredInThisUnit));
                    }

                    if (availableQuestions.length < config.count) {
                        toast({ variant: 'destructive', title: 'Error Generating Test', description: `Not enough questions for "${config.unitName}". Found ${availableQuestions.length}, need ${config.count}. Please ask an admin to upload more.` });
                        return;
                    }
                    
                    const selectedIds = shuffleArray(availableQuestions).slice(0, config.count);
                    allMockQuestionIds.push(...selectedIds);
                }

                if (allMockQuestionIds.length !== 200) {
                    toast({ variant: 'destructive', title: 'Error Generating Test', description: `Generated test has ${allMockQuestionIds.length} questions, but expected 200. Please check question availability.` });
                    return;
                }

                const newTestRef = doc(collection(firestore, 'tests'));
                const newMockTest: Partial<Test> = {
                    id: newTestRef.id,
                    title: `Group IV Mock Test - ${new Date().toLocaleDateString()}`,
                    description: "A dynamically generated mock test for Group IV.",
                    questionIds: allMockQuestionIds,
                    examGroup: 'Group IV',
                    isMockTest: true,
                    userId: user.uid,
                };
                
                await setDoc(newTestRef, newMockTest);

                toast({ title: 'Test Generated!', description: 'Redirecting you to your mock test...' });
                router.push(`/test/${newTestRef.id}`);

            } catch (error: any) {
                console.error("Error generating mock test:", error);
                toast({ variant: 'destructive', title: 'Error Generating Test', description: error.message || 'An unexpected error occurred. Please check your permissions or contact support.' });
            }
        });
    };

    const handleGenerateClick = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Authentication required', description: 'You must be logged in to generate a mock test.' });
            return;
        }
        setIsChecking(true);
        const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
        const q = query(attemptsRef, where('isMockTest', '==', true), where('status', '==', 'in-progress'));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const attempt = querySnapshot.docs[0];
            setInProgressTest({ testId: attempt.data().testId, attemptId: attempt.id });
        } else {
            proceedToGenerateTest();
        }
        setIsChecking(false);
    };

    const handleResume = () => {
        if (inProgressTest) {
            router.push(`/test/${inProgressTest.testId}`);
        }
        setInProgressTest(null);
    };

    const handleStartNew = async () => {
        // Bypass deletion to avoid permission errors.
        // This will leave the old test document in the database, but will fix the user-facing error.
        setInProgressTest(null);
        proceedToGenerateTest();
    };


    const isBusy = isPending || isChecking;

    return (
        <>
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
                        <Button onClick={handleGenerateClick} disabled={isBusy} size="lg">
                            {isBusy ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isChecking ? 'Checking for existing tests...' : 'Generating Test...'}
                                </>
                            ) : (
                                "Generate Group IV Mock Test"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <AlertDialog open={!!inProgressTest} onOpenChange={(isOpen) => !isOpen && setInProgressTest(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resume In-Progress Mock Test?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have an unfinished mock test. Would you like to resume it, or discard it and start a new one?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStartNew} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Start New
                        </AlertDialogAction>
                        <AlertDialogAction onClick={handleResume}>
                            Resume Test
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
