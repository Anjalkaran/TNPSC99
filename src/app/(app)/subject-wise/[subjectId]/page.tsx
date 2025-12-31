'use client';
import { notFound, useParams } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs } from "firebase/firestore";
import type { Test, Subject, UserTestAttempt, Unit } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


function TestStartControl({ test }: { test: Test }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState<string>('');
  const questionCount = test.questionIds.length;
  const options = [10, 25, 50].filter(o => o < questionCount);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Select onValueChange={setLimit} value={limit}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select Questions" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={String(opt)}>{opt} Questions</SelectItem>)}
          <SelectItem value={String(questionCount)}>All ({questionCount})</SelectItem>
        </SelectContent>
      </Select>
      <Button asChild className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.id}${limit ? `?limit=${limit}` : ''}`}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
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
        if (!user || !firestore || !testId) return;

        const fetchAttempts = async () => {
            setIsLoading(true);
            const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
            const attemptsQuery = query(attemptsRef, where('testId', '==', testId));
            const attemptsSnapshot = await getDocs(attemptsQuery);

            const correctlyAnsweredIds = new Set<string>();
            attemptsSnapshot.forEach(doc => {
                const attempt = doc.data() as UserTestAttempt;
                if (attempt.correctlyAnsweredQuestionIds) {
                    attempt.correctlyAnsweredQuestionIds.forEach(id => correctlyAnsweredIds.add(id));
                }
            });
            setAnsweredCount(correctlyAnsweredIds.size);
            setIsLoading(false);
        };

        fetchAttempts();
    }, [user, firestore, testId]);

    if (isLoading || answeredCount === 0) {
        return null;
    }

    return (
         <Badge variant="secondary">
            {answeredCount} attended
        </Badge>
    )
}

export default function SubjectTestsForSubjectPage() {
  const { subjectId } = useParams();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const subjectIdString = Array.isArray(subjectId) ? subjectId[0] : subjectId;

  const subjectRef = useMemoFirebase(() => {
    if (!firestore || !subjectIdString) return null;
    return doc(firestore, 'subjects', subjectIdString);
  }, [firestore, subjectIdString]);
  const { data: subject, isLoading: subjectLoading } = useDoc<Subject>(subjectRef);


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);
  const subjectTestsQuery = useMemoFirebase(() => {
      if (!testsCollection || !subjectIdString) return null;
      return query(testsCollection, where('subjectId', '==', subjectIdString));
  }, [testsCollection, subjectIdString]);
  
  const { data: subjectTests, isLoading: testsLoading } = useCollection<Test>(subjectTestsQuery);
  
  const unitIds = useMemo(() => {
    if (!subjectTests) return [];
    return [...new Set(subjectTests.map(t => t.unitId).filter(Boolean) as string[])];
  }, [subjectTests]);

  const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const unitsQuery = useMemoFirebase(() => {
    if (!unitsCollection || unitIds.length === 0) return null;
    return query(unitsCollection, where('__name__', 'in', unitIds));
  }, [unitsCollection, unitIds]);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

  const unitsMap = useMemo(() => {
    if (!units) return new Map<string, Unit>();
    return new Map(units.map(u => [u.id, u]));
  }, [units]);

  const groupedAndSortedTests = useMemo(() => {
    if (!subjectTests) return {};

    const grouped = subjectTests.reduce((acc, test) => {
        let category = "Uncategorized";
        if (test.unitId) {
            category = test.unitId.endsWith('g') ? 'இலக்கணம்' : 'உரைநடை & செய்யுள்';
        } else if (test.category) {
            category = test.category;
        }
        
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(test);
        return acc;
    }, {} as Record<string, Test[]>);
    
    // Sort tests within each category
    for (const category in grouped) {
        grouped[category].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    // Sort the categories themselves
    const sortedCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    
    const result: Record<string, Test[]> = {};
    for (const category of sortedCategories) {
        result[category] = grouped[category];
    }
    
    return result;
  }, [subjectTests]);


  if (subjectLoading || testsLoading || unitsLoading) {
      return <div className="container mx-auto px-4 py-8 md:py-12"><p>Loading tests...</p></div>;
  }

  if (!subject) {
      return notFound();
  }
  
  const getShortTestTitle = (fullTitle: string, subjectName: string) => {
    if (!subjectName) return fullTitle;
    const prefix = `${subjectName} - `;
    if (fullTitle.startsWith(prefix)) {
      return fullTitle.substring(prefix.length);
    }
    return fullTitle;
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{subject.name} Tests</h1>
        <p className="text-muted-foreground mt-2">{subject.description}</p>
      </div>
      
      {Object.keys(groupedAndSortedTests).length > 0 ? (
        <Accordion type="multiple" defaultValue={Object.keys(groupedAndSortedTests)} className="w-full space-y-4">
            {Object.entries(groupedAndSortedTests).map(([category, tests]) => (
                <AccordionItem value={category} key={category} className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 py-4 text-lg font-semibold">
                        {category}
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test Title</TableHead>
                                    <TableHead>Questions</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tests.map((test) => (
                                    <TableRow key={test.id}>
                                        <TableCell className="font-medium">{getShortTestTitle(test.title, subject.name)}</TableCell>
                                        <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{test.questionIds.length}</span>
                                            <TestProgressBadge testId={test.id} />
                                        </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                        <TestStartControl test={test} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
