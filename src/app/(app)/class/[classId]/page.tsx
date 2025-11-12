'use client';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Test } from "@/lib/types";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function ClassPage() {
  const { classId } = useParams();
  const firestore = useFirestore();

  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const classTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId) return null;
    const classIdString = Array.isArray(classId) ? classId[0] : classId;
    return query(
      testsCollection, 
      where('category', '==', 'class'),
      where('classId', '==', classIdString)
    );
  }, [testsCollection, classId]);

  const { data: classTests, isLoading } = useCollection<Test>(classTestsQuery);

  const subjects = useMemo(() => {
    if (!classTests) return [];
    const subjectMap = new Map<string, Test[]>();
    classTests.forEach(test => {
      // Extract subject from title, assuming format "வகுப்பு X - Subject"
      const subjectName = test.title.split(' - ')[1];
      if (subjectName) {
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, []);
        }
        subjectMap.get(subjectName)!.push(test);
      }
    });
    return Array.from(subjectMap.entries()).map(([name, tests]) => ({ name, tests }));
  }, [classTests]);

  const className = classId ? `வகுப்பு ${classId}` : "வகுப்பு";

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{className} பாடங்கள்</h1>
        <p className="text-muted-foreground mt-2">{className} பாடத்திட்டத்தின் அடிப்படையில் தேர்வுகள்.</p>
      </div>
      
      {isLoading && <p>Loading subjects...</p>}

      {!isLoading && subjects && subjects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map(({ name, tests }) => (
             <Card key={name} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <CardTitle className="text-xl">{name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <p className="text-muted-foreground mb-4">{tests.length} {tests.length > 1 ? 'தேர்வுகள்' : 'தேர்வு'} உள்ளன.</p>
              <div className="space-y-2">
                {tests.map(test => (
                  <Button asChild key={test.slug} variant="outline" className="w-full justify-start">
                    <Link href={`/test/${test.slug}`}>
                      {test.title} <ArrowRight className="ml-auto h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">இந்த வகுப்பிற்கு தற்போது பாடங்கள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
