'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import type { Subject, Test } from "@/lib/types";
import { useEffect, useState } from "react";

export default function OnlineTestsPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [subjectsWithTests, setSubjectsWithTests] = useState<(Subject & { testCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchSubjectsAndTests = async () => {
      setIsLoading(true);
      try {
        const testsSnapshot = await getDocs(query(collection(firestore, 'tests')));
        const tests = testsSnapshot.docs.map(doc => doc.data() as Test);
        const subjectIdsWithTests = [...new Set(tests.map(test => test.subjectId).filter(Boolean))];

        if (subjectIdsWithTests.length > 0) {
          const subjectsSnapshot = await getDocs(query(collection(firestore, 'subjects'), where('id', 'in', subjectIdsWithTests)));
          const subjectsData = subjectsSnapshot.docs.map(doc => doc.data() as Subject);

          const subjects = subjectsData.map(subject => ({
            ...subject,
            testCount: tests.filter(test => test.subjectId === subject.id).length
          }));

          setSubjectsWithTests(subjects);
        } else {
          setSubjectsWithTests([]);
        }
      } catch (error) {
        console.error("Error fetching subjects and tests: ", error);
        setSubjectsWithTests([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectsAndTests();
  }, [firestore]);


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{t('subject_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">{t('subject_wise_tests_desc')}</p>
      </div>
      
      {isLoading && <p>Loading subjects...</p>}

      {!isLoading && subjectsWithTests && subjectsWithTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjectsWithTests.map((subject) => (
            <Card key={subject.id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex-row items-center gap-4">
                <BookOpen className="w-8 h-8 text-primary" />
                <CardTitle className="text-xl">{subject.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <p className="text-muted-foreground mb-4">{subject.testCount} {subject.testCount > 1 ? 'tests' : 'test'} available</p>
                <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                  <Link href={`/subject-wise/${subject.id}`}>
                    {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
         !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">No subjects with tests found.</p>
        </div>
      )}
    </div>
  );
}
