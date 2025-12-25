'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Test, Subject } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

export default function ClassPage() {
  const { classId } = useParams();
  const firestore = useFirestore();
  const [subjects, setSubjects] = useState<{ id: string; name: string; tests: Test[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const classIdString = useMemo(() => Array.isArray(classId) ? classId[0] : classId, [classId]);

  useEffect(() => {
    if (!firestore || !classIdString) return;

    const fetchSubjectsAndTests = async () => {
      setIsLoading(true);
      
      const testsCollection = collection(firestore, 'tests');
      const classTestsQuery = query(testsCollection, where('classId', '==', classIdString));
      
      const querySnapshot = await getDocs(classTestsQuery);
      const classTests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Test[];

      if (classTests.length === 0) {
        setSubjects([]);
        setIsLoading(false);
        return;
      }
      
      const subjectIds = [...new Set(classTests.map(test => test.subjectId).filter(Boolean) as string[])];

      if (subjectIds.length === 0) {
          setSubjects([]);
          setIsLoading(false);
          return;
      }

      const subjectsCollection = collection(firestore, 'subjects');
      const subjectsQuery = query(subjectsCollection, where('id', 'in', subjectIds));
      
      const subjectsSnapshot = await getDocs(subjectsQuery);
      const subjectsData = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[];

      const subjectsWithTests = subjectsData.map(subject => {
        const testsForSubject = classTests.filter(test => test.subjectId === subject.id);
        return {
          id: subject.id,
          name: subject.name,
          tests: testsForSubject,
        };
      });

      setSubjects(subjectsWithTests);
      setIsLoading(false);
    };

    fetchSubjectsAndTests();

  }, [firestore, classIdString]);


  const className = classIdString ? `வகுப்பு ${classIdString}` : "வகுப்பு";

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
