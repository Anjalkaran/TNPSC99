'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight, Book, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Class } from "@/lib/types";
import { useMemo, Suspense } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function OnlineTestsContent() {
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
    "text-emerald-500",
    "text-sky-500",
    "text-amber-500",
    "text-violet-500",
    "text-rose-500",
    "text-cyan-500",
    "text-fuchsia-500",
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back')}
          </Link>
        </Button>
        <h1 className="text-3xl md:text-4xl font-bold">{t('class_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">{t('class_wise_tests_desc')}</p>
      </div>
      
      {isLoading && <p>Loading classes...</p>}

      {!isLoading && sortedClasses && sortedClasses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {sortedClasses.map((cls, index) => {
            const themes = [
              { bg: 'bg-emerald-50/50', border: 'border-emerald-200', icon: 'text-emerald-500', ring: 'group-hover:ring-emerald-400', text: 'text-emerald-700' },
              { bg: 'bg-blue-50/50', border: 'border-blue-200', icon: 'text-blue-500', ring: 'group-hover:ring-blue-400', text: 'text-blue-700' },
              { bg: 'bg-amber-50/50', border: 'border-amber-200', icon: 'text-amber-500', ring: 'group-hover:ring-amber-400', text: 'text-amber-700' },
              { bg: 'bg-purple-50/50', border: 'border-purple-200', icon: 'text-purple-500', ring: 'group-hover:ring-purple-400', text: 'text-purple-700' },
              { bg: 'bg-rose-50/50', border: 'border-rose-200', icon: 'text-rose-500', ring: 'group-hover:ring-rose-400', text: 'text-rose-700' },
              { bg: 'bg-cyan-50/50', border: 'border-cyan-200', icon: 'text-cyan-500', ring: 'group-hover:ring-cyan-400', text: 'text-cyan-700' },
              { bg: 'bg-indigo-50/50', border: 'border-indigo-200', icon: 'text-indigo-500', ring: 'group-hover:ring-indigo-400', text: 'text-indigo-700' },
              { bg: 'bg-orange-50/50', border: 'border-orange-200', icon: 'text-orange-500', ring: 'group-hover:ring-orange-400', text: 'text-orange-700' },
            ];
            const theme = themes[index % themes.length];

            return (
              <Link key={cls.id} href={`/class/${cls.id}?bookType=${bookType}`} className="block hover:no-underline group">
                <Card className={cn(
                  "flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl text-center border-2",
                  theme.bg, theme.border, theme.ring, "hover:scale-[1.02]"
                )}>
                  <CardContent className="flex-grow p-6 flex flex-col items-center justify-center gap-4">
                    <div className={cn("p-4 rounded-2xl bg-white/50 shadow-sm", theme.icon.replace('text-', 'bg-').replace('500', '100'))}>
                      <Book className={cn("w-10 h-10", theme.icon)} />
                    </div>
                    <CardTitle className={cn("text-xl md:text-2xl font-bold", theme.text)}>{cls.name_ta || cls.name}</CardTitle>
                  </CardContent>
                  <CardFooter className="justify-center pb-6">
                    <div className={cn("flex items-center text-sm font-bold uppercase tracking-wider group-hover:underline", theme.text)}>
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

export default function OnlineTestsPage() {
  return (
    <Suspense fallback={<div>Loading tests...</div>}>
      <OnlineTestsContent />
    </Suspense>
  );
}
