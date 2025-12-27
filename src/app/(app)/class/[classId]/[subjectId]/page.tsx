'use client';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDoc, doc } from "firebase/firestore";
import type { Test, Subject, Class } from "@/lib/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function TestStartControl({ test }: { test: Test }) {
  const [limit, setLimit] = useState<string>('');
  const questionCount = test.questionIds.length;
  const options = [10, 25, 50].filter(o => o < questionCount);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select onValueChange={setLimit} value={limit}>
        <SelectTrigger className="w-full sm:w-[120px]">
          <SelectValue placeholder="Questions" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => <SelectItem key={opt} value={String(opt)}>{opt} Questions</SelectItem>)}
          <SelectItem value={String(questionCount)}>All ({questionCount})</SelectItem>
        </SelectContent>
      </Select>
      <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
        <Link href={`/test/${test.slug}${limit ? `?limit=${limit}` : ''}`}>
          Start Test <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}


export default function SubjectTestsPage() {
  const { classId, subjectId } = useParams();
  const firestore = useFirestore();

  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');

  const classIdString = Array.isArray(classId) ? classId[0] : classId;
  const subjectIdString = Array.isArray(subjectId) ? subjectId[0] : subjectId;

  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);

  const subjectTestsQuery = useMemoFirebase(() => {
    if (!testsCollection || !classIdString || !subjectIdString) return null;
    
    return query(
      testsCollection, 
      where('classId', '==', classIdString),
      where('subjectId', '==', subjectIdString),
      where('category', '==', 'class')
    );
  }, [testsCollection, classIdString, subjectIdString]);

  const { data: subjectTests, isLoading } = useCollection<Test>(subjectTestsQuery);

  useEffect(() => {
    async function fetchMetadata() {
        if (!firestore) return;
        let className = `வகுப்பு ${classIdString}`;
        let subjectName = subjectIdString;

        try {
            const classDocRef = doc(firestore, 'classes', classIdString);
            const classSnap = await getDoc(classDocRef);
            if (classSnap.exists()) {
                className = (classSnap.data() as Class).name;
            }
        } catch (e) { console.error("Failed to fetch class name", e)}

        try {
            const subjectDocRef = doc(firestore, 'subjects', subjectIdString);
            const subjectSnap = await getDoc(subjectDocRef);
            if(subjectSnap.exists()){
                subjectName = (subjectSnap.data() as Subject).name;
            }
        } catch (e) { console.error("Failed to fetch subject name", e)}


        setPageTitle(`${className} - ${subjectName}`);
        setPageDescription(`இந்த பாடத்திற்கான தேர்வுகள் கீழே பட்டியலிடப்பட்டுள்ளன.`);
    }
    fetchMetadata();
  }, [firestore, classIdString, subjectIdString]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{isLoading ? 'Loading...' : pageTitle}</h1>
        <p className="text-muted-foreground mt-2">{pageDescription}</p>
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
                <TestStartControl test={test} />
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
