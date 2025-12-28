

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


const createSlug = (name: string) => {
    if (!name) return '';

    const tamilMap = {
        'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii', 'உ': 'u', 'ஊ': 'uu', 'எ': 'e', 'ஏ': 'e', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
        'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'gn', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r', 'ల': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
        'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh', 'ஸ்ரீ': 'sri',
        '்': '', 'ா': 'a', 'ి': 'i', 'ీ': 'ii', 'ு': 'u', 'ూ': 'uu', 'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ొ': 'o', 'ో': 'oo', 'ౌ': 'au'
    };

    const consonants = "கஙசஞடணதநபமயரலவழளறன";

    let slug = '';
    for (let i = 0; i < name.length; i++) {
        const char = name[i];
        const nextChar = name[i + 1];

        if (consonants.includes(char) && tamilMap[nextChar as keyof typeof tamilMap] !== undefined && tamilMap[nextChar as keyof typeof tamilMap] !== '') {
            // Consonant followed by a vowel sign
            slug += tamilMap[char as keyof typeof tamilMap] + tamilMap[nextChar as keyof typeof tamilMap];
            i++; // Skip the vowel sign
        } else if (tamilMap[char as keyof typeof tamilMap] !== undefined) {
            // Standalone vowel or consonant with pulli
             if (consonants.includes(char) && (nextChar === undefined || nextChar === ' ' || !tamilMap[nextChar as keyof typeof tamilMap] )) {
                 slug += tamilMap[char as keyof typeof tamilMap] + 'a';
             } else {
                slug += tamilMap[char as keyof typeof tamilMap];
             }
        } else {
            slug += char;
        }
    }

    return slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '') // Remove invalid chars
        .replace(/\s+/g, '-') // Collapse whitespace and replace by -
        .replace(/-+/g, '-'); // Collapse dashes
};


const unitFormSchema = z.object({
  classId: z.string().min(1, { message: "Please select a class." }),
  subjectName: z.string().min(1, { message: "Subject name must be at least 1 character." }),
  term: z.string().min(1, { message: "Please select a term." }),
  unitNumber: z.coerce.number().min(1, "Unit number must be at least 1."),
  unitName: z.string().min(1, { message: 'Unit name must be at least 1 character.' }),
  category: z.string().optional(),
  otherCategory: z.string().optional(),
}).refine(data => {
    if (data.category === 'other') {
        return !!data.otherCategory && data.otherCategory.length > 0;
    }
    return true;
}, {
    message: "Please enter a value for the other category",
    path: ["otherCategory"],
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
            category: (unit.category && (unit.category === 'இலக்கணம்' || unit.category === 'உரைநடை & செய்யுள்')) ? unit.category : (unit.category ? 'other' : ''),
            otherCategory: (unit.category && unit.category !== 'இலக்கணம்' && unit.category !== 'உரைநடை & செய்யுள்') ? unit.category : '',
        },
    });

    const subjectNameValue = form.watch('subjectName');
    const categoryValue = form.watch('category');

    const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            const { classId, subjectName, term, unitNumber, unitName, category, otherCategory } = values;

            // 1. Find or create the subject
            let subjectId: string;
            const subjectSlug = createSlug(subjectName);
            if (!subjectSlug) {
                throw new Error("Subject name cannot be empty.");
            }

            const subjectsRef = collection(firestore, 'subjects');
            const subjectQuery = query(subjectsRef, where('id', '==', subjectSlug));
            const subjectSnapshot = await getDocs(subjectQuery);

            if (subjectSnapshot.empty) {
                const newSubjectRef = doc(subjectsRef, subjectSlug);
                const newSubject: Subject = { id: subjectSlug, name: subjectName, description: `Subject for TNPSC exams` };
                await setDoc(newSubjectRef, newSubject);
                subjectId = subjectSlug;
            } else {
                subjectId = subjectSnapshot.docs[0].id;
            }

            // 2. Update the unit
            const unitDocRef = doc(firestore, 'units', unit.id);
            const unitData: Partial<Unit> = {
                classId,
                subjectId,
                term,
                unitNumber,
                unitName,
            };
            if (category) {
                unitData.category = category === 'other' ? otherCategory : category;
            }

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

                {subjectNameValue === 'தமிழ்' && (
                    <>
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
                                            <SelectItem value="உரைநடை & செய்யுள்">உரைநடை &amp; செய்யுள்</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {categoryValue === 'other' && (
                            <FormField
                                control={form.control}
                                name="otherCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custom Category</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter custom category" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </>
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
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [openDialogs, setOpenDialogs] = useState<Record<string, boolean>>({});

    const unitsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
    const { data: units, isLoading } = useCollection<Unit>(unitsCollection);

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
                                    <p className="font-bold text-base">Unit {unit.unitNumber}: {unit.unitName}</p>
                                    {unit.category && <p className="text-xs text-muted-foreground">Category: {unit.category}</p>}
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
  
  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { classId: '', subjectName: '', term: '', unitNumber: 1, unitName: '', category: '', otherCategory: '' },
  });

  const subjectNameValue = form.watch('subjectName');
  const categoryValue = form.watch('category');


  const resetForm = () => {
    form.reset();
  }

  const onSubmit: SubmitHandler<UnitFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    try {
        const { classId, subjectName, term, unitNumber, unitName, category, otherCategory } = values;

        // 1. Find or create the subject
        let subjectId: string;
        const subjectSlug = createSlug(subjectName);
        if (!subjectSlug) {
            throw new Error("Subject name cannot be empty.");
        }

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
        const unitId = createSlug(`${classId}-${subjectId}-${term}-unit-${unitNumber}-${unitName}`);
        if (!unitId) {
            throw new Error("Could not create a valid Unit ID. Please check all fields.");
        }
        const unitDocRef = doc(firestore, 'units', unitId);
        
        const unitData: Unit = {
            id: unitId,
            classId,
            subjectId,
            term,
            unitNumber,
            unitName,
        };
        
        if(category) {
            unitData.category = category === 'other' ? otherCategory : category;
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
                
                {subjectNameValue === 'தமிழ்' && (
                  <>
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
                                <SelectItem value="உரைநடை & செய்யுள்">உரைநடை &amp; செய்யுள்</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {categoryValue === 'other' && (
                         <FormField
                            control={form.control}
                            name="otherCategory"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Custom Category</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter custom category" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                  </>
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
