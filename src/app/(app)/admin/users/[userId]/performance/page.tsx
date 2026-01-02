'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { UserTestAttempt, Test } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Sparkles, Target, TrendingUp, BookCheck } from 'lucide-react';
import { analyzePerformance, type PerformanceInput, type PerformanceOutput } from '@/ai/flows/performance-analysis-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useParams } from 'next/navigation';


interface SubjectPerformance {
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  totalScore: number;
  totalQuestionsAttempted: number;
  averageScore: number;
  proficiency: number;
}

function AiAnalysis({ performanceData }: { performanceData: SubjectPerformance[] }) {
    const { t, language } = useTranslation();
    const [analysis, setAnalysis] = useState<PerformanceOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(performanceData.length === 0) {
            setIsLoading(false);
            return;
        }

        const runAnalysis = async () => {
            setIsLoading(true);
            try {
                const input: PerformanceInput = {
                    subjects: performanceData.map(p => ({
                        name: p.subjectName,
                        proficiency: p.proficiency,
                        attempts: p.totalAttempts,
                    })),
                    language: language,
                };
                const result = await analyzePerformance(input);
                setAnalysis(result);
            } catch (error) {
                console.error("Error analyzing performance:", error);
                setAnalysis(null);
            } finally {
                setIsLoading(false);
            }
        };

        runAnalysis();
    }, [performanceData, language]);
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {t('ai_performance_analysis')}
                    </CardTitle>
                    <CardDescription>{t('ai_performance_analysis_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </CardContent>
            </Card>
        );
    }
    
    if (!analysis) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('ai_performance_analysis')}
                </CardTitle>
                <CardDescription>{analysis.overallSummary}</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><TrendingUp className="text-green-500" /> {t('strengths')}</h3>
                        {analysis.strengths.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {analysis.strengths.map(s => <li key={s}>{s}</li>)}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">{t('no_strengths_yet')}</p>}
                    </div>
                     <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><Target className="text-red-500" /> {t('areas_for_improvement')}</h3>
                         {analysis.weaknesses.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {analysis.weaknesses.map(w => <li key={w}>{w}</li>)}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">{t('no_weaknesses_found')}</p>}
                    </div>
                </div>
                 <div className="space-y-4">
                     <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-2"><BookCheck className="text-blue-500" /> {t('actionable_advice')}</h3>
                         {analysis.recommendations.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {analysis.recommendations.map(r => <li key={r}>{r}</li>)}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground">{t('keep_up_effort')}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function UserPerformancePage() {
  const firestore = useFirestore();
  const { t } = useTranslation();
  const params = useParams();
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : undefined;

  const [performanceData, setPerformanceData] = useState<SubjectPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const testAttemptsCollection = useMemoFirebase(() => 
    userId ? collection(firestore, `users/${userId}/testAttempts`) : null, 
    [userId, firestore]
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

        const testIds = [...new Set(testAttempts.map(attempt => attempt.testId))];
        const testsMap = new Map<string, Test>();
        
        if(testIds.length > 0) {
            const testIdChunks = [];
            for (let i = 0; i < testIds.length; i += 30) {
                testIdChunks.push(testIds.slice(i, i + 30));
            }
            
            for(const chunk of testIdChunks) {
                const testsQuery = query(collection(firestore, 'tests'), where('__name__', 'in', chunk));
                const testsSnapshot = await getDocs(testsQuery);
                testsSnapshot.forEach(doc => {
                    testsMap.set(doc.id, doc.data() as Test);
                });
            }
        }
       
        const subjectStats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number, subjectName: string } } = {};

        testAttempts.forEach(attempt => {
            const test = testsMap.get(attempt.testId);
            if (test && test.subjectId) {
                const subjectId = test.subjectId;
                const subjectName = test.title.split(' - ')[1] || test.subjectId;
                
                if (!subjectStats[subjectId]) {
                    subjectStats[subjectId] = { totalScore: 0, totalAttempts: 0, totalQuestions: 0, subjectName };
                }

                subjectStats[subjectId].totalScore += attempt.score;
                subjectStats[subjectId].totalAttempts += 1;
                subjectStats[subjectId].totalQuestions += Array.isArray(attempt.answers) ? attempt.answers.length : 0;
            }
        });
        
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
        }).sort((a, b) => b.proficiency - a.proficiency);

        setPerformanceData(formattedData);
        setIsLoading(false);
    }

    calculatePerformance();

  }, [testAttempts, attemptsLoading, firestore]);
  
  const chartData = useMemo(() => performanceData.map(p => ({
    name: p.subjectName,
    proficiency: p.proficiency,
  })).reverse(), [performanceData]);

  if (isLoading) {
    return <div className="text-center p-8">{t('loading_performance_data')}</div>;
  }

  return (
    <div className="space-y-8">
      <AiAnalysis performanceData={performanceData} />

      {performanceData.length > 0 ? (
          <Card>
              <CardHeader>
                  <CardTitle>{t('subject_wise_proficiency')}</CardTitle>
                  <CardDescription>{t('subject_wise_proficiency_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                  <ChartContainer config={{
                      proficiency: {
                          label: t('proficiency'),
                          color: "hsl(var(--primary))",
                      },
                  }} className="h-[500px] w-full">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 50 }}>
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" dataKey="proficiency" unit="%" />
                          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={10} width={150} />
                          <ChartTooltip 
                              content={<ChartTooltipContent 
                                  nameKey="proficiency"
                                  labelKey="name"
                                  indicator="dot"
                                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                              />}
                          />
                          <Bar dataKey="proficiency" fill="var(--color-proficiency)" radius={4} />
                      </BarChart>
                  </ChartContainer>
              </CardContent>
          </Card>
      ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">No Performance Data</h3>
              <p className="text-muted-foreground mt-2">This user has not attempted any tests yet.</p>
          </div>
      )}
    </div>
  );
}
