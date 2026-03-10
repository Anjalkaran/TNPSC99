'use client';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import type { Test, Subject, Class } from '@/lib/types';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, QueryConstraint } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, BookText } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function ClassSubjectsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { t, language } = useTranslation();
  
  const bookType = searchParams.get('bookType');

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
        const classDocRef = doc(firestore, 'classes', classId);
        const classSnap = await getDoc(classDocRef);
        if (classSnap.exists()) {
          const classData = classSnap.data() as Class;
          setClassName(language === 'ta' && classData.name_ta ? classData.name_ta : classData.name);
        } else {
          setClassName(`Class ${classId}`);
        }

        const testsRef = collection(firestore, 'tests');
        const testsQuery = query(testsRef, where('classId', '==', classId));
        const testSnapshots = await getDocs(testsQuery);
        
        const allTestsForClass = testSnapshots.docs.map(d => d.data() as Test);
        
        const effectiveBookType = bookType || 'samacheer';
        const testsForClass = allTestsForClass.filter(test => 
            (test.bookType || 'samacheer') === effectiveBookType
        );
        
        if (testsForClass.length > 0) {
            const subjectIds = [...new Set(testsForClass.map(t => t.subjectId).filter(Boolean) as string[])];
            if(subjectIds.length > 0) {
                const subjectsRef = collection(firestore, 'subjects');
                const subjectsQuery = query(subjectsRef, where('__name__', 'in', subjectIds));
                const subjectsSnapshot = await getDocs(subjectsQuery);
                const subjectsData = subjectsSnapshot.docs.map(d => ({id: d.id, ...d.data() } as Subject));
                setSubjects(subjectsData);
            } else {
                setSubjects([]);
            }
        } else {
            setSubjects([]);
        }
      } catch (error) {
        console.error("Error fetching class/subject data:", error);
        setSubjects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassAndSubjects();
  }, [firestore, classId, language, bookType]);
  

  const pageTitle = isLoading ? "Loading..." : t('subjects_for_class', { className });
  const pageDescription = t('select_subject_to_view_tests');

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href="/class-wise">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back_to_classes')}
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
      </div>

      {isLoading ? (
        <p>Loading subjects...</p>
      ) : subjects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map(subject => {
            const isTamilSubject = subject.id === 'tamil';
            const href = isTamilSubject
                ? `/class/${classId}/tamil${bookType ? `?bookType=${bookType}`: ''}`
                : `/class/${classId}/subject/${subject.id}${bookType ? `?bookType=${bookType}`: ''}`;

            return (
              <Link key={subject.id} href={href} className="block hover:no-underline group">
                <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:ring-1 group-hover:ring-primary">
                  <CardHeader className="flex-row items-center gap-4">
                    <BookText className="w-8 h-8 text-primary" />
                    <CardTitle className="text-xl">{language === 'ta' && subject.name_ta ? subject.name_ta : subject.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground text-sm">
                        {language === 'ta' && subject.description_ta ? subject.description_ta : subject.description}
                    </p>
                  </CardContent>
                  <CardFooter>
                      <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                          {t('view_tests')}
                          <ArrowRight className="ml-2 h-4 w-4" />
                      </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No subjects with available tests for this class.</p>
        </div>
      )}
    </div>
  );
}
