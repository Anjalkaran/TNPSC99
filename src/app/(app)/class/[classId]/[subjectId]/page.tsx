'use client';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

            const correctlyAnsweredIds = new Set<string>();
            attemptsSnapshot.forEach(doc => {
                const attempt = doc.data() as UserTestAttempt;
                if (attempt.correctlyAnsweredQuestionIds) {
                    attempt.correctlyAnsweredQuestionIds.forEach(id => correctlyAnsweredIds.add(id));
                }
            });
            setAnsweredCount(correctlyAnsweredIds.size);
            setIsLoading(false);
        };

        fetchAttempts();
    }, [user, firestore, testId]);

    if (isLoading) {
        return <Badge variant="outline">Loading...</Badge>;
    }

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
  const [pageDescription, setPageDescription] = useState('');

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
      where('category', '==', 'class')
    );
  }, [testsCollection, classId, subjectId]);

  const { data: subjectTests, isLoading } = useCollection<Test>(subjectTestsQuery);
  
  const sortedTests = useMemo(() => {
    if (!subjectTests) return [];
    
    const termOrder: { [key: string]: number } = {
        "பருவம் 1": 1,
        "பருவம் 2": 2,
        "பருவம் 3": 3,
        "Full Book": 4,
    };

    return [...subjectTests].sort((a, b) => {
        const termA = a.term ? termOrder[a.term] || 99 : 99;
        const termB = b.term ? termOrder[b.term] || 99 : 99;

        if (termA !== termB) {
            return termA - termB;
        }
        
        const unitA = a.unitNumber || 99;
        const unitB = b.unitNumber || 99;
        
        return unitA - unitB;
    });
  }, [subjectTests]);

  useEffect(() => {
    async function fetchMetadata() {
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


        setPageTitle(`${className} - ${subjectName}`);
        setPageDescription(`Tests for the subject ${subjectName} in ${className} are listed below.`);
    }
    if (classId && subjectId) {
      fetchMetadata();
    }
  }, [firestore, classId, subjectId, t, language]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{isLoading ? 'Loading...' : pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
      </div>
      
      {isLoading && <p>Loading tests...</p>}

      {!isLoading && sortedTests && sortedTests.length > 0 ? (
        <Card>
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
                {sortedTests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
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
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">No tests are available for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
