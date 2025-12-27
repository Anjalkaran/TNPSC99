'use client';
import { notFound, useParams } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs } from "firebase/firestore";
import type { Test, Subject, UserTestAttempt } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from '@/components/ui/badge';

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
      <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.slug}${limit ? `?limit=${limit}` : ''}`}>
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
            {answeredCount} answered
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
  
  if (subjectLoading || testsLoading) {
      return <div className="container mx-auto px-4 py-8 md:py-12"><p>Loading tests...</p></div>;
  }

  if (!subject) {
      return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{subject.name} Tests</h1>
        <p className="text-muted-foreground mt-2">{subject.description}</p>
      </div>
      
      {subjectTests && subjectTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectTests.map((test) => (
            <Card key={test.slug} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {test.image && (
                <Image
                  src={test.image.imageUrl}
                  alt={test.title}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                  data-ai-hint={test.image.imageHint}
                />
              )}
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                 <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t('total_of_questions', { count: test.questionIds.length})}</p>
                    <TestProgressBadge testId={test.id} />
                </div>
              </CardContent>
              <CardFooter>
                 <TestStartControl test={test} />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
