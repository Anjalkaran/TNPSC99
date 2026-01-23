'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, getDoc, doc, getDocs } from "firebase/firestore";
import type { Test, Subject, Class, UserTestAttempt, Category } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from "@/hooks/use-translation";
import { Badge } from "@/components/ui/badge";


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
                if (attempt.sessionQuestionIds && attempt.answers) {
                    attempt.answers.forEach((answer, index) => {
                        if (answer !== undefined && answer !== -1) {
                            const questionId = attempt.sessionQuestionIds?.[index];
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


export default function TamilCategoryTestsPage() {
  const params = useParams();
  const firestore = useFirestore();
  const { t, language } = useTranslation();

  const [pageTitle, setPageTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  const classId = useMemo(() => {
    const classIdParam = Array.isArray(params.classId) ? params.classId[0] : params.classId;
    return classIdParam ? decodeURIComponent(classIdParam) : '';
  }, [params.classId]);
  
  const categorySlug = useMemo(() => {
    const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
    return categoryParam ? decodeURIComponent(categoryParam) : '';
  }, [params.category]);


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const categoryTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId || !categoryId) return null;
    
    return query(
      testsCollection, 
      where('classId', '==', classId),
      where('subjectId', '==', subjectId),
      where('categoryId', '==', categoryId)
    );
  }, [testsCollection, classId, subjectId, categoryId]);
  
  const { data: tests, isLoading: testsLoading } = useCollection<Test>(categoryTestsQuery);


  useEffect(() => {
    async function fetchMetadata() {
        if (!firestore || !categorySlug) return;
        let categoryName = categorySlug;

        try {
            // Find Subject ID for 'Tamil'
            const subjectsRef = collection(firestore, 'subjects');
            const subjectQuery = query(subjectsRef, where('name', '==', 'Tamil'));
            const subjectSnap = await getDocs(subjectQuery);
            if(!subjectSnap.empty){
                const foundSubjectId = subjectSnap.docs[0].id
                setSubjectId(foundSubjectId);
                
                // Find Category ID based on slug
                let catName: string;
                if (categorySlug === 'ilakkanam') {
                    catName = 'இலக்கணம்';
                } else if (categorySlug === 'urai-seyyul') {
                    catName = 'உரைநடை & செய்யுள்';
                } else {
                    catName = 'மற்றவை';
                }

                const categoriesRef = collection(firestore, 'categories');
                const categoryQuery = query(categoriesRef, where('subjectId', '==', foundSubjectId), where('name_ta', '==', catName));
                const catSnap = await getDocs(categoryQuery);
                if (!catSnap.empty) {
                    const foundCategory = catSnap.docs[0].data() as Category;
                    setCategoryId(catSnap.docs[0].id);
                    categoryName = language === 'ta' && foundCategory.name_ta ? foundCategory.name_ta : foundCategory.name;
                }
            }
        } catch (e) { console.error("Failed to fetch subject/category Id", e)}
        
        let className = `Class ${classId}`;
        try {
            const classDocRef = doc(firestore, 'classes', classId);
            const classSnap = await getDoc(classDocRef);
            if (classSnap.exists()) {
                const classData = classSnap.data() as Class;
                className = language === 'ta' && classData.name_ta ? classData.name_ta : classData.name;
            }
        } catch (e) { console.error("Failed to fetch class name", e)}
        
        const title = `${className} - தமிழ் - ${categoryName}`;
        setPageTitle(title);
        document.title = title;
    }

    fetchMetadata();
  }, [firestore, classId, t, language, categorySlug]);

  const sortedTests = useMemo(() => {
    if (!tests) return [];
    return [...tests].sort((a,b) => {
        const termA = a.term || '';
        const termB = b.term || '';
        const unitA = a.unitNumber || 0;
        const unitB = b.unitNumber || 0;

        if (termA.localeCompare(termB) !== 0) {
            return termA.localeCompare(termB);
        }
        return unitA - unitB;
    });
  }, [tests]);

  const getShortTestTitle = (test: Test) => {
    if (test.unitNumber && test.unitName) {
        let title = `இயல் ${test.unitNumber}: ${test.unitName}`;
        if (test.term) {
            title = `${test.term} - ${title}`;
        }
        return title;
    }
    return test.title;
  };

  const isLoading = testsLoading || !subjectId || !categoryId;

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Loading...</h1>
            <p>Loading tests...</p>
        </div>
    );
  }

  const categoryName = categorySlug === 'ilakkanam' ? 'இலக்கணம்' : 'உரைநடை & செய்யுள்';

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
      </div>
      
      {sortedTests.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>{t('available_tests', { category: categoryName })}</CardTitle>
                <CardDescription>{t('select_a_test_to_start')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sortedTests.map((test) => (
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
      ) : (
         <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this category yet.</p>
        </div>
      )}
    </div>
  );
}
