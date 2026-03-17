'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { UserTestAttempt, Test, Subject, Category, Unit, Class } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, Target, TrendingUp, BookCheck, FolderKanban, Shapes } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';


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
                    ? "AI பகுப்பாய்வு கிடைக்கவில்லை. உங்கள் ஜெமினி API விசையை உள்ளமைக்கவும்." 
                    : "AI analysis is unavailable. Please configure your Gemini API key.";
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
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
                    <BrainCircuit className="h-5 w-5 text-primary" />
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
  const { t, language } = useTranslation();
  const params = useParams();
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : undefined;

  const [subjectPerformance, setSubjectPerformance] = useState<PerformanceMetric[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformanceMetric[]>([]);
  const [unitPerformance, setUnitPerformance] = useState<UnitPerformanceMetric[]>([]);
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
            setSubjectPerformance([]);
            setCategoryPerformance([]);
            setUnitPerformance([]);
            setIsLoading(false);
            return;
        }

        const testIds = [...new Set(testAttempts.map(attempt => attempt.testId))];
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
  

  if (isLoading) {
    return <div className="text-center p-8">{t('loading_performance_data')}</div>;
  }

  return (
    <div className="space-y-8">
      <AiAnalysis 
        subjectPerformance={subjectPerformance}
        categoryPerformance={categoryPerformance}
        unitPerformance={unitPerformance}
      />
      
      <div className="grid md:grid-cols-2 gap-8">
          <Card>
              <CardHeader>
                  <CardTitle className='flex items-center gap-2'><Shapes /> {t('subject_wise_proficiency')}</CardTitle>
                  <CardDescription>{t('subject_wise_proficiency_desc')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                  {subjectPerformance.length > 0 ? (
                    subjectPerformance.map(p => (
                      <div key={p.id}>
                          <div className='flex justify-between items-center mb-1'>
                              <span className='font-medium text-sm'>{p.name}</span>
                              <span className='text-sm text-muted-foreground'>{p.proficiency.toFixed(0)}%</span>
                          </div>
                          <Progress value={p.proficiency} />
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">{t('no_performance_data_desc')}</p>
                  )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className='flex items-center gap-2'><FolderKanban /> Category-wise Proficiency</CardTitle>
                  <CardDescription>Your proficiency score in each category you've attempted.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                  {categoryPerformance.length > 0 ? (
                    categoryPerformance.map(p => (
                      <div key={p.id}>
                          <div className='flex justify-between items-center mb-1'>
                              <span className='font-medium text-sm'>{p.name}</span>
                              <span className='text-sm text-muted-foreground'>{p.proficiency.toFixed(0)}%</span>
                          </div>
                          <Progress value={p.proficiency} />
                      </div>
                    ))
                  ) : (
                     <p className="text-muted-foreground text-sm">No category performance data yet. Some tests may not be assigned to a category.</p>
                  )}
              </CardContent>
          </Card>
      </div>

      {(subjectPerformance.length === 0 && categoryPerformance.length === 0) && (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">No Performance Data</h3>
              <p className="text-muted-foreground mt-2">This user has not attempted any tests yet.</p>
          </div>
      )}
    </div>
  );
}
