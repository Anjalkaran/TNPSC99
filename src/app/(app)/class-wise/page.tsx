'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookCopy, Archive } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Class } from "@/lib/types";
import { useMemo } from "react";
import { useTranslation } from "@/hooks/use-translation";

export default function ClassWiseTestsPage() {
  const firestore = useFirestore();
  const { language } = useTranslation();
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">வகுப்பு வாரியான தேர்வுகள்</h1>
        <p className="text-muted-foreground mt-2">கல்வி வகுப்பு தரங்களின்படி ஒழுங்கமைக்கப்பட்ட தேர்வுகள்.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Samacheer Kalvi Books Card */}
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                <BookCopy className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Samacheer Kalvi Books</CardTitle>
                    <CardDescription>Tests based on the current Samacheer Kalvi curriculum.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <p>Loading classes...</p>
                    </div>
                ) : sortedClasses && sortedClasses.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedClasses.map((cls) => (
                        <Card key={cls.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col items-center text-center justify-center">
                                <h3 className="font-semibold text-lg mb-3">{cls.name_ta || cls.name}</h3>
                                <Button asChild size="sm" className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                                <Link href={`/class/${cls.id}`}>
                                    பாடங்களைக் காண்க <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">தற்போது வகுப்புகள் எதுவும் இல்லை.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {/* Old Books Card */}
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                <Archive className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Old Books</CardTitle>
                    <CardDescription>Practice tests from older syllabus books.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg font-semibold">விரைவில் வருகிறது</p>
                    <p>பழைய புத்தகங்களில் இருந்து தேர்வுகள் இங்கு சேர்க்கப்படும்.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
