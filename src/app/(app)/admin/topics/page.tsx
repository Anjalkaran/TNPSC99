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
  medium: z.enum(['tamil', 'english'], { required_error: "Please select a medium." }),
  term: z.string().min(1, { message: "Please select a term." }),
  addUnitForFullBook: z.enum(['yes', 'no']).optional(),
  unitNumber: z.coerce.number().optional(),
  unitName: z.string().optional(),
  categoryName: z.string().optional(),
}).superRefine((data, ctx) => {
    if ( (data.subjectName === 'தமிழ்' || data.subjectName.toLowerCase() === 'tamil') && (!data.categoryName || data.categoryName.trim().length < 1) ) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['categoryName'],
            message: 'Category name is required for Tamil subject.',
        });
    }

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
            const nameToUse = cls.name_ta || cls.name;
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
    }, [classes]);

    const form = useForm<UnitFormValues>({
        resolver: zodResolver(unitFormSchema),
        defaultValues: {
            bookType: unit.bookType || 'samacheer',
            classId: unit.classId,
            subjectName: unit.subjectName || '',
            medium: unit.medium || 'tamil',
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
    const classNumberMatch = classNameValue.match(/\d+/);
    const classNumber = classNumberMatch ? parseInt(classNumberMatch[0]) : 0;

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

    const subjectNameValue = form.watch('subjectName');
    const isTamil = subjectNameValue.toLowerCase() === 'tamil' || subjectNameValue === 'தமிழ்';
    const isEnglish = subjectNameValue.toLowerCase() === 'english';
    const unitCount = isTamil || isEnglish ? 10 : 30;
    const unitLabel = isTamil ? 'இயல்' : 'Unit';

    useEffect(() => {
        if (isTamil) {
            form.setValue('medium', 'tamil');
        }
    }, [isTamil, form]);


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
            const { bookType, classId, subjectName, medium, term, unitNumber, unitName, categoryName, addUnitForFullBook } = values;
            const effectiveCategoryName = categoryName || subjectName;

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
            if (effectiveCategoryName && subjectId) {
                const categoriesRef = collection(firestore, 'categories');
                const categoryQuery = query(categoriesRef, where('name', '==', effectiveCategoryName), where('subjectId', '==', subjectId));
                const categorySnapshot = await getDocs(categoryQuery);

                if(categorySnapshot.empty) {
                    const newCategoryRef = doc(categoriesRef);
                    const newCategory: Category = {
                        id: newCategoryRef.id,
                        name: effectiveCategoryName,
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
                medium,
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
                title: t('unit_updated_title'),
                description: t('unit_updated_desc', { unitName: values.unitName || unit.unitName || '' }),
            });
            onFinished();
        } catch (error) {
            console.error('Error updating unit:', error);
            toast({
                variant: 'destructive',
                title: t('error_updating_unit_title'),
                description: (error as Error).message || t('error_updating_unit_desc'),
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
                                    {sortedClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}
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
                  name="medium"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Medium</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                                  disabled={isTamil}
                              >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="tamil" /></FormControl>
                                      <FormLabel className="font-normal">தமிழ்</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="english" /></FormControl>
                                      <FormLabel className="font-normal">English</FormLabel>
                                  </FormItem>
                              </RadioGroup>
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
                                            {Array.from({ length: unitCount }, (_, i) => i + 1).map(num => (
                                                <SelectItem key={num} value={String(num)}>{unitLabel} {num}</SelectItem>
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
                        {isSubmitting ? t('updating_unit') : t('update_unit')}
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
        if (!units || !classes || !subjects || !categories) return { samacheer: {}, old: {} };

        const classMap = new Map(classes.map(c => [c.id, c.name_ta || c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, s.name_ta || s.name]));
        const categoryMap = new Map(categories.map(cat => [cat.id, cat.name_ta || cat.name]));

        const mappedUnits = units.map(unit => ({
            ...unit,
            bookType: unit.bookType || 'samacheer',
            medium: unit.medium || 'tamil',
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || 'Uncategorized',
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }));
        
        const grouped: {
            samacheer: Record<string, Record<string, Record<string, typeof mappedUnits[0][]>>>,
            old: Record<string, Record<string, Record<string, typeof mappedUnits[0][]>>>,
        } = {
            samacheer: {},
            old: {},
        };

        mappedUnits.forEach(unit => {
            const bookTypeKey = unit.bookType as 'samacheer' | 'old';
            const className = unit.className;
            const subjectName = unit.subjectName;
            const termName = unit.term || 'Uncategorized Term';

            if (!grouped[bookTypeKey][className]) {
                grouped[bookTypeKey][className] = {};
            }
            if (!grouped[bookTypeKey][className][subjectName]) {
                grouped[bookTypeKey][className][subjectName] = {};
            }
            if (!grouped[bookTypeKey][className][subjectName][termName]) {
                grouped[bookTypeKey][className][subjectName][termName] = [];
            }
            
            grouped[bookTypeKey][className][subjectName][termName].push(unit);
        });

        const getNumber = (name: string) => {
            const match = name.match(/\d+/);
            return match ? parseInt(match[0], 10) : Infinity;
        };

        const sortInnerObject = (obj: Record<string, Record<string, Record<string, typeof mappedUnits[0][]>>>) => {
            const sortedClassNames = Object.keys(obj).sort((a, b) => getNumber(a) - getNumber(b));
            const result: Record<string, Record<string, Record<string, typeof mappedUnits[0][]>>> = {};
            for (const className of sortedClassNames) {
                result[className] = {};
                const sortedSubjects = Object.keys(obj[className]).sort((a, b) => a.localeCompare(b));
                for (const subjectName of sortedSubjects) {
                    result[className][subjectName] = {};
                    const sortedTerms = Object.keys(obj[className][subjectName]).sort((a,b) => {
                         if (a.startsWith('பருவம்')) {
                            const numA = getNumber(a);
                            const numB = getNumber(b);
                            return numA - numB;
                         }
                         return a.localeCompare(b);
                    });
                     for (const termName of sortedTerms) {
                        const sortedUnits = obj[className][subjectName][termName].sort((a, b) => (a.unitNumber || 0) - (b.unitNumber || 0));
                        result[className][subjectName][termName] = sortedUnits;
                    }
                }
            }
            return result;
        };
        
        return {
            samacheer: sortInnerObject(grouped.samacheer),
            old: sortInnerObject(grouped.old),
        };

    }, [units, classes, subjects, categories, language]);


    const handleDelete = async (unitId: string) => {
        if (!firestore) return;
        const unitDocRef = doc(firestore, 'units', unitId);
        try {
            await deleteDoc(unitDocRef);
            toast({
                title: t('unit_deleted_title'),
                description: t('unit_deleted_desc'),
            });
        } catch (error) {
            console.error("Error deleting unit: ", error);
            toast({
                variant: 'destructive',
                title: t('error_deleting_unit_title'),
                description: t('error_deleting_unit_desc'),
            });
        }
    };
    
    const setDialogState = (unitId: string, isOpen: boolean) => {
        setOpenDialogs(prev => ({ ...prev, [unitId]: isOpen }));
    };

    if (isLoading) return <p>{t('Loading units...')}...</p>
    
    const renderAccordion = (groupedData: Record<string, Record<string, Record<string, any[]>>>, bookType: string) => {
        const sortedClassNames = Object.keys(groupedData);
         if (sortedClassNames.length === 0) {
            return (
                <p className="text-center text-muted-foreground pt-4">{t('No units found for Samacheer Kalvi.')}</p>
            );
        }
        return (
        <Accordion type="multiple" className="w-full">
            {sortedClassNames.map((className) => (
                <AccordionItem value={`${bookType}-${className}`} key={`${bookType}-${className}`}>
                    <AccordionTrigger className="text-lg font-semibold">{className}</AccordionTrigger>
                    <AccordionContent>
                        <Accordion type="multiple" className="w-full pl-4" defaultValue={Object.keys(groupedData[className]).map(subjectName => `${bookType}-${className}-${subjectName}`)}>
                            {Object.entries(groupedData[className]).map(([subjectName, termsInSubject]) => (
                                <AccordionItem value={`${bookType}-${className}-${subjectName}`} key={`${bookType}-${className}-${subjectName}`} className="border-b-0">
                                    <AccordionTrigger className="border-b text-base font-medium">{subjectName}</AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        <Accordion type="multiple" className="w-full pl-2" defaultValue={Object.keys(termsInSubject).map(term => `${bookType}-${className}-${subjectName}-${term}`)}>
                                            {Object.entries(termsInSubject).map(([termName, unitsInTerm]) => (
                                                <AccordionItem value={`${bookType}-${className}-${subjectName}-${termName}`} key={`${bookType}-${className}-${subjectName}-${termName}`} className="border-b-0">
                                                    <AccordionTrigger className="text-sm font-semibold">{termName}</AccordionTrigger>
                                                    <AccordionContent className="pt-2 pl-2">
                                                        <ul className="space-y-2">
                                                            {unitsInTerm.map(unit => (
                                                                <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                                                    <div>
                                                                        <p className="font-semibold">{unit.unitName || unit.categoryName || 'Unit-level Test'}</p>
                                                                        <div className="text-sm text-muted-foreground flex items-center gap-x-2 flex-wrap">
                                                                            {unit.unitNumber && <span>{t('Unit')} {unit.unitNumber}</span>}
                                                                            {unit.categoryName && unit.unitName && <span className="italic"> • {unit.categoryName}</span>}
                                                                            <Badge variant="outline">{unit.medium}</Badge>
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
                                                                                    <DialogTitle>{t('edit_unit')}</DialogTitle>
                                                                                    <DialogDescription>
                                                                                        {t("edit_unit_desc")}
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
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
        );
    }

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

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required.'),
  name_ta: z.string().optional(),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function EditCategoryForm({ category, onFinished }: { category: Category; onFinished: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: {
            name: category.name || '',
            name_ta: category.name_ta || '',
        },
    });

    const onSubmit = async (values: CategoryFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            const categoryRef = doc(firestore, 'categories', category.id);
            await updateDoc(categoryRef, {
                name: values.name,
                name_ta: values.name_ta,
            });
            toast({ title: 'Category Updated' });
            onFinished();
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
            console.error("Error updating category", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category Name (English)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., History" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="name_ta"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category Name (Tamil)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., வரலாறு" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Category'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function ExistingCategoriesList() {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

    const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesCollection);

    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

    const groupedCategories = useMemo(() => {
        if (!categories || !subjects) return {};
        const subjectMap = new Map(subjects.map(s => [s.id, s.name_ta || s.name]));
        
        return categories.reduce((acc, category) => {
            const subjectName = subjectMap.get(category.subjectId) || 'Uncategorized';
            if (!acc[subjectName]) {
                acc[subjectName] = [];
            }
            acc[subjectName].push(category);
            return acc;
        }, {} as Record<string, Category[]>);
    }, [categories, subjects, language]);

    const handleDelete = async (categoryId: string) => {
        if (!firestore) return;
        
        // Check if any units are using this category
        const unitsRef = collection(firestore, 'units');
        const q = query(unitsRef, where('categoryId', '==', categoryId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            toast({
                variant: 'destructive',
                title: 'Cannot Delete Category',
                description: `This category is being used by ${snapshot.size} unit(s). Please reassign them before deleting.`,
            });
            return;
        }

        try {
            await deleteDoc(doc(firestore, 'categories', categoryId));
            toast({ title: 'Category Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            console.error('Error deleting category', error);
        }
    };

    const setDialogState = (categoryId: string, isOpen: boolean) => {
        setOpenDialogs(prev => ({ ...prev, [categoryId]: isOpen }));
    };

    if (categoriesLoading || subjectsLoading) {
        return <p>Loading categories...</p>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Existing Categories</CardTitle>
                <CardDescription>Manage or delete existing categories.</CardDescription>
            </CardHeader>
            <CardContent>
                {Object.keys(groupedCategories).length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedCategories).sort(([a], [b]) => a.localeCompare(b)).map(([subjectName, cats]) => (
                            <AccordionItem value={subjectName} key={subjectName}>
                                <AccordionTrigger>{subjectName}</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="space-y-2 pl-4">
                                        {cats.sort((a,b) => (a.name_ta || a.name).localeCompare(b.name_ta || b.name)).map(cat => (
                                            <li key={cat.id} className="flex justify-between items-center p-2 border-b">
                                                <div>
                                                    <p className="font-medium">{cat.name_ta || cat.name}</p>
                                                    <p className="text-xs text-muted-foreground">{cat.name}</p>
                                                </div>
                                                <div className="flex items-center">
                                                    <Dialog open={openDialogs[cat.id] || false} onOpenChange={(isOpen) => setDialogState(cat.id, isOpen)}>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Edit Category</DialogTitle>
                                                                <DialogDescription>Update the category names.</DialogDescription>
                                                            </DialogHeader>
                                                            <EditCategoryForm category={cat} onFinished={() => setDialogState(cat.id, false)} />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action will permanently delete the category '{cat.name_ta || cat.name}'. You can only delete categories that are not assigned to any units.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(cat.id)}>Delete</AlertDialogAction>
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
                ) : (
                    <p className="text-muted-foreground text-center p-4">No categories created yet.</p>
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
        const nameToUse = cls.name_ta || cls.name;
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
  }, [classes]);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { bookType: 'samacheer', classId: '', subjectName: '', medium: undefined, term: '', unitNumber: undefined, unitName: '', categoryName: '', addUnitForFullBook: 'yes' },
  });

  const classIdValue = form.watch('classId');
  const selectedClass = classes?.find(c => c.id === classIdValue);
  const classNameValue = selectedClass?.name || '';
  const classNumberMatch = classNameValue.match(/\d+/);
  const classNumber = classNumberMatch ? parseInt(classNumberMatch[0]) : 0;

  const showTermField = true;

  const termValue = form.watch('term');
  const addUnitForFullBookValue = form.watch('addUnitForFullBook');
  
  const showFullBookUnitQuestion = termValue === 'Full Book';
  const showUnitFields = termValue !== 'Full Book' || (termValue === 'Full Book' && addUnitForFullBookValue === 'yes');
  
  const subjectNameValue = form.watch('subjectName');
  const isTamil = subjectNameValue.toLowerCase() === 'tamil' || subjectNameValue === 'தமிழ்';
  const isEnglish = subjectNameValue.toLowerCase() === 'english';
  const unitCount = isTamil || isEnglish ? 10 : 30;
  const unitLabel = isTamil ? 'இயல்' : 'Unit';

  useEffect(() => {
      if (isTamil) {
          form.setValue('medium', 'tamil');
      }
  }, [isTamil, form]);

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
        const { bookType, classId, subjectName, medium, term, unitNumber, unitName, categoryName, addUnitForFullBook } = values;
        const effectiveCategoryName = categoryName || subjectName;

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
                title: t('subject_created_success_title'),
                description: t('subject_created_desc', {subjectName}),
            });
        } else {
            subjectId = subjectSnapshot.docs[0].id;
        }

        let categoryId: string | undefined = undefined;
        if (effectiveCategoryName && subjectId) {
            const categoriesRef = collection(firestore, 'categories');
            const categoryQuery = query(categoriesRef, where('name', '==', effectiveCategoryName), where('subjectId', '==', subjectId));
            const categorySnapshot = await getDocs(categoryQuery);

            if(categorySnapshot.empty) {
                const newCategoryRef = doc(categoriesRef);
                const newCategory: Category = {
                    id: newCategoryRef.id,
                    name: effectiveCategoryName,
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
            medium,
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
            title: t('unit_created_title'),
            description: t('unit_created_desc', { unitName: values.unitName || '' }),
        });
        resetForm();

    } catch (error) {
      console.error('Error creating unit:', error);
      toast({
        variant: 'destructive',
        title: t('error_creating_unit_title'),
        description: (error as Error).message || t('error_creating_unit_desc'),
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
                          {sortedClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}
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
                  name="medium"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Medium</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                                  disabled={isTamil}
                              >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="tamil" /></FormControl>
                                      <FormLabel className="font-normal">தமிழ்</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl><RadioGroupItem value="english" /></FormControl>
                                      <FormLabel className="font-normal">English</FormLabel>
                                  </FormItem>
                              </RadioGroup>
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
                                    {Array.from({ length: unitCount }, (_, i) => i + 1).map(num => (
                                        <SelectItem key={num} value={String(num)}>{unitLabel} {num}</SelectItem>
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
            <ExistingCategoriesList />
        </div>
      </div>
    </div>
  );
}
