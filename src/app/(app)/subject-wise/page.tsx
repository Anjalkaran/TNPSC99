'use client';
import { notFound, useParams, usePathname } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Test, Subject } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';

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
        <Link href={`/test/${encodeURIComponent(test.title)}${limit ? `?limit=${limit}` : ''}`}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}


// This new page component will render tests for a specific subject ID.
function SubjectPage() {
  const { subjectId } = useParams();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const subjectRef = useMemoFirebase(() => {
    if (!firestore || !subjectId) return null;
    return doc(firestore, 'subjects', Array.isArray(subjectId) ? subjectId[0] : subjectId);
  }, [firestore, subjectId]);
  const { data: subject, isLoading: subjectLoading } = useDoc<Subject>(subjectRef);


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);
  const subjectTestsQuery = useMemoFirebase(() => {
      if (!testsCollection || !subjectId) return null;
      return query(testsCollection, where('subjectId', '==', Array.isArray(subjectId) ? subjectId[0] : subjectId));
  }, [testsCollection, subjectId]);
  
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
            <Card key={test.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
                <p className="text-sm text-muted-foreground">{t('total_of_questions', { count: test.questionIds.length})}</p>
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


// This is the original page component, it will now act as a parent route.
// Or we can combine them. Let's create a new file for the subject detail page.
export default function SubjectWiseTestsPage() {
    const pathname = usePathname();
    const { t } = useTranslation();
    // This will check if we are on the /subject-wise/[subjectId] page
    if(pathname.split('/').length > 2) {
        return <SubjectPage />;
    }
  
    const firestore = useFirestore();
    const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);
    const subjectTestsQuery = useMemoFirebase(() => testsCollection && query(testsCollection, where('category', '==', 'subject')), [testsCollection]);
    
    const { data: subjectTests, isLoading } = useCollection<Test>(subjectTestsQuery);

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Subject-wise Tests</h1>
            <p className="text-muted-foreground mt-2">Focus your preparation on specific subjects.</p>
        </div>
        
        {isLoading && <p>Loading tests...</p>}

        {!isLoading && subjectTests && subjectTests.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectTests.map((test) => (
                <Card key={test.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <Image
                    src={test.image.imageUrl}
                    alt={test.title}
                    width={600}
                    height={400}
                    className="w-full h-48 object-cover"
                    data-ai-hint={test.image.imageHint}
                />
                <CardHeader>
                    <CardTitle>{test.title}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{t('total_of_questions', { count: test.questionIds.length})}</p>
                </CardContent>
                <CardFooter>
                    <TestStartControl test={test} />
                </CardFooter>
                </Card>
            ))}
            </div>
        ) : (
            !isLoading && <div className="text-center py-16">
            <p className="text-muted-foreground">No subject-wise tests are available at the moment.</p>
            </div>
        )}
        </div>
    );
}
