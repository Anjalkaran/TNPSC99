'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import type { Test, Subject, Class } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function GenerateMcqPage() {
  const { classId } = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [className, setClassName] = useState('');
  const [testSlug, setTestSlug] = useState<string | null>(null);

  const classIdString = useMemo(() => (Array.isArray(classId) ? classId[0] : classId), [classId]);

  useEffect(() => {
    if (!firestore || !classIdString) return;

    const fetchClassAndSubjects = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Class Name
        const classDocRef = doc(firestore, 'classes', classIdString);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          setClassName((classSnap.data() as Class).name);
        } else {
          setClassName(`Class ${classIdString}`); // Fallback
        }

        // 2. Find tests associated with this class
        const testsRef = collection(firestore, 'tests');
        const testsQuery = query(testsRef, where('classId', '==', classIdString));
        const testSnapshots = await getDocs(testsQuery);
        const testsForClass = testSnapshots.docs.map(d => d.data() as Test);
        
        if (testsForClass.length > 0) {
            // 3. Get unique subject IDs from these tests
            const subjectIds = [...new Set(testsForClass.map(t => t.subjectId).filter(Boolean) as string[])];

            if(subjectIds.length > 0) {
                 // 4. Fetch the subject details
                const subjectsRef = collection(firestore, 'subjects');
                const subjectsQuery = query(subjectsRef, where('id', 'in', subjectIds));
                const subjectsSnapshot = await getDocs(subjectsQuery);
                const subjectsData = subjectsSnapshot.docs.map(d => d.data() as Subject);
                setSubjects(subjectsData);
            }
        }
      } catch (error) {
        console.error("Error fetching class/subject data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassAndSubjects();
  }, [firestore, classIdString]);
  
  useEffect(() => {
      const findTest = async () => {
          if (!firestore || !classIdString || !selectedSubjectId) {
              setTestSlug(null);
              return;
          };

          const testsRef = collection(firestore, 'tests');
          const q = query(
              testsRef, 
              where('classId', '==', classIdString),
              where('subjectId', '==', selectedSubjectId),
              where('category', '==', 'class')
          );
          
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              // Assuming one test per class/subject combo for this logic
              setTestSlug(querySnapshot.docs[0].data().slug);
          } else {
              setTestSlug(null);
          }
      };

      findTest();

  }, [firestore, classIdString, selectedSubjectId]);

  const handleStartExam = () => {
    if (testSlug) {
      router.push(`/test/${testSlug}`);
    }
  };

  const pageTitle = isLoading ? "Loading..." : `Start Test for ${className}`;
  const pageDescription = "Select a subject from the dropdown to begin the test.";

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>{pageTitle}</CardTitle>
                <CardDescription>{pageDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <p>Loading subjects...</p>
                ) : subjects.length > 0 ? (
                    <div className="space-y-2">
                        <Label htmlFor="subject-select">Subject</Label>
                        <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId}>
                            <SelectTrigger id="subject-select">
                                <SelectValue placeholder="Select a subject..." />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map(subject => (
                                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center">No subjects with available tests for this class.</p>
                )}
                 <Button 
                    onClick={handleStartExam} 
                    disabled={!selectedSubjectId || !testSlug || isLoading}
                    className="w-full"
                 >
                    Start Exam
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
