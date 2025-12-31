'use client';

import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
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


const unitFormSchema = z.object({
  classId: z.string().min(1, { message: "Please select a class." }),
  subjectName: z.string().min(1, { message: "Subject name must be at least 1 character." }),
  term: z.string().min(1, { message: "Please select a term." }),
  unitNumber: z.coerce.number().min(1, "Unit number must be at least 1."),
  unitName: z.string().min(1, { message: 'Unit name must be at least 1 character.' }),
  categoryId: z.string().optional(),
});


type UnitFormValues = z.infer<typeof unitFormSchema>;

function EditUnitForm({ unit, classes, onFinished }: { unit: Unit, classes: Class[] | null | undefined, onFinished: () => void }) {
    const { t, language } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<UnitFormValues>({
        resolver: zodResolver(unitFormSchema),
        defaultValues: {
            classId: unit.classId,
            subjectName: unit.subjectName || '',
            term: unit.term,
            unitNumber: unit.unitNumber,
            unitName: unit.unitName,
            categoryId: unit.categoryId || '',
        },
    });

    const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesCollection);

    const subjectNameValue = form.watch('subjectName');

    const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            const { classId, subjectName, term, unitNumber, unitName, categoryId } = values;
            
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


            const unitDocRef = doc(firestore, 'units', unit.id);
            const unitData: Partial<Omit<Unit, 'id'>> = {
                classId,
                subjectId,
                term,
                unitNumber,
                unitName,
                categoryId
            };

            await updateDoc(unitDocRef, unitData);

            toast({
                title: t('Unit Updated!'),
                description: t('The unit "{{unitName}}" has been successfully updated.', { unitName }),
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
                                    {classes?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
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

                {(subjectNameValue === 'தமிழ்' || subjectNameValue === 'Tamil') && (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!categories}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.filter(c => c.subjectId === 'tamil').map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

    const unitsWithNames = useMemo(() => {
        if (!units || !classes || !subjects || !categories) return [];
        const classMap = new Map(classes.map(c => [c.id, language === 'ta' && c.name_ta ? c.name_ta : c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, language === 'ta' && s.name_ta ? s.name_ta : s.name]));
        const categoryMap = new Map(categories.map(cat => [cat.id, language === 'ta' && cat.name_ta ? cat.name_ta : cat.name]));
        
        return units.map(unit => ({
            ...unit,
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || unit.subjectId,
            categoryName: unit.categoryId ? categoryMap.get(unit.categoryId) : undefined,
        }))
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
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('Existing Units')}</CardTitle>
                 <CardDescription>{t('Manage or delete existing units.')}</CardDescription>
            </CardHeader>
            <CardContent>
                {unitsWithNames && unitsWithNames.length > 0 ? (
                     <ul className="space-y-2">
                        {unitsWithNames.map(unit => (
                            <li key={unit.id} className="flex justify-between items-center p-3 border rounded-md">
                                <div>
                                    <p className="font-semibold text-sm">{unit.className} - {unit.subjectName} - {unit.term}</p>
                                    <p className="font-bold text-base">{t('Unit')} {unit.unitNumber}: {unit.unitName}</p>
                                    {unit.categoryName && <p className="text-xs text-muted-foreground">Category: {unit.categoryName}</p>}
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
                                            <EditUnitForm unit={unit} classes={classes} onFinished={() => setDialogState(unit.id, false)} />
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
                                                    {t('This action will permanently delete the unit \'{{unitName}}\'.', { unitName: unit.unitName })}
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
  
  const categoriesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'categories') : null, [firestore]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesCollection);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { classId: '', subjectName: '', term: '', unitNumber: 1, unitName: '', categoryId: '' },
  });

  const subjectNameValue = form.watch('subjectName');


  const resetForm = () => {
    form.reset();
  }

  const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const { classId, subjectName, term, unitNumber, unitName, categoryId } = values;
        
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

        const unitDocRef = doc(collection(firestore, 'units'));
        
        const unitData: Unit = {
            id: unitDocRef.id,
            classId,
            subjectId,
            term,
            unitNumber,
            unitName,
            categoryId
        };
        
        await setDoc(unitDocRef, unitData);

        toast({
            title: t('Unit Created!'),
            description: t('The unit "{{unitName}}" has been successfully created.', { unitName }),
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
                          {classes?.map(c => <SelectItem key={c.id} value={c.id}>{language === 'ta' && c.name_ta ? c.name_ta : c.name}</SelectItem>)}
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
                
                {(subjectNameValue === 'தமிழ்' || subjectNameValue === 'Tamil') && (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={categoriesLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.filter(c => c.subjectId === 'tamil').map(c => <SelectItem key={c.id} value={c.id}>{c.name_ta || c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

                <FormField
                  control={form.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Unit')}</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
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
