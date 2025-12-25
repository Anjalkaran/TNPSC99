'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { UserTestAttempt, Test } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit } from 'lucide-react';

interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  totalScore: number;
  totalQuestionsAttempted: number;
  averageScore: number;
  proficiency: number;
}

export default function PerformancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [performanceData, setPerformanceData] = useState<SubjectPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const testAttemptsCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/testAttempts`) : null, 
    [user, firestore]
  );
  
  const { data: testAttempts, isLoading: attemptsLoading } = useCollection<UserTestAttempt>(testAttemptsCollection);

  useEffect(() => {
    if (attemptsLoading || !firestore) return;

    const calculatePerformance = async () => {
        setIsLoading(true);
        if (!testAttempts || testAttempts.length === 0) {
            setPerformanceData([]);
            setIsLoading(false);
            return;
        }

        // 1. Get all unique test IDs from attempts
        const testIds = [...new Set(testAttempts.map(attempt => attempt.testId))];

        // 2. Fetch all corresponding test documents
        const testsMap = new Map<string, Test>();
        if(testIds.length > 0) {
            const testsQuery = query(collection(firestore, 'tests'), where('__name__', 'in', testIds));
            const testsSnapshot = await getDocs(testsQuery);
            testsSnapshot.forEach(doc => {
                testsMap.set(doc.id, doc.data() as Test);
            });
        }
       

        // 3. Aggregate performance by subject
        const subjectStats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number, subjectName: string } } = {};

        testAttempts.forEach(attempt => {
            const test = testsMap.get(attempt.testId);
            if (test && test.subjectId) {
                const subjectId = test.subjectId;
                const subjectName = test.title.split(' - ')[1] || test.subjectId; // Heuristic for name
                
                if (!subjectStats[subjectId]) {
                    subjectStats[subjectId] = { totalScore: 0, totalAttempts: 0, totalQuestions: 0, subjectName };
                }

                subjectStats[subjectId].totalScore += attempt.score;
                subjectStats[subjectId].totalAttempts += 1;
                subjectStats[subjectId].totalQuestions += attempt.answers.length;
            }
        });
        
        // 4. Format for display
        const formattedData: SubjectPerformance[] = Object.entries(subjectStats).map(([subjectId, stats]) => {
            const averageScore = stats.totalAttempts > 0 ? stats.totalScore / stats.totalAttempts : 0;
            const proficiency = stats.totalQuestions > 0 ? (stats.totalScore / stats.totalQuestions) * 100 : 0;
            return {
                subjectId,
                subjectName: stats.subjectName,
                totalAttempts: stats.totalAttempts,
                totalScore: stats.totalScore,
                totalQuestionsAttempted: stats.totalQuestions,
                averageScore,
                proficiency,
            };
        }).sort((a, b) => b.proficiency - a.proficiency); // Sort by proficiency

        setPerformanceData(formattedData);
        setIsLoading(false);
    }

    calculatePerformance();

  }, [testAttempts, attemptsLoading, firestore]);

  if (isUserLoading || isLoading) {
    return <div className="container mx-auto p-4">Loading performance data...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Please log in to view your performance.</div>;
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">{t('performance')}</h1>
            <p className="text-muted-foreground mt-2">உங்கள் பாடம் வாரியான செயல்திறனைக் கண்காணித்து, உங்கள் பலம் மற்றும் பலவீனங்களைக் கண்டறியவும்.</p>
        </div>

      {performanceData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {performanceData.map(subjectPerf => (
                <Card key={subjectPerf.subjectId}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">{subjectPerf.subjectName}</CardTitle>
                        <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{subjectPerf.proficiency.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                           சராசரி மதிப்பெண்: {subjectPerf.averageScore.toFixed(1)} on {subjectPerf.totalAttempts} {subjectPerf.totalAttempts > 1 ? 'attempts' : 'attempt'}
                        </p>
                        <div className="mt-4">
                            <Progress value={subjectPerf.proficiency} className="h-2" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">தரவு இல்லை</h3>
            <p className="text-muted-foreground mt-2">உங்கள் செயல்திறன் பகுப்பாய்வைக் காண சில தேர்வுகளை எடுக்கத் தொடங்குங்கள்.</p>
        </div>
      )}
    </div>
  );
}
