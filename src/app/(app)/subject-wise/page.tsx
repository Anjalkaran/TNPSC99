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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


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

      const unitName = test.syllabusUnitName || 'Uncategorized Unit';
      if (!acc[examGroup][part][unitName]) {
        acc[examGroup][part][unitName] = [];
      }
      acc[examGroup][part][unitName].push(test);
      return acc;
    }, {} as Record<string, Record<string, Record<string, Test[]>>>);

    // Sort tests within each unitName by topic name
    for (const examGroup in grouped) {
        for (const part in grouped[examGroup]) {
            for (const unitName in grouped[examGroup][part]) {
                grouped[examGroup][part][unitName].sort((a, b) => (a.syllabusTopic || '').localeCompare(b.syllabusTopic || ''));
            }
        }
    }

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
                                {Object.entries(parts).map(([part, unitNames]) => (
                                    <AccordionItem value={part} key={part} className="border-b-0">
                                      <Card className="bg-muted/50">
                                          <CardHeader className="p-4">
                                              <AccordionTrigger className="p-0 text-xl font-semibold hover:no-underline">
                                                  {part}
                                              </AccordionTrigger>
                                          </CardHeader>
                                          <AccordionContent className="pt-0 p-4">
                                              <Accordion type="multiple" className="w-full space-y-2" defaultValue={Object.keys(unitNames)}>
                                                  {Object.entries(unitNames).map(([unitName, testList]) => (
                                                      <AccordionItem value={unitName} key={unitName} className="border-b-0">
                                                          <Card>
                                                              <CardHeader className="p-4">
                                                                  <AccordionTrigger className="p-0 font-semibold text-lg hover:no-underline">{unitName}</AccordionTrigger>
                                                              </CardHeader>
                                                              <AccordionContent className="pt-0 p-4">
                                                                  <div className="space-y-4">
                                                                      {testList.map((test) => (
                                                                          <Card key={test.id}>
                                                                              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                                  <div className="flex-grow">
                                                                                  <p className="font-medium">{test.syllabusTopic}</p>
                                                                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                                      <span>{test.questionIds.length} {t('questions')}</span>
                                                                                      <Badge variant="outline">{test.medium}</Badge>
                                                                                      <TestProgressBadge testId={test.id} />
                                                                                  </div>
                                                                                  </div>
                                                                                  <div className="w-full md:w-auto shrink-0 md:min-w-[300px]">
                                                                                      <TestStartControl test={test} />
                                                                                  </div>
                                                                              </CardContent>
                                                                          </Card>
                                                                      ))}
                                                                  </div>
                                                              </AccordionContent>
                                                          </Card>
                                                      </AccordionItem>
                                                  ))}
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
