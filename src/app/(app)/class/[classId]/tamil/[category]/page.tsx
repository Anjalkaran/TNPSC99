'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, getDoc, doc, getDocs } from "firebase/firestore";
import type { Test, Subject, Class, UserTestAttempt } from "@/lib/types";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


function TestStartControl({ test }: { test: Test }) {
  const { t } = useTranslation();
  const [limit, setLimit] = useState<string>('');
  const questionCount = test.questionIds.length;
  const options = [10, 25, 50].filter(o => o < questionCount);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Select onValueChange={setLimit} value={limit}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Select Questions" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={String(opt)}>{opt} Questions</SelectItem>)}
          <SelectItem value={String(questionCount)}>All ({questionCount})</SelectItem>
        </SelectContent>
      </Select>
      <Button asChild className="w-full sm:w-auto" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.id}${limit ? `?limit=${limit}` : ''}`}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
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
  
  const classId = useMemo(() => {
    const classIdParam = Array.isArray(params.classId) ? params.classId[0] : params.classId;
    return classIdParam ? decodeURIComponent(classIdParam) : '';
  }, [params.classId]);
  
  const category = useMemo(() => {
    const categoryParam = Array.isArray(params.category) ? params.category[0] : params.category;
    return categoryParam ? decodeURIComponent(categoryParam) : '';
  }, [params.category]);


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const categoryTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId) return null;
    
    const isIlakkanam = category === 'ilakkanam';
    const targetCategory = isIlakkanam ? 'இலக்கணம்' : 'உரைநடை & செய்யுள்';

    return query(
      testsCollection, 
      where('classId', '==', classId),
      where('subjectId', '==', subjectId),
      where('category', '==', targetCategory)
    );
  }, [testsCollection, classId, subjectId, category]);
  
  const { data: allTamilTests, isLoading: allTestsLoading } = useCollection<Test>(useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId) return null;
     return query(
      testsCollection, 
      where('classId', '==', classId),
      where('subjectId', '==', subjectId),
    );
  }, [testsCollection, classId, subjectId]));

  const { data: categoryTests, isLoading: testsLoading } = useCollection<Test>(categoryTestsQuery);

  const tests = useMemo(() => {
    const isIlakkanam = category === 'ilakkanam';
    
    const fromCategoryField = categoryTests || [];

    const fromUnitId = (allTamilTests || []).filter(test => {
        if (test.category) return false; // Already handled by categoryTestsQuery
        if (!test.unitId) return false;

        const unitIdEndsWithG = test.unitId.endsWith('g');
        return isIlakkanam ? unitIdEndsWithG : !unitIdEndsWithG;
    });

    const combined = [...fromCategoryField, ...fromUnitId];
    const uniqueTests = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    return uniqueTests.sort((a,b) => (a.unitNumber || 0) - (b.unitNumber || 0));

  }, [category, categoryTests, allTamilTests]);


  useEffect(() => {
    async function fetchMetadata() {
        if (!firestore) return;

        try {
            const subjectsRef = collection(firestore, 'subjects');
            const subjectQuery = query(subjectsRef, where('name', '==', 'Tamil'));
            const subjectSnap = await getDocs(subjectQuery);
            if(!subjectSnap.empty){
                setSubjectId(subjectSnap.docs[0].id);
            }
        } catch (e) { console.error("Failed to fetch subject Id", e)}
        
        const categoryName = category === 'ilakkanam' ? 'இலக்கணம்' : 'உரைநடை & செய்யுள்';
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
  }, [firestore, classId, t, language, category]);

  const getShortTestTitle = (test: Test) => {
    if (test.unitNumber && test.unitName) {
        return `இயல் ${test.unitNumber}: ${test.unitName}`;
    }
    return test.title;
  };

  if (testsLoading || allTestsLoading || !subjectId) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Loading...</h1>
            <p>Loading tests...</p>
        </div>
    );
  }

  const categoryName = category === 'ilakkanam' ? 'இலக்கணம்' : 'உரைநடை & செய்யுள்';

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{pageTitle}</h1>
      </div>
      
      {tests.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>{t('available_tests', { category: categoryName })}</CardTitle>
                <CardDescription>{t('select_a_test_to_start')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Test Title</TableHead>
                            <TableHead>Questions</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tests.map((test) => (
                            <TableRow key={test.id}>
                                <TableCell className="font-medium">{getShortTestTitle(test)}</TableCell>
                                <TableCell>
                                <div className="flex items-center gap-2">
                                    <span>{test.questionIds.length}</span>
                                    <TestProgressBadge testId={test.id} />
                                </div>
                                </TableCell>
                                <TableCell className="text-right">
                                <TestStartControl test={test} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
