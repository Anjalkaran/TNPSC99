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
import { useSearchParams } from 'next/navigation';


function TopicContent({ tests }: { tests: Test[] }) {
    const { t } = useTranslation();
    const [selectedTestId, setSelectedTestId] = useState<string>('');
    const [limit, setLimit] = useState<string>('');

    const allQuestionsCount = useMemo(() => {
        return tests.reduce((sum, test) => sum + test.questionIds.length, 0);
    }, [tests]);

    const selectedTest = useMemo(() => {
        return tests.find(test => test.id === selectedTestId);
    }, [tests, selectedTestId]);

    useEffect(() => {
        setLimit('');
    }, [selectedTestId]);

    const limitOptions = useMemo(() => {
        if (!selectedTest) return [];
        const questionCount = selectedTest.questionIds.length;
        if (questionCount === 0) return [];
        
        let options = [10, 25, 50].filter(o => o < questionCount);
        if (questionCount > 0) {
            options.push(questionCount);
        }
        return [...new Set(options)].sort((a,b) => a - b);
    }, [selectedTest]);

    const startHref = selectedTest ? `/test/${selectedTest.id}${limit ? `?limit=${limit}` : ''}` : '#';

    return (
        <div className="space-y-3">
             <div className="text-sm text-muted-foreground">
                <span>Total of {allQuestionsCount} {t('questions')} available.</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 w-full">
                <Select onValueChange={setSelectedTestId} value={selectedTestId}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {tests.map(test => (
                            <SelectItem key={test.id} value={test.id}>
                                {test.syllabusCategory || 'General'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select onValueChange={setLimit} value={limit} disabled={!selectedTest}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder={selectedTest ? `Questions (${selectedTest.questionIds.length})` : 'Select Questions'} />
                    </SelectTrigger>
                    <SelectContent>
                        {selectedTest && limitOptions.map(opt => (
                            <SelectItem key={opt} value={String(opt)}>
                                {opt === selectedTest.questionIds.length ? t('all_questions', { count: opt }) : t('questions_count', { count: opt })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                <Button asChild className="w-full sm:w-auto" disabled={!selectedTestId || !limit} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                    <Link href={startHref}>
                        {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}


export default function SubjectWiseTestsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const examGroup = searchParams.get('examGroup');

  const testsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const qConstraints = [];
    if (examGroup) {
      qConstraints.push(where('examGroup', '==', examGroup));
    }
    return query(collection(firestore, 'tests'), ...qConstraints);
  }, [firestore, examGroup]);

  const { data: tests, isLoading } = useCollection<Test>(testsQuery);

  const groupedSyllabusTests = useMemo(() => {
    if (!tests) return {};

    const validTests = tests.filter(t => t.syllabusUnitName != null);

    const grouped = validTests.reduce((acc, test) => {
        const groupKey = examGroup || test.examGroup || 'Uncategorized';
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

    // Sorting
    for (const eg in grouped) {
        for (const p in grouped[eg]) {
            for (const uk in grouped[eg][p]) {
                for (const tk in grouped[eg][p][uk]) {
                    grouped[eg][p][uk][tk].sort((a,b) => (a.syllabusCategory || '').localeCompare(b.syllabusCategory || ''));
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
