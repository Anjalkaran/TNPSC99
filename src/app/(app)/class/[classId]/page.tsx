'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useFirestore } from "@/firebase";
import type { Test, Subject } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ClassPage() {
  const { classId } = useParams();
  const firestore = useFirestore();
  const [subjects, setSubjects] = useState<{ id: string; name: string; testCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const classIdString = useMemo(() => Array.isArray(classId) ? classId[0] : classId, [classId]);

  useEffect(() => {
    if (!firestore || !classIdString) return;

    const fetchSubjectsAndTests = async () => {
      setIsLoading(true);
      try {
        const testsCollectionRef = collection(firestore, 'tests');
        const classTestsQuery = query(testsCollectionRef, where('classId', '==', classIdString));
        
        const querySnapshot = await getDocs(classTestsQuery);
        const classTests = querySnapshot.docs.map(doc => doc.data() as Test);

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

        const subjectsCollectionRef = collection(firestore, 'subjects');
        // Firestore 'in' queries are limited to 30 elements. If you expect more subjects, this needs pagination.
        const subjectsQuery = query(subjectsCollectionRef, where('id', 'in', subjectIds));
        
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));

        const subjectsWithTestCounts = subjectsData.map(subject => {
          const testCount = classTests.filter(test => test.subjectId === subject.id).length;
          return {
            id: subject.id,
            name: subject.name,
            testCount: testCount,
          };
        }).filter(s => s.testCount > 0); // Only show subjects that actually have tests

        setSubjects(subjectsWithTestCounts);
      } catch (error) {
        console.error("Error fetching class subjects:", error);
        // Optionally set an error state to show in the UI
      } finally {
        setIsLoading(false);
      }
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

      {!isLoading && subjects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map(({ name, testCount, id }) => (
             <Card key={id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <CardTitle className="text-xl">{name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
                <p className="text-muted-foreground mb-4">{testCount} {testCount !== 1 ? 'தேர்வுகள்' : 'தேர்வு'} உள்ளன.</p>
                <Button asChild variant="outline" className="w-full justify-start mt-auto">
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
