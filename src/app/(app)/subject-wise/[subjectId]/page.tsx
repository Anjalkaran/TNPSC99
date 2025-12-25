'use client';
import { notFound, useParams } from 'next/navigation';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { Test, Subject } from "@/lib/types";

export default function SubjectTestsForSubjectPage() {
  const { subjectId } = useParams();
  const firestore = useFirestore();

  const subjectIdString = Array.isArray(subjectId) ? subjectId[0] : subjectId;

  const subjectRef = useMemoFirebase(() => {
    if (!firestore || !subjectIdString) return null;
    return doc(firestore, 'subjects', subjectIdString);
  }, [firestore, subjectIdString]);
  const { data: subject, isLoading: subjectLoading } = useDoc<Subject>(subjectRef);


  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);
  const subjectTestsQuery = useMemoFirebase(() => {
      if (!testsCollection || !subjectIdString) return null;
      return query(testsCollection, where('subjectId', '==', subjectIdString));
  }, [testsCollection, subjectIdString]);
  
  const { data: subjectTests, isLoading: testsLoading } = useCollection<Test>(subjectTestsQuery);
  
  if (subjectLoading || testsLoading) {
      return <div className="container mx-auto px-4 py-8 md:py-12"><p>Loading tests...</p></div>;
  }

  if (!subject) {
      return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{subject.name} Tests</h1>
        <p className="text-muted-foreground mt-2">{subject.description}</p>
      </div>
      
      {subjectTests && subjectTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectTests.map((test) => (
            <Card key={test.slug} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {test.image && (
                <Image
                  src={test.image.imageUrl}
                  alt={test.title}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                  data-ai-hint={test.image.imageHint}
                />
              )}
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{test.questionIds.length} கேள்விகள்</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                  <Link href={`/test/${test.slug}`}>
                    தேர்வைத் தொடங்கவும் <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">இந்த பாடத்திற்கு தற்போது தேர்வுகள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
