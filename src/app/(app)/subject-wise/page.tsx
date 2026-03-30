'use client';

import { useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useMemo, useState, useEffect, useTransition, Suspense } from 'react';
import type { Test, UserTestAttempt } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSearchParams, useRouter } from 'next/navigation';


function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function TopicContent({ tests }: { tests: Test[] }) {
    const { t } = useTranslation();
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [limit, setLimit] = useState<string>('');
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isGenerating, startTransition] = useTransition();

    const filteredTests = useMemo(() => tests.filter(test => !test.isMockTest), [tests]);

    const allQuestionsCount = useMemo(() => {
        return filteredTests.reduce((sum, test) => sum + (test.questionIds?.length || 0), 0);
    }, [filteredTests]);

    const groupedCategoryTests = useMemo(() => {
        const grouped: Record<string, Test[]> = {};
        filteredTests.forEach(test => {
            const cat = test.syllabusCategory || 'நேரடி வினா';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(test);
        });
        return grouped;
    }, [tests]);

    const categories = useMemo(() => Object.keys(groupedCategoryTests).sort(), [groupedCategoryTests]);

    const selectedTest = useMemo(() => {
        if (selectedCategoryId === 'all') {
            const allQuestionIds = Array.from(new Set(filteredTests.flatMap(t => t.questionIds || [])));
            return {
                id: 'all',
                title: 'All Categories',
                questionIds: allQuestionIds,
            } as Partial<Test> & { id: string };
        }
        if (!selectedCategoryId) return null;
        
        const categoryTests = groupedCategoryTests[selectedCategoryId];
        if (categoryTests) {
            const allQuestionIds = Array.from(new Set(categoryTests.flatMap(t => t.questionIds || [])));
            return {
                ...categoryTests[0],
                id: selectedCategoryId,
                title: selectedCategoryId,
                questionIds: allQuestionIds,
            } as Partial<Test> & { id: string };
        }
        return null;
    }, [tests, selectedCategoryId, groupedCategoryTests]);

    useEffect(() => {
        setLimit('');
    }, [selectedCategoryId]);

    const limitOptions = useMemo(() => {
        if (!selectedTest || !selectedTest.questionIds) return [];
        const questionCount = selectedTest.questionIds.length;
        if (questionCount === 0) return [];
        
        let options = [10, 25, 50].filter(o => o < questionCount);
        if (questionCount > 0) {
            options.push(questionCount);
        }
        return [...new Set(options)].sort((a,b) => a - b);
    }, [selectedTest]);

    const handleStartTest = () => {
        if (!limit || !selectedCategoryId) return;

        startTransition(async () => {
            if (!user || !firestore || !tests.length || !selectedTest) return;
            
            try {
                // We always generate a temporary test if it's 'all' or a merged category
                // Or even a single test for consistency
                const allQuestionIds = selectedTest.questionIds || [];
                if (allQuestionIds.length === 0) {
                    toast({
                        title: t('error_title'),
                        description: "No questions found.",
                        variant: "destructive"
                    });
                    return;
                }
                
                const shuffledIds = shuffleArray(allQuestionIds);
                const finalIds = limit ? shuffledIds.slice(0, parseInt(limit, 10)) : shuffledIds;

                const newTestRef = doc(collection(firestore, 'tests'));
                const baseTest = tests[0];
                const newMockTest: Partial<Test> = {
                    id: newTestRef.id,
                    title: selectedCategoryId === 'all' 
                        ? `${baseTest.syllabusTopic || 'Mixed'} - All Categories` 
                        : `${baseTest.syllabusTopic || ''} - ${selectedCategoryId}`,
                    description: `A temporary test for ${baseTest.syllabusTopic} - ${selectedCategoryId}.`,
                    questionIds: finalIds,
                    examGroup: baseTest.examGroup,
                    syllabusPart: baseTest.syllabusPart,
                    syllabusUnit: baseTest.syllabusUnit,
                    syllabusUnitName: baseTest.syllabusUnitName,
                    syllabusTopic: baseTest.syllabusTopic,
                    syllabusCategory: selectedCategoryId === 'all' ? 'Mixed' : selectedCategoryId,
                    isMockTest: true,
                    userId: user.uid,
                };

                await setDoc(newTestRef, newMockTest);
                router.push(`/test/${newTestRef.id}`);
            } catch (error: any) {
                console.error("[SubjectWise] Failed to generate test:", error);
                toast({
                    title: t('error_title'),
                    description: "Failed to generate test. Please try again or contact support.",
                    variant: "destructive"
                });
            }
        });
    };
    
    const showAllOption = tests.length > 1;

    return (
        <div className="space-y-3">
             <div className="text-base text-muted-foreground pb-2">
                <span>Total of {allQuestionsCount} {t('questions')} available.</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
                <Select onValueChange={setSelectedCategoryId} value={selectedCategoryId}>
                    <SelectTrigger className="w-full sm:w-[200px] h-11 text-base">
                        <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {showAllOption && <SelectItem value="all">All Categories</SelectItem>}
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
        

                <Select onValueChange={setLimit} value={limit} disabled={!selectedTest}>
                    <SelectTrigger className="w-full sm:w-[200px] h-11 text-base">
                        <SelectValue placeholder={t('select_questions')} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedTest && limitOptions.map(opt => (
                            <SelectItem key={opt} value={String(opt)}>
                                {opt === (selectedTest.questionIds?.length || 0) ? t('all_questions') : t('questions_count', { count: opt })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                
                <Button onClick={handleStartTest} className="w-full sm:w-auto h-11 text-base font-bold" disabled={!selectedCategoryId || !limit || isGenerating} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                     {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

function SubjectWiseContent() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const examGroup = searchParams.get('examGroup');

  const [tests, setTests] = useState<Test[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    const fetchTests = async () => {
      setIsLoading(true);
      try {
        const fetchedTests: Test[] = [];
        const testsRef = collection(firestore, 'tests');

        console.log("[SubjectWise] Fetching tests for examGroup:", examGroup);

        // Query 1: Get tests for the primary exam group
        if (examGroup) {
          const q1 = query(testsRef, where('examGroup', '==', examGroup));
          const querySnapshot1 = await getDocs(q1);
          console.log(`[SubjectWise] Q1 returned ${querySnapshot1.size} docs`);
          querySnapshot1.forEach((doc) => {
            fetchedTests.push({ id: doc.id, ...doc.data() } as Test);
          });
        } else {
          // If no exam group, fetch all syllabus tests
          const qAll = query(testsRef, where('syllabusUnitName', '!=', null));
          const querySnapshotAll = await getDocs(qAll);
          console.log(`[SubjectWise] QAll returned ${querySnapshotAll.size} docs`);
          querySnapshotAll.forEach((doc) => {
              fetchedTests.push({ id: doc.id, ...doc.data() } as Test);
          });
        }

        // Query 2: If Group II, also get Group IV Part C tests
        if (examGroup === 'Group II') {
          console.log("[SubjectWise] Group II detected, fetching extra Group IV Part C tests...");
          const q2 = query(testsRef, 
            where('examGroup', '==', 'Group IV'),
            where('syllabusPart', '==', 'பகுதி இ')
          );
          const querySnapshot2 = await getDocs(q2);
          console.log(`[SubjectWise] Q2 returned ${querySnapshot2.size} docs`);
          querySnapshot2.forEach((doc) => {
            if (!fetchedTests.some(t => t.id === doc.id)) {
              fetchedTests.push({ id: doc.id, ...doc.data() } as Test);
            }
          });
        }
        
        // Query 3: If Group I, also get Group II Part B tests
        if (examGroup === 'Group I') {
          console.log("[SubjectWise] Group I detected, fetching extra Group II Part B tests...");
          const q3 = query(testsRef, 
            where('examGroup', '==', 'Group II'),
            where('syllabusPart', '==', 'பகுதி ஆ')
          );
          const querySnapshot3 = await getDocs(q3);
          console.log(`[SubjectWise] Q3 returned ${querySnapshot3.size} docs`);
          querySnapshot3.forEach((doc) => {
            if (!fetchedTests.some(t => t.id === doc.id)) {
              fetchedTests.push({ id: doc.id, ...doc.data() } as Test);
            }
          });
        }
        
        console.log(`[SubjectWise] Total fetched tests: ${fetchedTests.length}`);
        setTests(fetchedTests);
      } catch (error: any) {
        console.error("[SubjectWise] Failed to fetch tests:", error);
        // Do not swallow the error if it's a critical crash, 
        // but log it so we can see it in the browser console.
        if (error.code === 'failed-precondition') {
          console.warn("[SubjectWise] Missing Firestore Index! Check the link in the error above.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, [firestore, examGroup]);

  const groupedSyllabusTests = useMemo(() => {
    if (!tests) return {};
  
    const validTests = tests.filter(t => t.syllabusUnitName != null && !t.isMockTest);
    
    let grouped: Record<string, Record<string, Record<string, Record<string, Test[]>>>>;
  
    if (examGroup) {
      // Group all tests under the main exam group, merging parts from other groups.
      const parts = validTests.reduce((acc, test) => {
        const part = test.syllabusPart || 'Uncategorized Part';
        const unitKey = (test.syllabusUnit && test.syllabusUnitName) ? `${test.syllabusUnit}: ${test.syllabusUnitName}` : 'Uncategorized Unit';
        const topicKey = test.syllabusTopic || 'Uncategorized Topic';
  
        if (!acc[part]) acc[part] = {};
        if (!acc[part][unitKey]) acc[part][unitKey] = {};
        if (!acc[part][unitKey][topicKey]) acc[part][unitKey][topicKey] = [];
        
        acc[part][unitKey][topicKey].push(test);
        return acc;
      }, {} as Record<string, Record<string, Record<string, Test[]>>>);
      grouped = { [examGroup]: parts };
    } else {
      // Default behavior: group by the test's own examGroup property
      grouped = validTests.reduce((acc, test) => {
          const groupKey = test.examGroup || 'Uncategorized';
          const part = test.syllabusPart || 'Uncategorized Part';
          const unitKey = (test.syllabusUnit && test.syllabusUnitName) ? `${test.syllabusUnit}: ${test.syllabusUnitName}` : 'Uncategorized Unit';
          const topicKey = test.syllabusTopic || 'Uncategorized Topic';
  
          if (!acc[groupKey]) acc[groupKey] = {};
          if (!acc[groupKey][part]) acc[groupKey][part] = {};
          if (!acc[groupKey][part][unitKey]) acc[groupKey][part][unitKey] = {};
          if (!acc[groupKey][part][unitKey][topicKey]) acc[groupKey][part][unitKey][topicKey] = [];
          
          acc[groupKey][part][unitKey][topicKey].push(test);
          return acc;
      }, {} as Record<string, Record<string, Record<string, Record<string, Test[]>>>>);
    }
    
    // Sorting logic - applies to both scenarios
    for (const eg in grouped) {
        for (const p in grouped[eg]) {
            for (const uk in grouped[eg][p]) {
                for (const tk in grouped[eg][p][uk]) {
                    grouped[eg][p][uk][tk].sort((a: Test, b: Test) => (a.syllabusCategory || 'நேரடி வினா').localeCompare(b.syllabusCategory || 'நேரடி வினா'));
                }
            }
        }
    }
    return grouped;
  }, [tests, examGroup]);
  
  const pageTitle = examGroup ? `${examGroup} ${t('syllabus_wise_tests')}` : t('syllabus_wise_tests');
  
  const getSlugFromExamGroup = (group: string | null): string | null => {
      if (!group) return null;
      switch (group) {
          case 'Group I': return 'group-1';
          case 'Group II': return 'group-2';
          case 'Group IV': return 'group-4';
          default: return group.toLowerCase().replace(' ', '-');
      }
  }

  const backLinkSlug = getSlugFromExamGroup(examGroup);
  const backLink = backLinkSlug ? `/exam-wise/${backLinkSlug}` : '/dashboard';
  const backLinkText = examGroup ? `Back to ${examGroup}` : 'Back to Dashboard';


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href={backLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLinkText}
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">Practice tests organized by the official TNPSC syllabus.</p>
      </div>

      {isLoading ? (
        <p>Loading tests...</p>
      ) : Object.keys(groupedSyllabusTests).length > 0 ? (
        <Card>
            <CardContent className="p-2 sm:p-4">
                <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedSyllabusTests)}>
                {Object.entries(groupedSyllabusTests).map(([examGroup, parts]) => (
                    <AccordionItem value={examGroup} key={examGroup} className="border-b-0">
                        <AccordionTrigger className="p-4 text-xl font-bold hover:no-underline rounded-md hover:bg-muted/50">
                            {examGroup}
                        </AccordionTrigger>
                        <AccordionContent className="px-2 sm:px-4 pb-2">
                            <Accordion type="multiple" className="w-full space-y-2">
                                {Object.entries(parts).sort((a, b) => {
                                    const order = ['பகுதி அ', 'பகுதி ஆ', 'பகுதி இ'];
                                    const indexA = order.indexOf(a[0]);
                                    const indexB = order.indexOf(b[0]);
                                    if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                }).map(([part, units]) => (
                                    <AccordionItem value={part} key={part} className="border rounded-md bg-muted/50">
                                        <AccordionTrigger className="p-3 text-lg font-semibold hover:no-underline">
                                            {part}
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-0 p-3 space-y-2">
                                            <Accordion type="multiple" className="w-full space-y-2">
                                                {Object.entries(units).sort(([unitKeyA], [unitKeyB]) => {
                                                        const romanMap: { [key: string]: number } = { 'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000 };
                                                        const getUnitNumber = (unitKey: string): number => {
                                                            const match = unitKey.match(/அலகு\s+([IVXLCDM]+)/);
                                                            if (!match || !match[1]) return 999;
                                                            const roman = match[1];
                                                            let result = 0;
                                                            let i = 0;
                                                            while (i < roman.length) {
                                                                const currentVal = romanMap[roman[i]];
                                                                if (currentVal === undefined) return 999;
                                                                const nextVal = (i + 1 < roman.length) ? romanMap[roman[i+1]] : 0;
                                                                if(nextVal && currentVal < nextVal) {
                                                                result += nextVal - currentVal;
                                                                i += 2;
                                                                } else {
                                                                result += currentVal;
                                                                i += 1;
                                                                }
                                                            }
                                                            return result;
                                                        };
                                                        return getUnitNumber(unitKeyA) - getUnitNumber(unitKeyB);
                                                    }).map(([unitKey, topics]) => (
                                                    <AccordionItem value={unitKey} key={unitKey} className="border rounded-md bg-background">
                                                        <AccordionTrigger className="p-3 font-semibold hover:no-underline">
                                                            {unitKey}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-0 p-3">
                                                            <Accordion type="multiple" className="w-full space-y-2">
                                                                {Object.entries(topics).map(([topicName, testList]) => (
                                                                    <AccordionItem value={topicName} key={topicName} className="border rounded-md bg-muted/30">
                                                                        <AccordionTrigger className="p-3 text-base font-medium hover:no-underline text-left">
                                                                            {topicName}
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="pt-0 p-3 space-y-3">
                                                                            <TopicContent tests={testList} />
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                ))}
                                                            </Accordion>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            </CardContent>
        </Card>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {examGroup 
              ? `No syllabus-wise tests found for ${examGroup}.` 
              : 'No syllabus-wise tests found. Upload some in the admin panel!'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SubjectWiseTestsPage() {
    return (
        <Suspense fallback={<div>Loading syllabus tests...</div>}>
            <SubjectWiseContent />
        </Suspense>
    );
}
