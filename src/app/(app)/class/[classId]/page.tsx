'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useFirestore } from '@/firebase';
import type { Test, Subject, Class } from '@/lib/types';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function GenerateMcqPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { t, language } = useTranslation();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [className, setClassName] = useState('');

  const classId = useMemo(() => {
    const classIdParam = Array.isArray(params.classId) ? params.classId[0] : params.classId;
    return classIdParam ? decodeURIComponent(classIdParam) : '';
  }, [params.classId]);

  useEffect(() => {
    if (!firestore || !classId) return;

    const fetchClassAndSubjects = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Class Name
        const classDocRef = doc(firestore, 'classes', classId);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const classData = classSnap.data() as Class;
          setClassName(language === 'ta' && classData.name_ta ? classData.name_ta : classData.name);
        } else {
          setClassName(`Class ${classId}`); // Fallback
        }

        // 2. Find tests associated with this class
        const testsRef = collection(firestore, 'tests');
        const testsQuery = query(testsRef, where('classId', '==', classId));
        const testSnapshots = await getDocs(testsQuery);
        const testsForClass = testSnapshots.docs.map(d => d.data() as Test);
        
        if (testsForClass.length > 0) {
            // 3. Get unique subject IDs from these tests
            const subjectIds = [...new Set(testsForClass.map(t => t.subjectId).filter(Boolean) as string[])];

            if(subjectIds.length > 0) {
                 // 4. Fetch the subject details
                const subjectsRef = collection(firestore, 'subjects');
                const subjectsQuery = query(subjectsRef, where('__name__', 'in', subjectIds));
                const subjectsSnapshot = await getDocs(subjectsQuery);
                const subjectsData = subjectsSnapshot.docs.map(d => ({id: d.id, ...d.data() } as Subject));
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
  }, [firestore, classId, language]);
  

  const pageTitle = isLoading ? "Loading..." : t('subjects_for_class', { className });
  const pageDescription = t('select_subject_to_view_tests');

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle>{pageTitle}</CardTitle>
                <CardDescription>{pageDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <p>Loading subjects...</p>
                ) : subjects.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {subjects.map(subject => {
                            const href = `/class/${classId}/subject/${subject.id}`;
                            
                            return (
                                <AccordionItem value={subject.id} key={subject.id}>
                                    <AccordionTrigger className="text-lg">
                                    {language === 'ta' && subject.name_ta ? subject.name_ta : subject.name}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-muted-foreground mb-4">
                                            {language === 'ta' && subject.description_ta ? subject.description_ta : subject.description}
                                        </p>
                                        <Button asChild>
                                            <Link href={href}>
                                                {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground text-center">No subjects with available tests for this class.</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
