'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookText } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Class } from "@/lib/types";
import { useMemo } from "react";

export default function ClassWiseTestsPage() {
  const firestore = useFirestore();
  const classesCollection = useMemoFirebase(() => collection(firestore, 'classes'), [firestore]);
  const classesQuery = useMemoFirebase(() => classesCollection && query(classesCollection, orderBy('id')), [classesCollection]);

  const { data: classes, isLoading } = useCollection<Class>(classesQuery);

  const uniqueClasses = useMemo(() => {
    if (!classes) return [];
    const seen = new Set();
    return classes.filter(cls => {
      if (!cls.id) return false;
      const duplicate = seen.has(cls.id);
      seen.add(cls.id);
      return !duplicate;
    });
  }, [classes]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">வகுப்பு வாரியான தேர்வுகள்</h1>
        <p className="text-muted-foreground mt-2">கல்வி வகுப்பு தரங்களின்படி ஒழுங்கமைக்கப்பட்ட தேர்வுகள்.</p>
      </div>
      
      {isLoading && <p>Loading classes...</p>}

      {!isLoading && uniqueClasses && uniqueClasses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {uniqueClasses.map((cls) => (
            <Card key={cls.id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="flex-row items-center gap-4">
                <BookText className="w-8 h-8 text-primary" />
                <CardTitle className="text-xl">{cls.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                  <Link href={`/class/${cls.id}`}>
                    பாடங்களைக் காண்க <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && <div className="text-center py-16">
          <p className="text-muted-foreground">தற்போது வகுப்புகள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
