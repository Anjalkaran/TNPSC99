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
        
        const allTestsForClass = testSnapshots.docs
            .map(d => d.data() as Test)
            .filter(test => !test.isMockTest);
        
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
                
                // Custom sort: Tamil first
                const sortedSubjects = [...subjectsData].sort((a, b) => {
                  const nameA = (a.name || '').toLowerCase();
                  const nameB = (b.name || '').toLowerCase();
                  const nameTaA = (a.name_ta || '').toLowerCase();
                  const nameTaB = (b.name_ta || '').toLowerCase();
                  
                  const isTamilA = nameA.includes('tamil') || nameA.includes('தமிழ்') || 
                                   nameTaA.includes('தமிழ்') || a.id === 'tamil' || a.id === 'தமிழ்';
                  const isTamilB = nameB.includes('tamil') || nameB.includes('தமிழ்') || 
                                   nameTaB.includes('தமிழ்') || b.id === 'tamil' || b.id === 'தமிழ்';
                  
                  if (isTamilA && !isTamilB) return -1;
                  if (!isTamilA && isTamilB) return 1;
                  return 0;
                });
                
                setSubjects(sortedSubjects);
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
            <Link href={`/online-tests${bookType ? `?bookType=${bookType}`: ''}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map((subject, index) => {
            const isTamilSubject = subject.id === 'tamil';
            const href = isTamilSubject
                ? `/class/${classId}/tamil${bookType ? `?bookType=${bookType}`: ''}`
                : `/class/${classId}/subject/${subject.id}${bookType ? `?bookType=${bookType}`: ''}`;

            const getSubjectTheme = (s: Subject, index: number) => {
              const name = (s.name || '').toLowerCase();
              const nameTa = (s.name_ta || '').toLowerCase();
              const id = (s.id || '').toLowerCase();
              
              const themes = [
                { // Rose
                  bg: 'bg-rose-50/50', border: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-600', ring: 'group-hover:ring-rose-400', text: 'text-rose-700' 
                },
                { // Blue
                  bg: 'bg-blue-50/50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-600', ring: 'group-hover:ring-blue-400', text: 'text-blue-700' 
                },
                { // Emerald
                  bg: 'bg-emerald-50/50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'group-hover:ring-emerald-400', text: 'text-emerald-700' 
                },
                { // Amber
                  bg: 'bg-amber-50/50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconText: 'text-amber-600', ring: 'group-hover:ring-amber-400', text: 'text-amber-700' 
                },
                { // Purple
                  bg: 'bg-purple-50/50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconText: 'text-purple-600', ring: 'group-hover:ring-purple-400', text: 'text-purple-700' 
                },
                { // Indigo
                  bg: 'bg-indigo-50/50', border: 'border-indigo-200', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', ring: 'group-hover:ring-indigo-400', text: 'text-indigo-700' 
                },
                { // Cyan
                  bg: 'bg-cyan-50/50', border: 'border-cyan-200', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600', ring: 'group-hover:ring-cyan-400', text: 'text-cyan-700' 
                },
                { // Orange
                  bg: 'bg-orange-50/50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-600', ring: 'group-hover:ring-orange-400', text: 'text-orange-700' 
                }
              ];

              // Try mapping by name first for consistency
              if (name.includes('tamil') || name.includes('தமிழ்') || nameTa.includes('தமிழ்') || id === 'tamil' || id === 'தமிழ்') return themes[0];
              if (name.includes('english')) return themes[1];
              if ((name.includes('science') || name.includes('அறிவியல்') || nameTa.includes('அறிவியல்')) && !name.includes('social') && !nameTa.includes('சமூக')) return themes[2];
              if (name.includes('social') || name.includes('சமூக') || nameTa.includes('சமூக')) return themes[3];
              if (name.includes('gk') || name.includes('general knowledge')) return themes[4];
              if (name.includes('maths') || name.includes('mathematics')) return themes[5];

              // Fallback to index-based for perfect variety
              return themes[index % themes.length];
            };

            const theme = getSubjectTheme(subject, index);

            return (
              <Link key={subject.id} href={href} className="block hover:no-underline group">
                <Card className={`flex h-full flex-col overflow-hidden transition-all duration-300 border ${theme.border} ${theme.bg} hover:shadow-xl hover:shadow-${theme.text.split('-')[1]}-200/50 group-hover:ring-1 ${theme.ring}`}>
                  <CardHeader className="flex-row items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${theme.iconBg} transition-colors duration-300`}>
                      <BookText className={`w-6 h-6 ${theme.iconText}`} />
                    </div>
                    <CardTitle className={`text-2xl font-bold ${theme.text}`}>
                      {language === 'ta' && subject.name_ta ? subject.name_ta : subject.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground text-base line-clamp-3">
                        {language === 'ta' && subject.description_ta ? subject.description_ta : subject.description}
                    </p>
                  </CardContent>
                  <CardFooter>
                      <div className={`flex items-center text-base font-bold ${theme.text} group-hover:translate-x-1 transition-transform duration-300`}>
                          {t('view_tests')}
                          <ArrowRight className="ml-2 h-5 w-5" />
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
