'use client';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Test } from "@/lib/types";
import { useParams } from "next/navigation";

export default function SubjectTestsPage() {
  const { classId, subjectId } = useParams();
  const firestore = useFirestore();

  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const subjectTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classId || !subjectId) return null;
    const classIdString = Array.isArray(classId) ? classId[0] : classId;
    const subjectIdString = Array.isArray(subjectId) ? subjectId[0] : subjectId;
    
    return query(
      testsCollection, 
      where('classId', '==', classIdString),
      where('subjectId', '==', subjectIdString),
      where('category', '==', 'class')
    );
  }, [testsCollection, classId, subjectId]);

  const { data: subjectTests, isLoading } = useCollection<Test>(subjectTestsQuery);

  const subjectName = subjectId ? (Array.isArray(subjectId) ? subjectId[0] : subjectId) : "Subject";
  const className = classId ? `வகுப்பு ${classId}` : "வகுப்பு";

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{className} - {subjectName}</h1>
        <p className="text-muted-foreground mt-2">இந்த பாடத்திற்கான தேர்வுகள் கீழே பட்டியலிடப்பட்டுள்ளன.</p>
      </div>
      
      {isLoading && <p>Loading tests...</p>}

      {!isLoading && subjectTests && subjectTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectTests.map((test) => (
            <Card key={test.slug} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <Image
                src={test.image.imageUrl}
                alt={test.title}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint={test.image.imageHint}
              />
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
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">இந்த பாடத்திற்கு தற்போது தேர்வுகள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
