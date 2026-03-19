'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight, Book } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Class } from "@/lib/types";
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function OnlineTestsPage() {
  const firestore = useFirestore();
  const { language, t } = useTranslation();
  const searchParams = useSearchParams();
  const bookType = searchParams.get('bookType') || 'samacheer';

  const classesCollection = useMemoFirebase(() => collection(firestore, 'classes'), [firestore]);
  const classesQuery = useMemoFirebase(() => classesCollection && query(classesCollection), [classesCollection]);

  const { data: classes, isLoading } = useCollection<Class>(classesQuery);

  const sortedClasses = useMemo(() => {
    if (!classes) return [];
    
    const sorted = [...classes].sort((a, b) => {
        const getNumber = (cls: Class) => {
            const nameToUse = language === 'ta' && cls.name_ta ? cls.name_ta : cls.name;
            const match = nameToUse.match(/\d+/);
            if (match) {
                return parseInt(match[0], 10);
            }
            const idMatch = cls.id.match(/\d+/);
            if (idMatch) {
                return parseInt(idMatch[0], 10);
            }
            return Infinity; 
        };

        const numA = getNumber(a);
        const numB = getNumber(b);

        return numA - numB;
    });

    const seen = new Set();
    return sorted.filter(cls => {
      if (!cls.id) return false;
      const duplicate = seen.has(cls.id);
      seen.add(cls.id);
      return !duplicate;
    });
  }, [classes, language]);
  
  const iconColors = [
    "text-blue-500",
    "text-green-500",
    "text-red-500",
    "text-yellow-500",
    "text-indigo-500",
    "text-purple-500",
    "text-pink-500",
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{t('class_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">{t('class_wise_tests_desc')}</p>
      </div>
      
      {isLoading && <p>Loading classes...</p>}

      {!isLoading && sortedClasses && sortedClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedClasses.map((cls, index) => {
            return (
              <Link key={cls.id} href={`/class/${cls.id}?bookType=${bookType}`} className="block hover:no-underline group">
                <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl text-center group-hover:ring-1 group-hover:ring-primary">
                  <CardContent className="flex-grow p-6 flex flex-col items-center justify-center gap-4">
                    <Book className={cn("w-10 h-10", iconColors[index % iconColors.length])} />
                    <CardTitle className="text-xl">{cls.name_ta || cls.name}</CardTitle>
                  </CardContent>
                  <CardFooter className="justify-center">
                    <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                        {t('view_tests')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
          )})}
        </div>
      ) : (
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">தற்போது வகுப்புகள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
