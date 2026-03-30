'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { UserTestAttempt, Test, Subject, Category, Unit, Class } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Sparkles, Target, TrendingUp, BookCheck, Shapes, FolderKanban, Activity, Radar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, BarChart, Bar, Legend
} from 'recharts';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetric {
  id: string;
  name: string;
  totalAttempts: number;
  totalScore: number;
  totalQuestionsAttempted: number;
  averageScore: number;
  proficiency: number;
}
interface CategoryPerformanceMetric extends PerformanceMetric {
  subjectName: string;
}
interface UnitPerformanceMetric extends PerformanceMetric {
  className: string;
  subjectName: string;
  term: string;
  unitNumber: number;
}
interface PerformanceInput {
  subjects: { name: string; proficiency: number; attempts: number }[];
  categories: { name: string; subjectName: string; proficiency: number; attempts: number }[];
  units: { name: string; className: string; subjectName: string; term: string; unitNumber: number; proficiency: number; attempts: number }[];
  language: 'en' | 'ta';
}

interface PerformanceOutput {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallSummary: string;
}


function AiAnalysis({ 
  subjectPerformance,
  categoryPerformance,
  unitPerformance
}: { 
  subjectPerformance: PerformanceMetric[],
  categoryPerformance: CategoryPerformanceMetric[],
  unitPerformance: UnitPerformanceMetric[] 
}) {
    const { t, language } = useTranslation();
    const [analysis, setAnalysis] = useState<PerformanceOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if(subjectPerformance.length === 0 && categoryPerformance.length === 0 && unitPerformance.length === 0) {
            setIsLoading(false);
            return;
        }

        const runAnalysis = async () => {
            setIsLoading(true);
            try {
                const input: PerformanceInput = {
                    subjects: subjectPerformance.map(p => ({
                        name: p.name,
                        proficiency: p.proficiency,
                        attempts: p.totalAttempts,
                    })),
                    categories: categoryPerformance.map(p => ({
                        name: p.name,
                        subjectName: p.subjectName,
                        proficiency: p.proficiency,
                        attempts: p.totalAttempts,
                    })),
                    units: unitPerformance.map(p => ({
                        name: p.name,
                        className: p.className,
                        subjectName: p.subjectName,
                        term: p.term,
                        unitNumber: p.unitNumber,
                        proficiency: p.proficiency,
                        attempts: p.totalAttempts,
                    })),
                    language: language,
                };
                
                const response = await fetch('/api/genkit/performanceAnalysisFlow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: input }),
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const result: PerformanceOutput = await response.json();
                setAnalysis(result);
            } catch (error) {
                console.error("Error analyzing performance:", error);
                const summary = language === 'ta' 
                    ? "AI நுண்ணறிவு விரைவில் கிடைக்கும்." 
                    : "AI insights will be available soon.";
                setAnalysis({
                    strengths: [],
                    weaknesses: [],
                    recommendations: [],
                    overallSummary: summary,
                });
            } finally {
                setIsLoading(false);
            }
        };

        runAnalysis();
    }, [subjectPerformance, categoryPerformance, unitPerformance, language]);
    
    if (isLoading) {
        return (
            <Card className="overflow-hidden border-none shadow-lg">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
                        {t('ai_performance_analysis')}
                    </CardTitle>
                    <CardDescription>{t('ai_performance_analysis_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
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
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-card to-secondary/20">
            <CardHeader className="bg-primary/5 pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Sparkles className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                            {t('ai_performance_analysis')}
                        </CardTitle>
                        <CardDescription className="mt-1 text-base font-medium text-foreground/80 italic">
                            "{analysis.overallSummary}"
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        AI Powered
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-4 col-span-2">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                                <h3 className="font-bold flex items-center gap-2 mb-3 text-green-600">
                                    <TrendingUp className="h-5 w-5" /> 
                                    {t('strengths')}
                                </h3>
                                {analysis.strengths.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analysis.strengths.map((s, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                                                <span>{s}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-muted-foreground italic">{t('no_strengths_yet')}</p>}
                            </div>
                            <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                                <h3 className="font-bold flex items-center gap-2 mb-3 text-red-500">
                                    <Target className="h-5 w-5" /> 
                                    {t('areas_for_improvement')}
                                </h3>
                                {analysis.weaknesses.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analysis.weaknesses.map((w, idx) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                                <span>{w}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-muted-foreground italic">{t('no_weaknesses_found')}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <h3 className="font-bold flex items-center gap-2 mb-3 text-primary">
                            <BookCheck className="h-5 w-5" /> 
                            {t('actionable_advice')}
                        </h3>
                        {analysis.recommendations.length > 0 ? (
                            <ul className="space-y-3">
                                {analysis.recommendations.map((r, idx) => (
                                    <li key={idx} className="text-sm bg-background/80 p-2 rounded-lg border border-primary/5 shadow-sm">
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted-foreground italic">{t('keep_up_effort')}</p>}
                        
                        <div className="mt-6">
                            <Button asChild className="w-full shadow-md hover:shadow-lg transition-all group">
                                <Link href="/subject-wise">
                                    <Activity className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                                    Practice Now
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function PerformancePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t, language } = useTranslation();

  const [subjectPerformance, setSubjectPerformance] = useState<PerformanceMetric[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformanceMetric[]>([]);
  const [unitPerformance, setUnitPerformance] = useState<UnitPerformanceMetric[]>([]);
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
            setSubjectPerformance([]);
            setCategoryPerformance([]);
            setUnitPerformance([]);
            setIsLoading(false);
            return;
        }

        const testIds = [...new Set(testAttempts.map(attempt => attempt.testId).filter(id => !!id))];
        const testsMap = new Map<string, Test>();
        const subjectsMap = new Map<string, Subject>();
        const categoriesMap = new Map<string, Category>();
        const unitsMap = new Map<string, Unit>();
        const classesMap = new Map<string, Class>();
        
        // Fetch all tests
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
        
        const subjectIds = new Set<string>();
        const categoryIds = new Set<string>();
        const unitIds = new Set<string>();
        testsMap.forEach(test => {
            if (test.subjectId) subjectIds.add(test.subjectId);
            if (test.categoryId) categoryIds.add(test.categoryId);
            if (test.unitId) unitIds.add(test.unitId);
        });

        // Fetch all subjects
        if (subjectIds.size > 0) {
            const idChunks = [];
            const idArray = Array.from(subjectIds);
            for (let i = 0; i < idArray.length; i += 30) {
                idChunks.push(idArray.slice(i, i + 30));
            }
            for(const chunk of idChunks) {
                if (chunk.length > 0) {
                    const subjectsQuery = query(collection(firestore, 'subjects'), where('__name__', 'in', chunk));
                    const subjectsSnapshot = await getDocs(subjectsQuery);
                    subjectsSnapshot.forEach(doc => subjectsMap.set(doc.id, doc.data() as Subject));
                }
            }
        }
        
        // Fetch all categories
        if (categoryIds.size > 0) {
            const idChunks = [];
            const idArray = Array.from(categoryIds);
            for (let i = 0; i < idArray.length; i += 30) {
                idChunks.push(idArray.slice(i, i + 30));
            }
            for(const chunk of idChunks) {
                if (chunk.length > 0) {
                    const categoriesQuery = query(collection(firestore, 'categories'), where('__name__', 'in', chunk));
                    const categoriesSnapshot = await getDocs(categoriesQuery);
                    categoriesSnapshot.forEach(doc => categoriesMap.set(doc.id, doc.data() as Category));
                }
            }
        }

        // Fetch all units
        if (unitIds.size > 0) {
            const idChunks = [];
            const idArray = Array.from(unitIds);
            for (let i = 0; i < idArray.length; i += 30) {
                idChunks.push(idArray.slice(i, i + 30));
            }
            for(const chunk of idChunks) {
                if (chunk.length > 0) {
                    const unitsQuery = query(collection(firestore, 'units'), where('__name__', 'in', chunk));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    unitsSnapshot.forEach(doc => unitsMap.set(doc.id, doc.data() as Unit));
                }
            }
        }
        
        const classIds = new Set<string>();
        unitsMap.forEach(unit => {
            if (unit.classId) classIds.add(unit.classId);
        });

        if(classIds.size > 0) {
            const idChunks = [];
            const idArray = Array.from(classIds);
            for (let i = 0; i < idArray.length; i += 30) {
                idChunks.push(idArray.slice(i, i + 30));
            }
            for(const chunk of idChunks) {
                if (chunk.length > 0) {
                    const classesQuery = query(collection(firestore, 'classes'), where('__name__', 'in', chunk));
                    const classesSnapshot = await getDocs(classesQuery);
                    classesSnapshot.forEach(doc => classesMap.set(doc.id, doc.data() as Class));
                }
            }
        }
       
        const subjectStats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number } } = {};
        const categoryStats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number } } = {};
        const unitStats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number } } = {};

        testAttempts.forEach(attempt => {
            const test = testsMap.get(attempt.testId);
            if (test) {
                const numQuestions = Array.isArray(attempt.answers) ? attempt.answers.length : 0;
                
                if (test.subjectId) {
                    if (!subjectStats[test.subjectId]) subjectStats[test.subjectId] = { totalScore: 0, totalAttempts: 0, totalQuestions: 0 };
                    subjectStats[test.subjectId].totalScore += attempt.score;
                    subjectStats[test.subjectId].totalAttempts += 1;
                    subjectStats[test.subjectId].totalQuestions += numQuestions;
                }
                
                if (test.categoryId) {
                     if (!categoryStats[test.categoryId]) categoryStats[test.categoryId] = { totalScore: 0, totalAttempts: 0, totalQuestions: 0 };
                    categoryStats[test.categoryId].totalScore += attempt.score;
                    categoryStats[test.categoryId].totalAttempts += 1;
                    categoryStats[test.categoryId].totalQuestions += numQuestions;
                }

                if (test.unitId) {
                    if (!unitStats[test.unitId]) unitStats[test.unitId] = { totalScore: 0, totalAttempts: 0, totalQuestions: 0 };
                   unitStats[test.unitId].totalScore += attempt.score;
                   unitStats[test.unitId].totalAttempts += 1;
                   unitStats[test.unitId].totalQuestions += numQuestions;
              }
            }
        });
        
        const formatSubjectData = (stats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number } }, map: Map<string, Subject>): PerformanceMetric[] => {
            return Object.entries(stats).map(([id, statData]) => {
                const item = map.get(id);
                const proficiency = statData.totalQuestions > 0 ? (statData.totalScore / statData.totalQuestions) * 100 : 0;
                return {
                    id,
                    name: item ? (language === 'ta' && item.name_ta ? item.name_ta : item.name) : id,
                    totalAttempts: statData.totalAttempts,
                    totalScore: statData.totalScore,
                    totalQuestionsAttempted: statData.totalQuestions,
                    averageScore: statData.totalAttempts > 0 ? statData.totalScore / statData.totalAttempts : 0,
                    proficiency,
                };
            }).sort((a, b) => b.proficiency - a.proficiency);
        };

        const formatCategoryData = (stats: { [key: string]: { totalScore: number, totalAttempts: number, totalQuestions: number } }, catMap: Map<string, Category>, subMap: Map<string, Subject>): CategoryPerformanceMetric[] => {
             return Object.entries(stats).map(([id, statData]) => {
                const item = catMap.get(id);
                const proficiency = statData.totalQuestions > 0 ? (statData.totalScore / statData.totalQuestions) * 100 : 0;
                const subjectName = item ? (subMap.get(item.subjectId)?.[language === 'ta' && subMap.get(item.subjectId)?.name_ta ? 'name_ta' : 'name'] || item.subjectId) : 'Unknown';
                return {
                    id,
                    name: item ? (language === 'ta' && item.name_ta ? item.name_ta : item.name) : id,
                    subjectName,
                    totalAttempts: statData.totalAttempts,
                    totalScore: statData.totalScore,
                    totalQuestionsAttempted: statData.totalQuestions,
                    averageScore: statData.totalAttempts > 0 ? statData.totalScore / statData.totalAttempts : 0,
                    proficiency,
                };
            }).sort((a, b) => b.proficiency - a.proficiency);
        }

        const formatUnitData = (stats: { [key: string]: { totalScore: number; totalAttempts: number; totalQuestions: number } }, unitMap: Map<string, Unit>, clsMap: Map<string, Class>, subMap: Map<string, Subject>): UnitPerformanceMetric[] => {
            return Object.entries(stats).map(([id, statData]) => {
                const unit = unitMap.get(id);
                const proficiency = statData.totalQuestions > 0 ? (statData.totalScore / statData.totalQuestions) * 100 : 0;
                
                const className = unit ? (clsMap.get(unit.classId)?.[language === 'ta' && clsMap.get(unit.classId)?.name_ta ? 'name_ta' : 'name'] || unit.classId) : 'Unknown';
                const subjectName = unit ? (subMap.get(unit.subjectId)?.[language === 'ta' && subMap.get(unit.subjectId)?.name_ta ? 'name_ta' : 'name'] || unit.subjectId) : 'Unknown';

                return {
                    id,
                    name: unit?.unitName || id,
                    totalAttempts: statData.totalAttempts,
                    totalScore: statData.totalScore,
                    totalQuestionsAttempted: statData.totalQuestions,
                    averageScore: statData.totalAttempts > 0 ? statData.totalScore / statData.totalAttempts : 0,
                    proficiency,
                    className: className,
                    subjectName: subjectName,
                    term: unit?.term || '',
                    unitNumber: unit?.unitNumber || 0,
                };
            }).sort((a, b) => b.proficiency - a.proficiency);
        };

        setSubjectPerformance(formatSubjectData(subjectStats, subjectsMap));
        setCategoryPerformance(formatCategoryData(categoryStats, categoriesMap, subjectsMap));
        setUnitPerformance(formatUnitData(unitStats, unitsMap, classesMap, subjectsMap));
        setIsLoading(false);
    }

    calculatePerformance();

  }, [testAttempts, attemptsLoading, firestore, language]);

  const getProficiencyClass = (proficiency: number) => {
    if (proficiency >= 80) return 'bg-green-500';
    if (proficiency >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const trendData = useMemo(() => {
    if (!testAttempts || testAttempts.length === 0) return [];
    
    // Group attempts by day for the last 14 days
    const dailyStats: Record<string, { date: string, score: number, count: number }> = {};
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = subDays(new Date(), i);
        return format(d, 'yyyy-MM-dd');
    }).reverse();

    last14Days.forEach(day => {
        dailyStats[day] = { date: day, score: 0, count: 0 };
    });

    testAttempts.forEach(attempt => {
        if (attempt.startedAt) {
          const dateStr = format(parseISO(attempt.startedAt), 'yyyy-MM-dd');
          if (dailyStats[dateStr]) {
              dailyStats[dateStr].score += attempt.score;
              dailyStats[dateStr].count += 1;
          }
        }
    });

    return last14Days.map(day => ({
        name: format(parseISO(day), 'MMM dd'),
        score: dailyStats[day].count > 0 ? Math.round(dailyStats[day].score / dailyStats[day].count) : 0
    }));
  }, [testAttempts]);

  const radarData = useMemo(() => {
    return subjectPerformance.slice(0, 6).map(p => ({
        subject: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
        A: p.proficiency,
        fullMark: 100
    }));
  }, [subjectPerformance]);

  const mockStats = useMemo(() => {
    if (!testAttempts) return { total: 0, avg: 0, max: 0, readiness: 0 };
    const mockAttempts = testAttempts.filter(a => a.isMockTest && a.status === 'completed');
    if (mockAttempts.length === 0) return { total: 0, avg: 0, max: 0, readiness: 0 };

    const total = mockAttempts.length;
    const scores = mockAttempts.map(a => a.score);
    const avg = scores.reduce((a, b) => a + b, 0) / total;
    const max = Math.max(...scores);
    
    // Readiness based on average of last 3 mock tests
    const last3 = mockAttempts
      .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime())
      .slice(0, 3);
    const last3Avg = last3.length > 0 
      ? last3.reduce((acc, curr) => acc + curr.score, 0) / last3.length 
      : 0;
    
    // Convert to percentage (assuming 200 questions for Group IV mock)
    // Actually, let's use the average proficiency if possible, but score is absolute questions.
    // Let's assume most mock tests are 200 questions for TNPSC.
    const readiness = (last3Avg / 200) * 100;

    return { total, avg, max, readiness };
  }, [testAttempts]);

  const mockTrendData = useMemo(() => {
    if (!testAttempts) return [];
    return testAttempts
      .filter(a => a.isMockTest && a.status === 'completed')
      .sort((a, b) => new Date(a.startedAt || 0).getTime() - new Date(b.startedAt || 0).getTime())
      .slice(-10) // Last 10 mock tests
      .map((a, idx) => ({
        index: idx + 1,
        score: a.score,
        date: a.startedAt ? format(parseISO(a.startedAt), 'MMM dd') : `Test ${idx + 1}`,
      }));
  }, [testAttempts]);

  const recentMockTests = useMemo(() => {
    if (!testAttempts) return [];
    return testAttempts
      .filter(a => a.isMockTest)
      .sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime())
      .slice(0, 5);
  }, [testAttempts]);

  if (isUserLoading || isLoading) {
    return (
        <div className="container mx-auto p-4 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid md:grid-cols-2 gap-8">
                <Skeleton className="h-80 w-full rounded-xl" />
                <Skeleton className="h-80 w-full rounded-xl" />
            </div>
        </div>
    );
  }

  if (!user) {
    return <div className="container mx-auto p-4">{t('login_to_view_performance')}</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-10 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {t('performance')}
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">{t('performance_desc')}</p>
            </div>
            
            <div className="flex gap-2">
                <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex flex-col items-center">
                    <span className="text-xs uppercase font-bold text-primary/70 tracking-widest">Tests</span>
                    <span className="text-2xl font-black text-primary">{testAttempts?.length || 0}</span>
                </div>
                <div className="bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/20 flex flex-col items-center">
                    <span className="text-xs uppercase font-bold text-green-600 tracking-widest">Avg score</span>
                    <span className="text-2xl font-black text-green-600">
                        {testAttempts && testAttempts.length > 0
                            ? Math.round(testAttempts.reduce((acc, curr) => acc + curr.score, 0) / testAttempts.length)
                            : 0}%
                    </span>
                </div>
            </div>
        </div>
        
        <AiAnalysis 
            subjectPerformance={subjectPerformance}
            categoryPerformance={categoryPerformance}
            unitPerformance={unitPerformance}
        />
        
        {/* Mock Test Insights Section */}
        {mockStats.total > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                {t('mock_test_insights')}
            </h2>
            
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-bold tracking-wider">{t('total_mock_attempts')}</CardDescription>
                        <CardTitle className="text-3xl text-primary">{mockStats.total}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-primary/5 border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-bold tracking-wider">{t('average_mock_score')}</CardDescription>
                        <CardTitle className="text-3xl text-primary">{mockStats.avg.toFixed(1)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-primary/5 border-primary/10 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-bold tracking-wider">{t('highest_mock_score')}</CardDescription>
                        <CardTitle className="text-3xl text-primary">{mockStats.max}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-green-500/10 border-green-500/20 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase font-bold tracking-wider text-green-700">{t('mock_readiness')}</CardDescription>
                        <CardTitle className="text-3xl text-green-600">{mockStats.readiness.toFixed(0)}%</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2">
                        <Progress value={mockStats.readiness} className="h-1.5 bg-green-200" indicatorClassName="bg-green-500" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-secondary/10">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                            {t('mock_test_trend')}
                        </CardTitle>
                        <CardDescription>{t('last_10_mock_performance')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="hsl(var(--muted-foreground))" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                    />
                                    <YAxis 
                                        stroke="hsl(var(--muted-foreground))" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        domain={[0, 200]}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                        itemStyle={{ color: 'hsl(var(--primary))' }}
                                    />
                                    <Bar 
                                        dataKey="score" 
                                        fill="hsl(var(--primary))" 
                                        radius={[4, 4, 0, 0]} 
                                        barSize={30}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-secondary/10">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BookCheck className="h-5 w-5 text-secondary-foreground" />
                            {t('recent_mock_tests')}
                        </CardTitle>
                        <CardDescription>{t('track_your_full_exams')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {recentMockTests.map((mock) => (
                                <div key={mock.id} className="p-4 flex justify-between items-center bg-card hover:bg-accent/50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{mock.testTitle}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-muted-foreground">
                                                {mock.startedAt ? format(parseISO(mock.startedAt), 'PPP p') : 'Unknown Date'}
                                            </p>
                                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4 leading-none uppercase", 
                                                mock.status === 'completed' ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'
                                            )}>
                                                {mock.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-primary">{mock.score}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{t('score')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="text-primary" /> Performance Trend</CardTitle>
                    <CardDescription>Your average score over the last 14 days.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}}
                                domain={[0, 100]}
                            />
                            <RechartsTooltip 
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--background))', 
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    padding: '8px'
                                }} 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorScore)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Radar className="text-blue-500" /> Subject Proficiency</CardTitle>
                    <CardDescription>Comparative view of top subjects.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] w-full pt-4">
                    {radarData.length >= 3 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                <PolarAngleAxis 
                                    dataKey="subject" 
                                    tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 10}} 
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <RechartsRadar
                                    name="Proficiency"
                                    dataKey="A"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.5}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <Shapes className="h-12 w-12 text-muted-foreground/30 mb-2" />
                            <p className="text-sm text-muted-foreground">Attempt tests in at least 3 subjects to see the radar map.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5">
                    <CardTitle className="flex items-center gap-2"><Shapes className="text-primary" /> {t('subject_wise_proficiency')}</CardTitle>
                    <CardDescription>{t('subject_wise_proficiency_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    {subjectPerformance.map(p => (
                    <div key={p.id} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="font-semibold text-sm group-hover:text-primary transition-colors">{p.name}</span>
                            <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                p.proficiency >= 80 ? "bg-green-100 text-green-700" : 
                                p.proficiency >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                            )}>
                                {p.proficiency.toFixed(0)}%
                            </span>
                        </div>
                        <Progress value={p.proficiency} indicatorClassName={getProficiencyClass(p.proficiency)} className="h-2" />
                    </div>
                    ))}
                    {subjectPerformance.length === 0 && (
                         <div className="text-center py-8 text-muted-foreground italic">No subject data yet.</div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-blue-500/5">
                    <CardTitle className="flex items-center gap-2"><FolderKanban className="text-blue-500" /> Category-wise Proficiency</CardTitle>
                    <CardDescription>Detailed breakdown by syllabus category.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    {categoryPerformance.slice(0, 8).map(p => (
                    <div key={p.id} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm group-hover:text-primary transition-colors">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{p.subjectName}</span>
                            </div>
                            <span className="text-xs font-bold">{p.proficiency.toFixed(0)}%</span>
                        </div>
                        <Progress value={p.proficiency} indicatorClassName={getProficiencyClass(p.proficiency)} className="h-1.5" />
                    </div>
                    ))}
                    {categoryPerformance.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground italic">No category data yet.</div>
                    )}
                    {categoryPerformance.length > 8 && (
                        <p className="text-center text-xs text-muted-foreground mt-4">And {categoryPerformance.length - 8} more categories...</p>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {(subjectPerformance.length === 0 && categoryPerformance.length === 0) && (
            <div className="text-center py-20 bg-background rounded-3xl border-2 border-dashed border-muted shadow-inner">
                <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="h-10 w-10 text-primary animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold">{t('no_performance_data_title')}</h3>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">{t('no_performance_data_desc')}</p>
                <Button asChild className="mt-8 shadow-lg shadow-primary/20" size="lg">
                    <Link href="/dashboard">Start Your First Test</Link>
                </Button>
            </div>
        )}

        {testAttempts && testAttempts.length > 0 && (
            <div className="space-y-4 pt-10 border-t">
                <h2 className="text-2xl font-bold flex items-center gap-2"><BookCheck className="text-purple-500" /> Recent Activity</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {testAttempts.slice(0, 4).map(attempt => (
                        <Card key={attempt.id} className="bg-accent/30 border-none hover:bg-accent/50 transition-colors">
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <div>
                                    <h4 className="font-bold text-sm line-clamp-1">{attempt.testTitle || 'Test'}</h4>
                                    <p className="text-[10px] text-muted-foreground">
                                        {attempt.completedAt ? format(parseISO(attempt.completedAt), 'MMM dd, h:mm a') : 'In progress'}
                                    </p>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">Score</span>
                                        <span className="text-lg font-black">{attempt.score}%</span>
                                    </div>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${attempt.score >= 80 ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
                                        <Target className="h-4 w-4" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
}
