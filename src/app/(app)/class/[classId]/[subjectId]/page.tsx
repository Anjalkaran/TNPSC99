'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, getDoc, doc, getDocs } from "firebase/firestore";
import type { Test, Subject, Class, UserTestAttempt, Unit } from "@/lib/types";
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

  const [pageTitle, setPageTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const { data: subjectTests, isLoading: testsLoading } = useCollection<Test>(subjectTestsQuery);
  
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());
  const [unitsLoading, setUnitsLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
        if (!firestore || !subjectTests || subjectTests.length === 0) {
            setUnitsLoading(false);
            return;
        }

        const unitIds = [...new Set(subjectTests.map(t => t.unitId).filter(Boolean) as string[])];

        if (unitIds.length === 0) {
            setUnitsLoading(false);
            return;
        }

        setUnitsLoading(true);
        const map = new Map<string, Unit>();
        const unitIdChunks: string[][] = [];
        for (let i = 0; i < unitIds.length; i += 30) {
            unitIdChunks.push(unitIds.slice(i, i + 30));
        }
        
        const unitsCollectionRef = collection(firestore, 'units');

        try {
            for (const chunk of unitIdChunks) {
                if (chunk.length > 0) {
                    const unitsQuery = query(unitsCollectionRef, where('__name__', 'in', chunk));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    unitsSnapshot.forEach(doc => {
                        map.set(doc.id, { id: doc.id, ...doc.data() } as Unit);
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching units: ", error);
        } finally {
            setUnitsMap(map);
            setUnitsLoading(false);
        }
    };

    fetchUnits();
  }, [firestore, subjectTests]);

  const groupedAndSortedTests = useMemo(() => {
    if (!subjectTests || testsLoading || unitsLoading) return {};

    const grouped = subjectTests.reduce((acc, test) => {
        const unit = test.unitId ? unitsMap.get(test.unitId) : undefined;
        const category = unit?.category || "Uncategorized";
        
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(test);
        return acc;
    }, {} as Record<string, Test[]>);
    
    // Sort tests within each category by unit number
    for (const category in grouped) {
        grouped[category].sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0));
    }
    
    return grouped;
  }, [subjectTests, testsLoading, unitsLoading, unitsMap]);


  useEffect(() => {
    async function fetchMetadataAndSetTitle() {
        if (!firestore) return;
        let className = `Class ${classId}`;
        let subjectName = subjectId;

        try {
            if (classId) {
                const classDocRef = doc(firestore, 'classes', classId);
                const classSnap = await getDoc(classDocRef);
                if (classSnap.exists()) {
                    const classData = classSnap.data() as Class;
                    className = language === 'ta' && classData.name_ta ? classData.name_ta : classData.name;
                }
            }
        } catch (e) { console.error("Failed to fetch class name", e)}

        try {
             if (subjectId) {
                const subjectDocRef = doc(firestore, 'subjects', subjectId);
                const subjectSnap = await getDoc(subjectDocRef);
                if(subjectSnap.exists()){
                    const subjectData = subjectSnap.data() as Subject;
                    subjectName = language === 'ta' && subjectData.name_ta ? subjectData.name_ta : subjectData.name;
                }
            }
        } catch (e) { console.error("Failed to fetch subject name", e)}

        const title = `${className} - ${subjectName}`;
        setPageTitle(title);
        document.title = title;
    }
    if (classId && subjectId) {
      fetchMetadataAndSetTitle();
    }
  }, [firestore, classId, subjectId, t, language]);

  const getShortTestTitle = (test: Test) => {
    const unit = test.unitId ? unitsMap.get(test.unitId) : undefined;
    if (unit) {
        return `இயல் ${unit.unitNumber}: ${unit.unitName}`;
    }
    // Fallback logic
    if (pageTitle && test.title.startsWith(`${pageTitle} - `)) {
      return test.title.substring(`${pageTitle} - `.length);
    }
    return test.title;
  };

  const isLoading = testsLoading || unitsLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{isLoading ? 'Loading...' : pageTitle}</h1>
        {selectedCategory && (
            <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="mt-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Categories
            </Button>
        )}
      </div>
      
      {isLoading && <p>Loading tests...</p>}

      {!isLoading && !selectedCategory && Object.keys(groupedAndSortedTests).length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedAndSortedTests).map(([category, tests]) => (
                 <Card key={category} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer" onClick={() => setSelectedCategory(category)}>
                    <CardHeader>
                        <CardTitle>{category}</CardTitle>
                        <CardDescription>{tests.length} {tests.length === 1 ? 'test' : 'tests'} available</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-end">
                        <Button variant="link" className="p-0">
                            View Tests <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                 </Card>
            ))}
        </div>
      ) : null}

      {!isLoading && selectedCategory && groupedAndSortedTests[selectedCategory] ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedCategory}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Title</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedAndSortedTests[selectedCategory].map((test) => (
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
      ) : null}

      {!isLoading && Object.keys(groupedAndSortedTests).length === 0 && (
         <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
