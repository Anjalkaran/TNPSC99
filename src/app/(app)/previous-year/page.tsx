'use client';
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Test } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

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

export default function PreviousYearPapersPage() {
  const firestore = useFirestore();
  const testsCollection = useMemoFirebase(() => collection(firestore, 'tests'), [firestore]);
  const previousTestsQuery = useMemoFirebase(() => testsCollection && query(testsCollection, where('category', '==', 'previous')), [testsCollection]);

  const { data: previousYearTests, isLoading } = useCollection<Test>(previousTestsQuery);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">முந்தைய ஆண்டு தாள்கள்</h1>
        <p className="text-muted-foreground mt-2">கடந்த காலத் தாள்களுடன் தேர்வு முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.</p>
      </div>

      {isLoading && <p>Loading tests...</p>}

      {!isLoading && previousYearTests && previousYearTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {previousYearTests.map((test) => (
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
          <p className="text-muted-foreground">தற்போது முந்தைய ஆண்டு தாள்கள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
