'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { StudyMaterial, Class, Subject } from '@/lib/types';
import { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaterialWithNames extends StudyMaterial {
  className: string;
  subjectName: string;
}

export default function StudyMaterialPage() {
  const { t, language } = useTranslation();
  const firestore = useFirestore();

  const materialsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'studymaterials') : null, [firestore]);
  const materialsQuery = useMemoFirebase(() => materialsCollection ? query(materialsCollection, orderBy('createdAt', 'desc')) : null, [materialsCollection]);
  
  const { data: materials, isLoading: materialsLoading } = useCollection<StudyMaterial>(materialsQuery);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]));
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]));

  const groupedMaterials = useMemo(() => {
    if (!materials || !classes || !subjects) return {};
    
    const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
    const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));

    const materialsWithNames: MaterialWithNames[] = materials.map(material => ({
      ...material,
      className: classMap.get(material.classId) || 'Unknown Class',
      subjectName: subjectMap.get(material.subjectId) || 'Unknown Subject',
    }));

    return materialsWithNames.reduce((acc, material) => {
      const { classId, className, subjectId, subjectName } = material;
      if (!acc[classId]) {
        acc[classId] = { name: className, subjects: {} };
      }
      if (!acc[classId].subjects[subjectId]) {
        acc[classId].subjects[subjectId] = { name: subjectName, materials: [] };
      }
      acc[classId].subjects[subjectId].materials.push(material);
      return acc;
    }, {} as Record<string, { name: string; subjects: Record<string, { name: string; materials: StudyMaterial[] }> }>);

  }, [materials, classes, subjects, language]);
  
  const isLoading = materialsLoading || classesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('study_material')}</CardTitle>
          <CardDescription>{t('study_material_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('loading_users')}</p>
          ) : Object.keys(groupedMaterials).length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4">
              {Object.entries(groupedMaterials).map(([classId, classData]) => (
                <AccordionItem value={classId} key={classId} className="border-b-0">
                  <Card>
                    <CardHeader className="p-0">
                      <AccordionTrigger className="p-4 text-xl font-semibold">
                        {classData.name}
                      </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent className="p-4">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {Object.entries(classData.subjects).map(([subjectId, subjectData]) => (
                          <AccordionItem value={subjectId} key={subjectId} className="border-b-0 rounded-md bg-muted/50">
                            <AccordionTrigger className="px-4 py-3 font-medium">
                              {subjectData.name}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <ul className="space-y-3 pt-2">
                                {subjectData.materials.map(material => (
                                  <li key={material.id} className="flex justify-between items-center p-3 border rounded-md bg-background">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                      <div className="flex-grow">
                                        <p className="font-semibold">{material.title}</p>
                                        <p className="text-xs text-muted-foreground">{material.description}</p>
                                      </div>
                                    </div>
                                    <Button asChild variant="secondary" size="sm">
                                      <Link href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('download')}
                                      </Link>
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">{t('no_study_materials')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
