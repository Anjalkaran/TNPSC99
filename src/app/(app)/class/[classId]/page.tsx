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
      where('classId', '==', classIdString)
    );
  }, [testsCollection, classIdString]);

  const { data: classTests, isLoading: testsLoading } = useCollection<Test>(classTestsQuery);

  const subjectsCollection = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const subjectsQuery = useMemoFirebase(() => {
      if(!subjectsCollection) return null;
      // For now, let's assume we can query all subjects and filter client-side.
      // This could be optimized if we had a classId on subjects.
      return query(subjectsCollection);
  }, [subjectsCollection]);

  const { data: allSubjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const subjects = useMemo(() => {
    if (testsLoading || subjectsLoading) return []; // Wait for data to load
    if (!classTests || !allSubjects) return [];
    
    const subjectMap = new Map<string, { name: string, tests: Test[], id: string }>();

    classTests.forEach(test => {
      if (test.subjectId) {
        if (!subjectMap.has(test.subjectId)) {
           const subjectInfo = allSubjects.find(s => s.id === test.subjectId);
           subjectMap.set(test.subjectId, { 
               name: subjectInfo?.name || test.subjectId, 
               tests: [], 
               id: test.subjectId 
            });
        }
        subjectMap.get(test.subjectId)!.tests.push(test);
      }
    });

    return Array.from(subjectMap.values());

  }, [classTests, allSubjects, testsLoading, subjectsLoading]);

  const className = classIdString ? `வகுப்பு ${classIdString}` : "வகுப்பு";
  const isLoading = testsLoading || subjectsLoading;

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
                <p className="text-muted-foreground mb-4">{tests.length} {tests.length !== 1 ? 'தேர்வுகள்' : 'தேர்வு'} உள்ளன.</p>
                <Button asChild variant="outline" className="w-full justify-start">
                    <Link href={`/class/${classIdString}/${id}`}>
                        தேர்வுகளைக் காண்க <ArrowRight className="ml-auto h-4 w-4" />
                    </Link>
                </Button>
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
