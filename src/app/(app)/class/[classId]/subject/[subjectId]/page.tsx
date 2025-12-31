'use client';
import { notFound, useParams } from 'next/navigation';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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
                // Check if sessionQuestionIds and answers exist
                if (attempt.sessionQuestionIds && attempt.answers) {
                    attempt.answers.forEach((answer, index) => {
                        // An answer is considered attempted if it's not undefined or -1
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


export default function SubjectTestsPage() {
  const params = useParams();
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


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const subjectTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId) return null;
    return query(
      testsCollection, 
      where('classId', '==', classId),
      where('subjectId', '==', subjectId),
    );
  }, [testsCollection, classId, subjectId]);
  
  const categoriesCollection = useMemoFirebase(() => collection(firestore, 'categories'), [firestore]);
  const subjectCategoriesQuery = useMemoFirebase(() => {
      if (!categoriesCollection || !subjectId) return null;
      return query(categoriesCollection, where('subjectId', '==', subjectId));
  }, [categoriesCollection, subjectId]);


  const { data: subjectTests, isLoading: testsLoading } = useCollection<Test>(subjectTestsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(subjectCategoriesQuery);
  
  const categoryMap = useMemo(() => {
      if (!categories) return new Map<string, string>();
      return new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));
  }, [categories, language]);
  
  const testsByCategory = useMemo(() => {
    if (!subjectTests) return {};
    
    return subjectTests.reduce((acc, test) => {
        const categoryId = test.categoryId || 'uncategorized';
        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(test);
        // Sort tests within category by unit number
        acc[categoryId].sort((a,b) => (a.unitNumber || 0) - (b.unitNumber || 0));
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
    if (test.unitNumber && test.unitName) {
        return `இயல் ${test.unitNumber}: ${test.unitName}`;
    }
    const pageTitle = `${className} - ${subjectName}`;
    if (test.title.startsWith(`${pageTitle} - `)) {
      return test.title.substring(`${pageTitle} - `.length);
    }
    return test.title;
  };
  
  const isLoading = testsLoading || categoriesLoading;

  if (subjectId === 'tamil') {
    const tamilCategories = [
      {
        id: "urai",
        name: "உரைநடை & செய்யுள்",
        slug: "urai-seyyul",
        description: "உரைநடை மற்றும் செய்யுள் பகுதியிலிருந்து வரும் கேள்விகள்.",
      },
      {
        id: "ilakkanam",
        name: "இலக்கணம்",
        slug: "ilakkanam",
        description: "தமிழ் இலக்கண விதிகளின் அடிப்படையில் கேள்விகள்.",
      },
    ];

    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">{className} - {subjectName}</h1>
          <p className="text-muted-foreground mt-2">நீங்கள் பயிற்சி செய்ய விரும்பும் வகையைத் தேர்ந்தெடுக்கவும்.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {tamilCategories.map((category) => (
            <Card key={category.id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                  <p className="text-muted-foreground">{category.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                  <Link href={`/class/${classId}/tamil/${category.slug}`}>
                    {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Loading...</h1>
            <p>Loading tests...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{className} - {subjectName}</h1>
      </div>
      
      {subjectTests && subjectTests.length > 0 ? (
         <Card>
            <CardHeader>
                <CardTitle>{t('available_tests', { category: subjectName })}</CardTitle>
                <CardDescription>{t('select_a_test_to_start')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={sortedCategoryIds} className="w-full">
                 {sortedCategoryIds.map(categoryId => (
                     <AccordionItem value={categoryId} key={categoryId}>
                        <AccordionTrigger className="text-lg font-semibold">
                            {categoryId === 'uncategorized' ? 'Tests' : categoryMap.get(categoryId) || 'Category'}
                        </AccordionTrigger>
                        <AccordionContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test Title</TableHead>
                                        <TableHead>Questions</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testsByCategory[categoryId].map((test) => (
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
                        </AccordionContent>
                     </AccordionItem>
                 ))}
                </Accordion>
            </CardContent>
         </Card>
      ) : (
         <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
