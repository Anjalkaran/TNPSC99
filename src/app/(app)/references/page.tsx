'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { ReferenceMaterial, Class, Subject } from '@/lib/types';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function ReferenceMaterialsPage() {
  const firestore = useFirestore();
  const { t, language } = useTranslation();

  const materialsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'referencematerials') : null, [firestore]);
  const materialsQuery = useMemoFirebase(() => materialsCollection ? query(materialsCollection, orderBy('createdAt', 'desc')) : null, [materialsCollection]);
  const { data: materials, isLoading: materialsLoading } = useCollection<ReferenceMaterial>(materialsQuery);

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

  const classMap = useMemo(() => {
    if (!classes) return new Map<string, string>();
    return new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
  }, [classes, language]);
  
  const subjectMap = useMemo(() => {
    if (!subjects) return new Map<string, string>();
    return new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));
  }, [subjects, language]);

  const materialsByClass = useMemo(() => {
    if (!materials) return {};
    return materials.reduce((acc, material) => {
      const classId = material.classId;
      if (!acc[classId]) {
        acc[classId] = [];
      }
      acc[classId].push(material);
      return acc;
    }, {} as Record<string, ReferenceMaterial[]>);
  }, [materials]);

  const isLoading = materialsLoading || classesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Reference Materials</CardTitle>
          <CardDescription>Browse and download available reference documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading materials...</p> : (
            Object.keys(materialsByClass).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-4">
                {Object.entries(materialsByClass).map(([classId, classMaterials]) => (
                  <AccordionItem value={classId} key={classId}>
                    <AccordionTrigger className="text-xl font-bold p-4 bg-muted rounded-md">
                      {classMap.get(classId) || `Class ${classId}`}
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {classMaterials.map(material => (
                          <Card key={material.id}>
                            <CardHeader>
                              <CardTitle>{material.title}</CardTitle>
                              <CardDescription>{subjectMap.get(material.subjectId) || `Subject ${material.subjectId}`}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                            </CardContent>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download PDF
                                    </Link>
                                </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : <p className="text-center text-muted-foreground p-8">No reference materials have been uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
