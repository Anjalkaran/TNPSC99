'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Test, Subject } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function ClassPage() {
  const { classId } = useParams();
  const firestore = useFirestore();

  const classIdString = useMemo(() => Array.isArray(classId) ? classId[0] : classId, [classId]);

  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const classTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classIdString) return null;
    return query(
      testsCollection, 
      where('category', '==', 'class'),
      where('classId', '==', classIdString)
    );
  }, [testsCollection, classIdString]);

  const { data: classTests, isLoading: testsLoading } = useCollection<Test>(classTestsQuery);

  const subjectsCollection = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const tamilSubjectQuery = useMemoFirebase(() => {
    if (!subjectsCollection || classIdString !== '6') return null;
    return query(subjectsCollection, where('id', '==', 'tamil'));
  }, [subjectsCollection, classIdString]);

  const { data: tamilSubject, isLoading: subjectLoading } = useCollection<Subject>(tamilSubjectQuery);

  const subjects = useMemo(() => {
    if (classIdString === '6') {
      const tamilTests = classTests?.filter(test => test.subjectId === 'tamil') || [];
      if (tamilSubject && tamilSubject.length > 0) {
        return [{ name: tamilSubject[0].name, tests: tamilTests, id: 'tamil' }];
      }
      return [];
    }

    if (!classTests) return [];
    
    const subjectMap = new Map<string, { tests: Test[], id?: string }>();
    classTests.forEach(test => {
      const subjectName = test.subjectId;
      if (subjectName) {
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, { tests: [], id: test.subjectId });
        }
        subjectMap.get(subjectName)!.tests.push(test);
      }
    });
    return Array.from(subjectMap.entries()).map(([name, data]) => ({ name: data.tests[0]?.title.split(' - ')[1] || name, ...data }));

  }, [classTests, classIdString, tamilSubject]);

  const className = classIdString ? `வகுப்பு ${classIdString}` : "வகுப்பு";
  const isLoading = testsLoading || subjectLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{className} பாடங்கள்</h1>
        <p className="text-muted-foreground mt-2">{className} பாடத்திட்டத்தின் அடிப்படையில் தேர்வுகள்.</p>
      </div>
      
      {isLoading && <p>பாடங்கள் ஏற்றப்படுகின்றன...</p>}

      {!isLoading && subjects && subjects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map(({ name, tests, id }) => (
             <Card key={id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <CardTitle className="text-xl">{name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                {tests.length > 0 ? (
                    <>
                        <p className="text-muted-foreground mb-4">{tests.length} {tests.length > 1 ? 'தேர்வுகள்' : 'தேர்வு'} உள்ளன.</p>
                        <div className="space-y-2">
                        {tests.map(test => (
                            <Button asChild key={test.slug} variant="outline" className="w-full justify-start">
                                <Link href={`/test/${test.slug}`}>
                                {test.title} <ArrowRight className="ml-auto h-4 w-4" />
                                </Link>
                            </Button>
                        ))}
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-muted-foreground mb-4">இந்த பாடத்திற்கு தற்போது தேர்வுகள் எதுவும் இல்லை.</p>
                        <Button asChild variant="outline" className="w-full justify-start" disabled>
                             <span>தேர்வுகளைக் காண்க <ArrowRight className="ml-auto h-4 w-4" /></span>
                        </Button>
                    </>
                )}

            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">இந்த வகுப்பிற்கு தற்போது பாடங்கள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
