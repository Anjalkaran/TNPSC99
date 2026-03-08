'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { StudyMaterial, Class, Subject } from '@/lib/types';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Download } from 'lucide-react';

export default function StudyMaterialPage() {
  const { t, language } = useTranslation();
  const firestore = useFirestore();

  const materialsQuery = useMemoFirebase(() => collection(firestore, 'studyMaterials'), [firestore]);
  const { data: materials, isLoading: materialsLoading } = useCollection<StudyMaterial>(materialsQuery);

  const classesQuery = useMemoFirebase(() => collection(firestore, 'classes'), [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesQuery);

  const subjectsQuery = useMemoFirebase(() => collection(firestore, 'subjects'), [firestore]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);

  const groupedMaterials = useMemo(() => {
    if (!materials || !classes || !subjects) return {};
    
    const classMap = new Map(classes.map(c => [c.id, language === 'ta' ? c.name_ta || c.name : c.name]));
    const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' ? s.name_ta || s.name : s.name]));

    return materials.reduce((acc, material) => {
      const className = classMap.get(material.classId) || 'Uncategorized';
      const subjectName = subjectMap.get(material.subjectId) || 'Uncategorized';

      if (!acc[className]) acc[className] = {};
      if (!acc[className][subjectName]) acc[className][subjectName] = [];
      
      acc[className][subjectName].push(material);
      return acc;
    }, {} as Record<string, Record<string, StudyMaterial[]>>);

  }, [materials, classes, subjects, language]);
  
  const isLoading = materialsLoading || classesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Study Materials</h1>
        <p className="text-muted-foreground mt-2">Download school books and other study materials in PDF format.</p>
      </div>

      {isLoading ? (
        <p>Loading materials...</p>
      ) : Object.keys(groupedMaterials).length > 0 ? (
        <Accordion type="multiple" className="w-full space-y-4">
          {Object.entries(groupedMaterials).map(([className, subjects]) => (
            <AccordionItem value={className} key={className} className="border-b-0">
              <Card>
                <AccordionTrigger className="p-4 text-xl font-bold hover:no-underline">{className}</AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <Accordion type="multiple" className="w-full space-y-4" defaultValue={Object.keys(subjects)}>
                    {Object.entries(subjects).map(([subjectName, bookList]) => (
                      <AccordionItem value={subjectName} key={subjectName} className="border-b-0">
                        <Card className="bg-muted/50">
                          <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">{subjectName}</AccordionTrigger>
                          <AccordionContent className="pt-0 p-4 space-y-3">
                            {bookList.map((book) => (
                              <Card key={book.id} className="bg-background">
                                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex-grow">
                                    <p className="font-medium">{book.fileName}</p>
                                    <div className="text-sm text-muted-foreground space-x-2">
                                      <span>{book.term}</span>
                                      <span>&bull;</span>
                                      <span>{book.medium}</span>
                                      <span>&bull;</span>
                                      <span>{book.bookType}</span>
                                    </div>
                                  </div>
                                  <Button asChild>
                                    <Link href={book.downloadURL} target="_blank" rel="noopener noreferrer">
                                      <Download className="mr-2 h-4 w-4" />
                                      Download
                                    </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No study materials have been uploaded yet.</p>
        </div>
      )}
    </div>
  );
}

    