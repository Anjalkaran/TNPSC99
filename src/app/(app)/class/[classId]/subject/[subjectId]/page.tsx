'use client';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from "@/firebase";
import { collection, query, where, doc, getDocs, getDoc } from "firebase/firestore";
import type { Test, Subject, UserTestAttempt, Unit, Class, Category } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from '@/components/ui/badge';


function TestStartControl({ test }: { test: Test }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState<string>('');
  const questionCount = test.questionIds.length;
  const options = [10, 25, 50].filter(o => o < questionCount);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full justify-end">
      <Select onValueChange={setLimit} value={limit}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('select_questions')} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={String(opt)}>{t('questions_count', { count: opt })}</SelectItem>)}
          <SelectItem value={String(questionCount)}>{t('all_questions', { count: questionCount })}</SelectItem>
        </SelectContent>
      </Select>
      <Button asChild className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.id}${limit ? `?limit=${limit}` : ''}`}>
          {t('start_test')} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function TestProgressBadge({ testId }: { testId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [answeredCount, setAnsweredCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !firestore || !testId) {
            setIsLoading(false);
            return;
        };

        const fetchAttempts = async () => {
            setIsLoading(true);
            const attemptsRef = collection(firestore, `users/${user.uid}/testAttempts`);
            const attemptsQuery = query(attemptsRef, where('testId', '==', testId));
            const attemptsSnapshot = await getDocs(attemptsQuery);

            const attemptedQuestionIds = new Set<string>();
            attemptsSnapshot.forEach(doc => {
                const attempt = doc.data() as UserTestAttempt;
                if (attempt.sessionQuestions && attempt.answers) {
                    attempt.answers.forEach((answer, index) => {
                        if (answer !== undefined && answer !== -1) {
                            const questionId = attempt.sessionQuestions?.[index]?.id;
                            if (questionId) {
                                attemptedQuestionIds.add(questionId);
                            }
                        }
                    });
                }
            });
            setAnsweredCount(attemptedQuestionIds.size);
            setIsLoading(false);
        };

        fetchAttempts();
    }, [user, firestore, testId]);

    if (isLoading) {
        return <Badge variant="outline">Loading...</Badge>;
    }
    
    if (answeredCount === 0) return null;

    return (
         <Badge variant="secondary">
            {answeredCount} attended
        </Badge>
    )
}


export default function SubjectTestsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { t, language } = useTranslation();

  const [className, setClassName] = useState('');
  
  const classId = useMemo(() => {
    const classIdParam = Array.isArray(params.classId) ? params.classId[0] : params.classId;
    return classIdParam ? decodeURIComponent(classIdParam) : '';
  }, [params.classId]);

  const subjectId = useMemo(() => {
    const subjectIdParam = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
    return subjectIdParam ? decodeURIComponent(subjectIdParam) : '';
  }, [params.subjectId]);

  const selectedCategoryId = searchParams.get('category');
  const bookType = searchParams.get('bookType') || 'samacheer';


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const subjectTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId) return null;
    return query(
      testsCollection, 
      where('classId', '==', classId),
      where('subjectId', '==', subjectId)
    );
  }, [testsCollection, classId, subjectId]);
  
  const { data: allSubjectTests, isLoading: testsLoading } = useCollection<Test>(subjectTestsQuery);
  
  const subjectTests = useMemo(() => {
      if (!allSubjectTests) return null;
      return allSubjectTests.filter(test => (test.bookType || 'samacheer') === bookType);
  }, [allSubjectTests, bookType]);
  
  const categoriesCollection = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const subjectCategoriesQuery = useMemoFirebase(() => {
      if (!categoriesCollection || !subjectId) return null;
      return query(categoriesCollection, where('subjectId', '==', subjectId));
  }, [categoriesCollection, subjectId]);


  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(subjectCategoriesQuery);
  
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, string>();
    
    const categoryTranslations: { [key: string]: string } = {
      'History': 'வரலாறு',
      'Geography': 'புவியியல்',
      'Civics': 'குடிமையியல்',
      'Economics': 'பொருளியல்',
    };

    return new Map(categories.map(cat => {
        let name = cat.name;
        if (language === 'ta') {
            if (cat.name_ta) {
                name = cat.name_ta;
            } else if (categoryTranslations[cat.name]) {
                name = categoryTranslations[cat.name];
            }
        }
        return [cat.id, name];
    }));
  }, [categories, language]);
  
  const testsByCategory = useMemo(() => {
    if (!subjectTests) return {};
    
    return subjectTests.reduce((acc, test) => {
        const categoryId = test.categoryId || 'uncategorized';
        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(test);
        return acc;
    }, {} as Record<string, Test[]>);

  }, [subjectTests]);

  const sortedCategoryIds = useMemo(() => Object.keys(testsByCategory).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    return (categoryMap.get(a) || '').localeCompare(categoryMap.get(b) || '');
  }), [testsByCategory, categoryMap]);

  const [subjectName, setSubjectName] = useState(subjectId);

  useEffect(() => {
    async function fetchMetadata() {
        if (!firestore || !classId || !subjectId) return;
        
        let fetchedClassName = `Class ${classId}`;
        let fetchedSubjectName = subjectId;

        try {
            const classDocRef = doc(firestore, 'classes', classId);
            const classSnap = await getDoc(classDocRef);
            if (classSnap.exists()) {
                const classData = classSnap.data() as Class;
                fetchedClassName = language === 'ta' && classData.name_ta ? classData.name_ta : classData.name;
            }
        } catch (e) { console.error("Failed to fetch class name", e)}

        try {
             const subjectDocRef = doc(firestore, 'subjects', subjectId);
             const subjectSnap = await getDoc(subjectDocRef);
             if(subjectSnap.exists()){
                 const subjectData = subjectSnap.data() as Subject;
                 fetchedSubjectName = language === 'ta' && subjectData.name_ta ? subjectData.name_ta : subjectData.name;
             }
        } catch (e) { console.error("Failed to fetch subject name", e)}

        setClassName(fetchedClassName);
        setSubjectName(fetchedSubjectName);
        document.title = `${fetchedClassName} - ${fetchedSubjectName}`;
    }

    fetchMetadata();
  }, [firestore, classId, subjectId, language]);

  const getShortTestTitle = (test: Test) => {
    let title = test.title;
    if (test.unitNumber && test.unitName) {
      title = `இயல் ${test.unitNumber}: ${test.unitName}`;
      if (test.term && test.term !== 'Full Book') {
        title = `${test.term} - ${title}`;
      }
    }
    return title;
  };
  
  const isLoading = testsLoading || categoriesLoading;

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Loading...</h1>
            <p>Loading tests...</p>
        </div>
    );
  }

  if (selectedCategoryId) {
      const categoryName = selectedCategoryId === 'uncategorized' ? 'Uncategorized Tests' : categoryMap.get(selectedCategoryId) || 'Category';
      const testsForCategory = (testsByCategory[selectedCategoryId] || []).sort((a,b) => {
        const getTermNumber = (termStr?: string) => {
            if (!termStr) return 99;
            const match = termStr.match(/\d+/);
            return match ? parseInt(match[0], 10) : 99;
        };
        
        const termNumA = getTermNumber(a.term);
        const termNumB = getTermNumber(b.term);

        if (termNumA !== termNumB) {
            return termNumA - termNumB;
        }

        const unitA = a.unitNumber || 0;
        const unitB = b.unitNumber || 0;
        return unitA - unitB;
      });
      
      return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="mb-8">
                <Button asChild variant="ghost" className="mb-4">
                    <Link href={`/class/${classId}/subject/${subjectId}?bookType=${bookType}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back_to_categories')}
                    </Link>
                </Button>
                <h1 className="text-3xl md:text-4xl font-bold">{className} - {subjectName}</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('available_tests', { category: categoryName })}</CardTitle>
                    <CardDescription>{t('select_a_test_to_start')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {testsForCategory.map((test) => (
                            <Card key={test.id}>
                                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-grow">
                                        <p className="font-medium">{getShortTestTitle(test)}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{test.questionIds.length} {t('questions')}</span>
                                            <TestProgressBadge testId={test.id} />
                                        </div>
                                    </div>
                                    <div className="w-full md:w-auto shrink-0 md:min-w-[300px]">
                                        <TestStartControl test={test} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href={`/class/${classId}?bookType=${bookType}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back_to_subjects')}
            </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold">{className} - {subjectName}</h1>
        <p className="text-muted-foreground mt-2">{t('select_category_to_view_tests')}</p>
      </div>
      
      {sortedCategoryIds.length > 0 && subjectTests && subjectTests.length > 0 ? (
         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCategoryIds.map(catId => {
                const categoryName = catId === 'uncategorized' ? 'Uncategorized' : categoryMap.get(catId) || 'Category';
                const testCount = testsByCategory[catId]?.length || 0;
                if (testCount === 0) return null;
                
                return (
                    <Card key={catId} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{categoryName}</CardTitle>
                            <CardDescription>{testCount} {testCount > 1 ? 'tests' : 'test'} available</CardDescription>
                        </CardHeader>
                        <CardFooter className="mt-auto">
                            <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                                <Link href={`/class/${classId}/subject/${subjectId}?category=${catId}&bookType=${bookType}`}>
                                    View Tests <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
         </div>
      ) : (
         <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
