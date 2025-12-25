'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useFirestore } from "@/firebase";
import type { Test, Subject, Class } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, collectionGroup } from "firebase/firestore";

export default function ClassPage() {
  const { classId } = useParams();
  const firestore = useFirestore();
  const [subjects, setSubjects] = useState<{ id: string; name: string; testCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [className, setClassName] = useState('');

  const classIdString = useMemo(() => Array.isArray(classId) ? classId[0] : classId, [classId]);

  useEffect(() => {
    if (!firestore || !classIdString) return;

    const fetchSubjectsAndTests = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch the class name for the page title
        const classDocRef = doc(firestore, 'classes', classIdString);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
            const classData = classSnap.data() as Class;
            setClassName(classData.name);
        } else {
            setClassName(`Class ${classIdString}`); // Fallback
        }

        // 2. Find all tests that belong to this class
        const testsRef = collection(firestore, 'tests');
        const testsQuery = query(testsRef, where('classId', '==', classIdString));
        const testSnapshots = await getDocs(testsQuery);
        const testsForClass = testSnapshots.docs.map(d => d.data() as Test);
        
        if (testsForClass.length === 0) {
            setSubjects([]);
            setIsLoading(false);
            return;
        }

        // 3. From these tests, get the unique subject IDs
        const subjectIds = [...new Set(testsForClass.map(t => t.subjectId).filter(Boolean) as string[])];

        if (subjectIds.length === 0) {
            setSubjects([]);
            setIsLoading(false);
            return;
        }
        
        // 4. Fetch the details for those subjects
        const subjectsRef = collection(firestore, 'subjects');
        // Firestore's 'in' query can handle up to 30 items. If more subjects per class are expected, pagination would be needed here.
        const subjectsQuery = query(subjectsRef, where('id', 'in', subjectIds));
        const subjectsSnapshot = await getDocs(subjectsQuery);

        const subjectsData = subjectsSnapshot.docs.map(d => d.data() as Subject);

        // 5. Count how many tests each subject has *for this specific class*
        const subjectsWithCounts = subjectsData.map(subject => {
            const count = testsForClass.filter(t => t.subjectId === subject.id).length;
            return {
                id: subject.id,
                name: subject.name,
                testCount: count
            }
        }).filter(s => s.testCount > 0); // Only show subjects that have tests in this class

        setSubjects(subjectsWithCounts);

      } catch (error) {
        console.error("Error fetching class subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectsAndTests();

  }, [firestore, classIdString]);

  const pageTitle = className ? `${className} பாடங்கள்` : "பாடங்கள் ஏற்றப்படுகின்றன...";
  const pageDescription = className ? `${className} பாடத்திட்டத்தின் அடிப்படையில் தேர்வுகள்.` : "";

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
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
