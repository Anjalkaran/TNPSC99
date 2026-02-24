'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import type { Test, UserTestAttempt } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
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


function TestStartControl({ test }: { test: Test }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState<string>('');
  const questionCount = test.questionIds.length;
  const options = [10, 25, 50].filter(o => o < questionCount);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
      <Select onValueChange={setLimit} value={limit}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('select_questions')} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={String(opt)}>{t('questions_count', { count: opt })}</SelectItem>)}
          <SelectItem value={String(questionCount)}>{t('all_questions', { count: questionCount })}</SelectItem>
        </SelectContent>
      </Select>
      <Button asChild className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.id}${limit ? `?limit=${limit}` : ''}`}>
          {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function TestProgressBadge({ testId }: { testId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [answeredCount, setAnsweredCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore || !testId) {
            setIsLoading(false);
            return;
        };

        const fetchAttempts = async () => {
            setIsLoading(true);
            const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
            const attemptsQuery = query(attemptsRef, where('testId', '==', testId));
            const attemptsSnapshot = await getDocs(attemptsQuery);

            const attemptedQuestionIds = new Set<string>();
            attemptsSnapshot.forEach(doc => {
                const attempt = doc.data() as UserTestAttempt;
                if (attempt.sessionQuestionIds && attempt.answers) {
                    attempt.answers.forEach((answer, index) => {
                        if (answer !== undefined && answer !== -1) {
                            const questionId = attempt.sessionQuestionIds?.[index];
                            if (questionId) {
                                attemptedQuestionIds.add(questionId);
                            }
                        }
                    });
                }
            });
            setAnsweredCount(attemptedQuestionIds.size);
            setIsLoading(false);
        };

        fetchAttempts();
    }, [user, firestore, testId]);

    if (isLoading) {
        return <Badge variant="outline">Loading...</Badge>;
    }
    
    if (answeredCount === 0) return null;

    return (
         <Badge variant="secondary">
            {answeredCount} attended
        </Badge>
    )
}

function TopicTestGroup({ topicName, tests }: { topicName: string; tests: Test[] }) {
  const { t } = useTranslation();
  const [selectedTestId, setSelectedTestId] = useState('');

  const testsByCategory = useMemo(() => {
    return tests.reduce((acc, test) => {
      const category = test.syllabusCategory || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(test);
      return acc;
    }, {} as Record<string, Test[]>);
  }, [tests]);

  useEffect(() => {
    if (tests.length === 1) {
      setSelectedTestId(tests[0].id);
    } else {
      setSelectedTestId('');
    }
  }, [tests]);

  const handleTestSelectionChange = (testId: string) => {
    setSelectedTestId(testId);
  };

  const selectedTest = tests.find(t => t.id === selectedTestId);

  const getTestLabel = (test: Test) => {
    // For passage tests, use the set ID for uniqueness
    if (test.syllabusCategory === 'Passage Comprehension' && test.id.includes('-')) {
        const setId = test.id.split('-').pop()
        return `Passage ${setId}`;
    }
    // For other tests with a category, the category name itself is the label.
    // Since normal uploads merge tests of the same category, this should be unique per topic.
    return test.syllabusCategory || 'General';
  };
  
  const hasMultipleOptions = tests.length > 1;

  return (
    <Card>
      <CardHeader className="pb-4 pt-4">
        <CardTitle className="text-base font-semibold">{topicName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-grow space-y-2">
          {hasMultipleOptions ? (
            <div className="space-y-1.5">
              <Label>வினா வகை</Label>
              <Select onValueChange={handleTestSelectionChange} value={selectedTestId}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder={t('select_category_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(testsByCategory).map(([category, testsInCategory]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {testsInCategory.map(test => (
                        <SelectItem key={test.id} value={test.id}>
                          {/* If a category has multiple tests, use the specific label, otherwise just use the category name */}
                          {testsInCategory.length > 1 ? getTestLabel(test) : category}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          
          {selectedTest ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
              <span>{selectedTest.questionIds.length} {t('questions')}</span>
              <Badge variant="outline">{selectedTest.medium}</Badge>
              <TestProgressBadge testId={selectedTest.id} />
            </div>
          ) : hasMultipleOptions ? <div className="h-6" /> : null }
        </div>
        <div className="w-full md:w-auto shrink-0 md:min-w-[300px]">
            {selectedTest ? (
                <TestStartControl test={selectedTest} />
            ) : (
                <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
                    <Select disabled>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder={t('select_questions')} />
                        </SelectTrigger>
                    </Select>
                    <Button disabled className="w-full sm:w-auto">
                        {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}


export default function SubjectWiseTestsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const testsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'tests'), where('syllabusUnitName', '!=', null)) : null,
    [firestore]
  );
  const { data: tests, isLoading } = useCollection<Test>(testsQuery);

  const groupedByExamGroup = useMemo(() => {
    if (!tests) return {};
    const grouped = tests.reduce((acc, test) => {
      const examGroup = test.examGroup || 'Uncategorized';
      if (!acc[examGroup]) {
        acc[examGroup] = {};
      }
      
      const part = test.syllabusPart || 'Uncategorized Part';
      if (!acc[examGroup][part]) {
        acc[examGroup][part] = {};
      }

      const unitKey = test.syllabusUnit && test.syllabusUnitName ? `${test.syllabusUnit}: ${test.syllabusUnitName}` : (test.syllabusUnitName || 'Uncategorized Unit');
      if (!acc[examGroup][part][unitKey]) {
        acc[examGroup][part][unitKey] = [];
      }
      acc[examGroup][part][unitKey].push(test);
      return acc;
    }, {} as Record<string, Record<string, Record<string, Test[]>>>);

    return grouped;
  }, [tests]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/exam-wise/group-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Group IV
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold">{t('syllabus_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">Practice tests organized by the official TNPSC syllabus.</p>
      </div>

      {isLoading ? (
        <p>Loading tests...</p>
      ) : Object.keys(groupedByExamGroup).length > 0 ? (
        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedByExamGroup)}>
          {Object.entries(groupedByExamGroup).map(([examGroup, parts]) => (
            <AccordionItem value={examGroup} key={examGroup} className="border-b-0 mb-4">
                <Card>
                    <CardHeader>
                        <AccordionTrigger className="p-0 text-2xl font-bold hover:no-underline">
                            {examGroup}
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <div className="px-6 pb-6">
                            <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(parts)}>
                                {Object.entries(parts).sort((a, b) => {
                                    const order = ['பகுதி அ', 'பகுதி ஆ', 'பகுதி இ'];
                                    const indexA = order.indexOf(a[0]);
                                    const indexB = order.indexOf(b[0]);
                                    if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                }).map(([part, unitNames]) => (
                                    <AccordionItem value={part} key={part} className="border-b-0">
                                      <Card className="bg-muted/50">
                                          <CardHeader className="p-4">
                                              <AccordionTrigger className="p-0 text-xl font-semibold hover:no-underline">
                                                  {part}
                                              </AccordionTrigger>
                                          </CardHeader>
                                          <AccordionContent className="pt-0 p-4">
                                              <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(unitNames)}>
                                                  {Object.entries(unitNames).sort(([unitKeyA], [unitKeyB]) => {
                                                        const romanMap: { [key: string]: number } = { 'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000 };
                                                        const getUnitNumber = (unitKey: string): number => {
                                                            const match = unitKey.match(/அலகு\s+([IVXLCDM]+)/);
                                                            if (!match || !match[1]) return 999;
                                                            const roman = match[1];
                                                            let result = 0;
                                                            for (let i = 0; i < roman.length; i++) {
                                                                const current = romanMap[roman[i]];
                                                                if (current === undefined) return 999;
                                                                const next = i + 1 < roman.length ? romanMap[roman[i + 1]] : 0;
                                                                if (next && current < next) {
                                                                    result -= current;
                                                                } else {
                                                                    result += current;
                                                                }
                                                            }
                                                            return result;
                                                        };
                                                        return getUnitNumber(unitKeyA) - getUnitNumber(unitKeyB);
                                                    }).map(([unitKey, testList]) => {
                                                        
                                                        const testsByTopic = testList.reduce((acc, test) => {
                                                            const topic = test.syllabusTopic || 'Uncategorized';
                                                            if (!acc[topic]) acc[topic] = [];
                                                            acc[topic].push(test);
                                                            return acc;
                                                        }, {} as Record<string, Test[]>);
                                                        
                                                        for(const topic in testsByTopic) {
                                                            testsByTopic[topic].sort((a,b) => (a.syllabusCategory || 'zzzz').localeCompare(b.syllabusCategory || 'zzzz'));
                                                        }

                                                        return (
                                                          <AccordionItem value={unitKey} key={unitKey} className="border-b-0">
                                                              <Card>
                                                                  <CardHeader className="p-4">
                                                                      <AccordionTrigger className="p-0 font-semibold text-lg hover:no-underline">{unitKey}</AccordionTrigger>
                                                                  </CardHeader>
                                                                  <AccordionContent className="pt-0 p-4">
                                                                    <div className="space-y-4">
                                                                      {Object.entries(testsByTopic).map(([topicName, testsForTopic]) => (
                                                                        <TopicTestGroup key={topicName} topicName={topicName} tests={testsForTopic} />
                                                                      ))}
                                                                    </div>
                                                                  </AccordionContent>
                                                              </Card>
                                                          </AccordionItem>
                                                        )
                                                    })}
                                              </Accordion>
                                          </AccordionContent>
                                      </Card>
                                  </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No syllabus-wise tests found. Upload some in the admin panel!</p>
        </div>
      )}
    </div>
  );
}
