'use client';

import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc, getDocs, query, where, writeBatch, deleteField } from 'firebase/firestore';
import type { Subject, Class, Unit, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Edit, Trash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const unitFormSchema = z.object({
  bookType: z.enum(['samacheer', 'old'], { required_error: "Please select a book type." }),
  classId: z.string().min(1, { message: "Please select a class." }),
  subjectName: z.string().min(1, { message: "Subject name must be at least 1 character." }),
  term: z.string().min(1, { message: "Please select a term." }),
  addUnitForFullBook: z.enum(['yes', 'no']).optional(),
  unitNumber: z.coerce.number().optional(),
  unitName: z.string().optional(),
  categoryName: z.string().optional(),
}).superRefine((data, ctx) => {
    const needsUnit = data.term !== 'Full Book' || (data.term === 'Full Book' && data.addUnitForFullBook === 'yes');

    if (needsUnit && data.term) {
        if (data.unitNumber === undefined || data.unitNumber < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['unitNumber'],
                message: "Unit number must be at least 1.",
            });
        }
        if (!data.unitName || data.unitName.trim().length < 1) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['unitName'],
                message: 'Unit name must be at least 1 character.',
            });
        }
    }
});


type UnitFormValues = z.infer<typeof unitFormSchema>;

function EditUnitForm({ unit, classes, subjects, onFinished }: { unit: Unit, classes: Class[] | null | undefined, subjects: Subject[] | null | undefined, onFinished: () => void }) {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sortedClasses = useMemo(() => {
        if (!classes) return [];
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
        return [...classes].sort((a, b) => getNumber(a) - getNumber(b));
    }, [classes, language]);

    const form = useForm<UnitFormValues>({
        resolver: zodResolver(unitFormSchema),
        defaultValues: {
            bookType: unit.bookType || 'samacheer',
            classId: unit.classId,
            subjectName: unit.subjectName || '',
            term: unit.term,
            unitNumber: unit.unitNumber || undefined,
            unitName: unit.unitName || '',
            categoryName: unit.categoryName || '',
            addUnitForFullBook: unit.term === 'Full Book' && unit.unitNumber ? 'yes' : (unit.term === 'Full Book' ? 'no' : undefined)
        },
    });

    const classIdValue = form.watch('classId');
    const selectedClass = classes?.find(c => c.id === classIdValue);
    const classNameValue = selectedClass?.name || '';
    const classNumber = parseInt(classNameValue.match(/\d+/) || ['0'][0]);

    const showTermField = true;

    useEffect(() => {
        if (!showTermField) {
            form.setValue('term', 'Full Book');
        }
    }, [showTermField, form]);

    const termValue = form.watch('term');
    const addUnitForFullBookValue = form.watch('addUnitForFullBook');
    
    const showFullBookUnitQuestion = termValue === 'Full Book';
    const showUnitFields = termValue !== 'Full Book' || (termValue === 'Full Book' && addUnitForFullBookValue === 'yes');

    useEffect(() => {
        if (termValue !== 'Full Book') {
            form.setValue('addUnitForFullBook', undefined);
        }
    }, [termValue, form]);

    useEffect(() => {
        if (!showUnitFields) {
            form.setValue('unitNumber', undefined);
            form.setValue('unitName', '');
        }
    }, [showUnitFields, form]);

    const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            const { bookType, classId, subjectName, term, unitNumber, unitName, categoryName, addUnitForFullBook } = values;
            
            const subjectsRef = collection(firestore, 'subjects');
            const subjectQuery = query(subjectsRef, where('name', '==', subjectName));
            const subjectSnapshot = await getDocs(subjectQuery);

            let subjectId: string;
            if (subjectSnapshot.empty) {
                const newSubjectRef = doc(subjectsRef);
                const newSubject: Subject = { id: newSubjectRef.id, name: subjectName, description: `Subject for TNPSC exams` };
                await setDoc(newSubjectRef, newSubject);
                subjectId = newSubjectRef.id;
            } else {
                subjectId = subjectSnapshot.docs[0].id;
            }

            let categoryId: string | undefined = undefined;
            if (categoryName && subjectId) {
                const categoriesRef = collection(firestore, 'categories');
                const categoryQuery = query(categoriesRef, where('name', '==', categoryName), where('subjectId', '==', subjectId));
                const categorySnapshot = await getDocs(categoryQuery);

                if(categorySnapshot.empty) {
                    const newCategoryRef = doc(categoriesRef);
                    const newCategory: Category = {
                        id: newCategoryRef.id,
                        name: categoryName,
                        subjectId: subjectId
                    };
                    await setDoc(newCategoryRef, newCategory);
                    categoryId = newCategoryRef.id;
                } else {
                    categoryId = categorySnapshot.docs[0].id;
                }
            }


            const unitDocRef = doc(firestore, 'units', unit.id);
            const unitData: { [key: string]: any } = {
                classId,
                subjectId,
                term: showTermField ? term : 'Full Book',
                bookType,
            };
            
            if (categoryId) {
                unitData.categoryId = categoryId;
            } else {
                unitData.categoryId = deleteField();
            }

            const shouldAddUnitDetails = term !== 'Full Book' || (term === 'Full Book' && addUnitForFullBook === 'yes');

            if (shouldAddUnitDetails) {
                unitData.unitNumber = unitNumber;
                unitData.unitName = unitName;
            } else {
                unitData.unitNumber = deleteField();
                unitData.unitName = deleteField();
            }

            await updateDoc(unitDocRef, unitData);

            toast({
                title: t('Unit Updated!'),
                description: t('The unit "{{unitName}}" has been successfully updated.', { unitName: values.unitName || unit.unitName || '' }),
            });
            onFinished();
        } catch (error) {
            console.error('Error updating unit:', error);
            toast({
                variant: 'destructive',
                title: t('Error Updating Unit'),
                description: (error as Error).message || t('There was a problem updating the unit.'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bookType"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Book Type</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                              >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="samacheer" /></FormControl>
                                      <FormLabel className="font-normal">Samacheer Kalvi</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="old" /></FormControl>
                                      <FormLabel className="font-normal">Old Book</FormLabel>
                                  </FormItem>
                              </RadioGroup>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('class_name')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!classes}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_a_class')} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sortedClasses?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="subjectName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('subject_name')}</FormLabel>
                            <FormControl>
                                <Input placeholder={t('subject_name_placeholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

               <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., இலக்கணம்" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
                
                {(showTermField || termValue === 'Full Book') && (
                    <FormField
                        control={form.control}
                        name="term"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('Term')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select a Term')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="பருவம் 1">பருவம் 1</SelectItem>
                                        <SelectItem value="பருவம் 2">பருவம் 2</SelectItem>
                                        <SelectItem value="பருவம் 3">பருவம் 3</SelectItem>
                                        <SelectItem value="Full Book">Full Book</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                
                {showFullBookUnitQuestion && (
                    <FormField
                        control={form.control}
                        name="addUnitForFullBook"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Add unit for full book?</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex gap-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="yes" /></FormControl>
                                            <FormLabel className="font-normal">Yes</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="no" /></FormControl>
                                            <FormLabel className="font-normal">No</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {showUnitFields && (
                    <>
                        <FormField
                            control={form.control}
                            name="unitNumber"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>{t('Unit')}</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select a unit" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                                                <SelectItem key={num} value={String(num)}>இயல் {num}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="unitName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('Unit Name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('Name of the unit')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">{t('cancel')}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? t('Updating Unit...') : t('Update Unit')}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function ExistingUnitsList() {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

    const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: units, isLoading } = useCollection<Unit>(unitsCollection);

    const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes } = useCollection<Class>(classesCollection);
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects } = useCollection<Subject>(subjectsCollection);
    const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesCollection);

    const groupedUnits = useMemo(() => {
        if (!units || !classes || !subjects || !categories) return {};

        const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));
        const categoryMap = new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));

        const mappedUnits = units.map(unit => ({
            ...unit,
            bookType: unit.bookType || 'samacheer',
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || unit.subjectId,
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }));
        
        const groupedByBookType: Record<string, Record<string, typeof mappedUnits[0][]>> = {
            samacheer: {},
            old: {}
        };
        
        mappedUnits.forEach(unit => {
            const bookTypeKey = unit.bookType;
            if (!groupedByBookType[bookTypeKey]) groupedByBookType[bookTypeKey] = {};

            const classKey = unit.className;
            if (!groupedByBookType[bookTypeKey][classKey]) {
                groupedByBookType[bookTypeKey][classKey] = [];
            }
            groupedByBookType[bookTypeKey][classKey].push(unit);
        });

        const getNumber = (name: string) => {
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        for (const bookType in groupedByBookType) {
            const classesInBookType = groupedByBookType[bookType];
            const sortedClassNames = Object.keys(classesInBookType).sort((a, b) => getNumber(a) - getNumber(b));
            
            const finalGroupedForBook: Record<string, typeof mappedUnits[0][]> = {};
            for (const className of sortedClassNames) {
                finalGroupedForBook[className] = classesInBookType[className].sort((a, b) => {
                    if ((a.subjectName || '').localeCompare(b.subjectName || '') !== 0) {
                        return (a.subjectName || '').localeCompare(b.subjectName || '');
                    }
                    if ((a.term || '').localeCompare(b.term || '') !== 0) {
                        return (a.term || '').localeCompare(b.term || '');
                    }
                     if ((a.unitNumber || 0) - (b.unitNumber || 0) !== 0) {
                       return (a.unitNumber || 0) - (b.unitNumber || 0);
                     }
                    return (a.categoryName || '').localeCompare(b.categoryName || '');
                });
            }
            groupedByBookType[bookType] = finalGroupedForBook;
        }
        
        return groupedByBookType;

    }, [units, classes, subjects, categories, language]);


    const handleDelete = async (unitId: string) => {
        if (!firestore) return;
        const unitDocRef = doc(firestore, 'units', unitId);
        try {
            await deleteDoc(unitDocRef);
            toast({
                title: t('Unit Deleted'),
                description: t('The unit has been successfully deleted.'),
            });
        } catch (error) {
            console.error("Error deleting unit: ", error);
            toast({
                variant: 'destructive',
                title: t('Error Deleting Unit'),
                description: t('There was a problem deleting the unit.'),
            });
        }
    };
    
    const setDialogState = (unitId: string, isOpen: boolean) => {
        setOpenDialogs(prev => ({ ...prev, [unitId]: isOpen }));
    };

    if (isLoading) return <p>{t('Loading units...')}...</p>
    
    const renderAccordion = (unitsByClass: Record<string, any[]>, bookType: string) => (
        <Accordion type="multiple" className="w-full">
            {Object.entries(unitsByClass).map(([className, classUnits]) => (
                <AccordionItem value={`${bookType}-${className}`} key={`${bookType}-${className}`}>
                    <AccordionTrigger className="text-lg font-semibold">{className}</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 pt-2">
                            {classUnits.map(unit => (
                                <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                    <div>
                                        <p className="font-semibold">{unit.subjectName}</p>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            {unit.term}
                                            {unit.unitNumber && unit.unitName && ` • ${t('Unit')} ${unit.unitNumber}: ${unit.unitName}`}
                                            {unit.categoryName && ` (${unit.categoryName})`}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Dialog open={openDialogs[unit.id] || false} onOpenChange={(isOpen) => setDialogState(unit.id, isOpen)}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">{t('edit')}</span>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{t('Edit Unit')}</DialogTitle>
                                                    <DialogDescription>
                                                        {t("Make changes to the unit details below.")}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <EditUnitForm unit={unit} classes={classes} subjects={subjects} onFinished={() => setDialogState(unit.id, false)} />
                                            </DialogContent>
                                        </Dialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash className="h-4 w-4" />
                                                    <span className="sr-only">{t('delete')}</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('confirm_deletion_title')}</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        {t('This action will permanently delete the unit \'{{unitName}}\'.', { unitName: unit.unitName || unit.id })}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(unit.id)}>{t('delete')}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Existing Units')}</CardTitle>
                 <CardDescription>{t('Manage or delete existing units.')}</CardDescription>
            </CardHeader>
            <CardContent>
                {Object.keys(groupedUnits).length > 0 ? (
                    <Tabs defaultValue="samacheer" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="samacheer">Samacheer Kalvi</TabsTrigger>
                            <TabsTrigger value="old">Old Books</TabsTrigger>
                        </TabsList>
                        <TabsContent value="samacheer">
                            {groupedUnits.samacheer && Object.keys(groupedUnits.samacheer).length > 0 ?
                                renderAccordion(groupedUnits.samacheer, 'samacheer')
                                : <p className="text-center text-muted-foreground pt-4">{t('No units found for Samacheer Kalvi.')}</p>
                            }
                        </TabsContent>
                        <TabsContent value="old">
                             {groupedUnits.old && Object.keys(groupedUnits.old).length > 0 ?
                                renderAccordion(groupedUnits.old, 'old')
                                : <p className="text-center text-muted-foreground pt-4">{t('No units found for Old Books.')}</p>
                            }
                        </TabsContent>
                    </Tabs>
                ) : (
                    <p className="text-muted-foreground">{t('No units found.')}</p>
                )}
            </CardContent>
        </Card>
    );
}

export default function TopicManagementPage() {
  const { t, language } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);

  const sortedClasses = useMemo(() => {
    if (!classes) return [];
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
    return [...classes].sort((a, b) => getNumber(a) - getNumber(b));
  }, [classes, language]);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { bookType: 'samacheer', classId: '', subjectName: '', term: '', unitNumber: undefined, unitName: '', categoryName: '', addUnitForFullBook: 'yes' },
  });

  const classIdValue = form.watch('classId');
  const selectedClass = classes?.find(c => c.id === classIdValue);
  const classNameValue = selectedClass?.name || '';
  const classNumber = parseInt(classNameValue.match(/\d+/) || ['0'][0]);

  const showTermField = true;

  const termValue = form.watch('term');
  const addUnitForFullBookValue = form.watch('addUnitForFullBook');
  
  const showFullBookUnitQuestion = termValue === 'Full Book';
  const showUnitFields = termValue !== 'Full Book' || (termValue === 'Full Book' && addUnitForFullBookValue === 'yes');
  
  useEffect(() => {
    if (termValue !== 'Full Book') {
        form.setValue('addUnitForFullBook', undefined);
    }
  }, [termValue, form]);

  useEffect(() => {
    if (!showUnitFields) {
        form.setValue('unitNumber', undefined);
        form.setValue('unitName', '');
    }
  }, [showUnitFields, form]);


  useEffect(() => {
    if (!showTermField) {
        form.setValue('term', 'Full Book');
    }
  }, [showTermField, form, classIdValue]);

  const resetForm = () => {
    form.reset();
  }

  const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const { bookType, classId, subjectName, term, unitNumber, unitName, categoryName, addUnitForFullBook } = values;
        
        const subjectsRef = collection(firestore, 'subjects');
        const subjectQuery = query(subjectsRef, where('name', '==', subjectName));
        const subjectSnapshot = await getDocs(subjectQuery);

        let subjectId: string;
        if (subjectSnapshot.empty) {
            const newSubjectRef = doc(subjectsRef);
            const newSubject: Subject = {
                id: newSubjectRef.id,
                name: subjectName,
                description: `Subject for TNPSC exams`,
            };
            await setDoc(newSubjectRef, newSubject);
            subjectId = newSubjectRef.id;
            toast({
                title: t('Subject Created'),
                description: `New subject '${subjectName}' was created.`,
            });
        } else {
            subjectId = subjectSnapshot.docs[0].id;
        }

        let categoryId: string | undefined = undefined;
        if (categoryName && subjectId) {
            const categoriesRef = collection(firestore, 'categories');
            const categoryQuery = query(categoriesRef, where('name', '==', categoryName), where('subjectId', '==', subjectId));
            const categorySnapshot = await getDocs(categoryQuery);

            if(categorySnapshot.empty) {
                const newCategoryRef = doc(categoriesRef);
                const newCategory: Category = {
                    id: newCategoryRef.id,
                    name: categoryName,
                    subjectId: subjectId
                };
                await setDoc(newCategoryRef, newCategory);
                categoryId = newCategoryRef.id;
            } else {
                categoryId = categorySnapshot.docs[0].id;
            }
        }
        
        const unitDocRef = doc(collection(firestore, 'units'));
        
        const unitData: Partial<Unit> = {
            id: unitDocRef.id,
            classId,
            subjectId,
            term: showTermField ? term : 'Full Book',
            bookType,
        };

        if (categoryId) {
            unitData.categoryId = categoryId;
        }

        const shouldAddUnitDetails = term !== 'Full Book' || (term === 'Full Book' && addUnitForFullBook === 'yes');
        if (shouldAddUnitDetails) {
            unitData.unitNumber = unitNumber;
            unitData.unitName = unitName;
        }
        
        await setDoc(unitDocRef, unitData);

        toast({
            title: t('Unit Created!'),
            description: t('The unit "{{unitName}}" has been successfully created.', { unitName: values.unitName || '' }),
        });
        resetForm();

    } catch (error) {
      console.error('Error creating unit:', error);
      toast({
        variant: 'destructive',
        title: t('Error Creating Unit'),
        description: (error as Error).message || t('There was a problem creating the unit.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('manage_topics')}</h1>
        <p className="text-muted-foreground">{t('Create, view, and manage class subjects, terms, and units.')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t('Add New Unit')}</CardTitle>
            <CardDescription>{t('Add a new unit to a subject and class.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bookType"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Book Type</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                              >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="samacheer" /></FormControl>
                                      <FormLabel className="font-normal">Samacheer Kalvi</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="old" /></FormControl>
                                      <FormLabel className="font-normal">Old Book</FormLabel>
                                  </FormItem>
                              </RadioGroup>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('class_name')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={classesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_a_class')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sortedClasses?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="subjectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('subject_name')}</FormLabel>
                       <FormControl>
                        <Input placeholder={t('subject_name_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryName"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., இலக்கணம்" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
                />

                {(showTermField || termValue === 'Full Book') && (
                    <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('Term')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select a Term')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="பருவம் 1">பருவம் 1</SelectItem>
                            <SelectItem value="பருவம் 2">பருவம் 2</SelectItem>
                            <SelectItem value="பருவம் 3">பருவம் 3</SelectItem>
                            <SelectItem value="Full Book">Full Book</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

                {showFullBookUnitQuestion && (
                    <FormField
                        control={form.control}
                        name="addUnitForFullBook"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Add unit for full book?</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex gap-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="yes" /></FormControl>
                                            <FormLabel className="font-normal">Yes</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="no" /></FormControl>
                                            <FormLabel className="font-normal">No</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}


                {showUnitFields && (
                <>
                    <FormField
                    control={form.control}
                    name="unitNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('Unit')}</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                                        <SelectItem key={num} value={String(num)}>இயல் {num}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />

                    <FormField
                    control={form.control}
                    name="unitName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('Unit Name')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('Name of the unit')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </>
                )}


                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? t('Adding Unit...') : t('Add Unit')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-8">
            <ExistingUnitsList />
        </div>
      </div>
    </div>
  );
}
