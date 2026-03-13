'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Test, UserTestAttempt } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getDocs } from 'firebase/firestore';


function TestStartControl({ test }: { test: Test }) {
  const { t } = useTranslation();
  return (
    <Button asChild className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
      <Link href={`/test/${test.id}`}>
        {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
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

export default function PreviousYearGroupPage() {
  const params = useParams();
  const { t } = useTranslation();
  
  const examGroupSlug = Array.isArray(params.examGroup) ? params.examGroup[0] : params.examGroup;
  
  const getExamGroupFromSlug = (slug: string) => {
    switch (slug) {
        case 'group-1': return 'Group I';
        case 'group-2': return 'Group II';
        case 'group-4': return 'Group IV';
        default: return slug.replace('-', ' ');
    }
  };

  const examGroup = getExamGroupFromSlug(examGroupSlug);

  const firestore = useFirestore();
  const papersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'tests'),
      where('isPreviousYearPaper', '==', true),
      where('examGroup', '==', examGroup)
    );
  }, [firestore, examGroup]);

  const { data: papers, isLoading } = useCollection<Test>(papersQuery);

  const sortedPapers = useMemo(() => {
    if (!papers) return [];
    return [...papers].sort((a, b) => (b.year || 0) - (a.year || 0));
  }, [papers]);

  const pageTitle = `${examGroup} Previous Year Papers`;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/previous-year">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Exam Groups
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold capitalize">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">Select a paper to start practicing.</p>
      </div>

      {isLoading ? (
        <p>Loading papers...</p>
      ) : sortedPapers.length > 0 ? (
        <div className="space-y-4">
          {sortedPapers.map((paper) => (
            <Card key={paper.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-grow">
                  <p className="font-medium">{paper.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{paper.questionIds.length} {t('questions')}</span>
                    <TestProgressBadge testId={paper.id} />
                  </div>
                </div>
                <div className="w-full md:w-auto shrink-0 md:min-w-[150px]">
                  <TestStartControl test={paper} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No previous year papers found for {examGroup}.</p>
        </div>
      )}
    </div>
  );
}
