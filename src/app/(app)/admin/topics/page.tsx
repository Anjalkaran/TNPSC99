
'use client';

import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import type { Subject, Class, Unit } from '@/lib/types';
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


const createSlug = (name: string) => {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};

const unitFormSchema = z.object({
  classId: z.string({ required_error: "Please select a class." }),
  subjectName: z.string().min(2, { message: "Subject name must be at least 2 characters." }),
  term: z.string({ required_error: "Please select a term." }),
  unitNumber: z.coerce.number().min(1, "Unit number must be at least 1."),
  unitName: z.string().min(3, { message: 'Unit name must be at least 3 characters.' }),
  unitName_ta: z.string().optional(),
  category: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitFormSchema>;


function ExistingUnitsList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: units, isLoading } = useCollection<Unit>(unitsCollection);

    // Fetch classes and subjects to display their names
    const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
    const { data: classes } = useCollection<Class>(classesCollection);
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects } = useCollection<Subject>(subjectsCollection);

    const unitsWithNames = useMemo(() => {
        if (!units || !classes || !subjects) return [];
        const classMap = new Map(classes.map(c => [c.id, c.name]));
        const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
        return units.map(unit => ({
            ...unit,
            className: classMap.get(unit.classId) || unit.classId,
            subjectName: subjectMap.get(unit.subjectId) || unit.subjectId,
        }))
    }, [units, classes, subjects]);


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
                                    <p className="font-bold text-base">Unit {unit.unitNumber}: {unit.unitName}</p>
                                    {unit.unitName_ta && <p className="text-muted-foreground text-sm">{unit.unitName_ta}</p>}
                                    {unit.category && <p className="text-xs text-muted-foreground">Category: {unit.category}</p>}
                                </div>
                                <div className="flex gap-2">
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
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { classId: '', subjectName: '', term: '', unitNumber: 1, unitName: '', unitName_ta: '', category: '' },
  });

  const subjectNameValue = form.watch('subjectName');

  const resetForm = () => {
    form.reset();
  }

  const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const { classId, subjectName, term, unitNumber, unitName, unitName_ta, category } = values;

        // 1. Find or create the subject
        let subjectId: string;
        const subjectSlug = createSlug(subjectName);
        const subjectsRef = collection(firestore, 'subjects');
        const subjectQuery = query(subjectsRef, where('id', '==', subjectSlug));
        const subjectSnapshot = await getDocs(subjectQuery);

        if (subjectSnapshot.empty) {
            // Subject does not exist, create it
            const newSubjectRef = doc(subjectsRef, subjectSlug);
            const newSubject: Subject = {
                id: subjectSlug,
                name: subjectName,
                description: `Subject for TNPSC exams`,
            };
            await setDoc(newSubjectRef, newSubject);
            subjectId = subjectSlug;
            toast({
                title: t('Subject Created'),
                description: `New subject '${subjectName}' was created.`,
            });
        } else {
            // Subject exists, use its ID
            subjectId = subjectSnapshot.docs[0].id;
        }

        // 2. Create the unit
        const unitId = createSlug(`${classId}-${subjectId}-${term}-unit-${unitNumber}`);
        const unitDocRef = doc(firestore, 'units', unitId);
        
        const unitData: Partial<Unit> = {
            id: unitId,
            classId,
            subjectId,
            term,
            unitNumber,
            unitName,
            unitName_ta: unitName_ta || '',
        };
        
        if(category) {
            unitData.category = category;
        }

        await setDoc(unitDocRef, unitData, { merge: true });

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
        description: t('There was a problem creating the unit.'),
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
                          {classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                
                {subjectNameValue === 'தமிழ்' && (
                   <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="இலக்கணம்">இலக்கணம்</SelectItem>
                                <SelectItem value="இலக்கியம்">இலக்கியம்</SelectItem>
                                <SelectItem value="தமிழ் அறிஞர்களும் தமிழ்த்தொண்டும்">தமிழ் அறிஞர்களும் தமிழ்த்தொண்டும்</SelectItem>
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
                      <FormLabel>{t('Unit Number')}</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} />
                      </FormControl>
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

                 <FormField
                  control={form.control}
                  name="unitName_ta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Unit Name (Tamil)')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('Unit name in Tamil')} {...field} />
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
