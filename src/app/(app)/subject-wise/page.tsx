'use client';
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Test, Subject } from "@/lib/types";
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from "@/hooks/use-translation";

export default function SubjectWiseTestsPage() {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchSubjectsWithTests = async () => {
            setIsLoading(true);
            try {
                // 1. Find all tests that are categorized as 'subject' wise or have a subjectId
                const testsRef = collection(firestore, 'tests');
                // A broader query to find any test linked to a subject
                const testsQuery = query(testsRef, where('subjectId', '!=', null));
                const testSnapshots = await getDocs(testsQuery);
                const tests = testSnapshots.docs.map(d => d.data() as Test);
                
                if (tests.length > 0) {
                    // 2. Get unique subject IDs from these tests
                    const subjectIds = [...new Set(tests.map(t => t.subjectId).filter(Boolean) as string[])];

                    if(subjectIds.length > 0) {
                        // 3. Fetch the subject details
                        const subjectsRef = collection(firestore, 'subjects');
                        const subjectsQuery = query(subjectsRef, where('__name__', 'in', subjectIds));
                        const subjectsSnapshot = await getDocs(subjectsQuery);
                        const subjectsData = subjectsSnapshot.docs.map(d => ({id: d.id, ...d.data() } as Subject));
                        setSubjects(subjectsData);
                    }
                }
            } catch (error) {
                console.error("Error fetching subjects with tests:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubjectsWithTests();
    }, [firestore]);


    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold">Subject-wise Tests</h1>
                <p className="text-muted-foreground mt-2">Focus your preparation on specific subjects.</p>
            </div>
            
            {isLoading && <p>Loading tests...</p>}

            {!isLoading && subjects && subjects.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <Card key={subject.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
                            <CardHeader>
                                <CardTitle>{language === 'ta' && subject.name_ta ? subject.name_ta : subject.name}</CardTitle>
                                <CardDescription>{language === 'ta' && subject.description_ta ? subject.description_ta : subject.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow"></CardContent>
                            <CardFooter>
                                 <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                                    <Link href={`/subject-wise/${subject.id}`}>
                                        {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                !isLoading && <div className="text-center py-16">
                <p className="text-muted-foreground">No subject-wise tests are available at the moment.</p>
                </div>
            )}
        </div>
    );
}
