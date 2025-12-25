'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import type { Subject, Class } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};

const classSubjectSchema = z.object({
  className: z.string({ required_error: "Please select a class." }),
  customClassName: z.string().optional(),
  subjectName: z.string().min(3, { message: 'Subject name must be at least 3 characters.' }),
  subjectDescription: z.string().optional(),
}).refine(data => {
    if (data.className === 'other') {
        return !!data.customClassName && data.customClassName.length >= 1;
    }
    return true;
}, {
    message: 'Custom class name is required when "Other" is selected.',
    path: ['customClassName'],
});


type ClassSubjectFormValues = z.infer<typeof classSubjectSchema>;

function ExistingSubjectsList({ onEdit }: { onEdit: (subject: Subject) => void }) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading } = useCollection<Subject>(subjectsCollection);

    const handleDelete = async (subjectId: string) => {
        if (!firestore) return;
        const subjectDocRef = doc(firestore, 'subjects', subjectId);
        try {
            await deleteDoc(subjectDocRef);
            toast({
                title: t('subject_deleted_success_title'),
                description: t('subject_deleted_success_desc'),
            });
        } catch (error) {
            console.error("Error deleting subject: ", error);
            toast({
                variant: 'destructive',
                title: t('subject_deletion_error_title'),
                description: t('subject_deletion_error_desc'),
            });
        }
    };


    if (isLoading) return <p>{t('loading_subjects')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('existing_subjects')}</CardTitle>
            </CardHeader>
            <CardContent>
                {subjects && subjects.length > 0 ? (
                     <ul className="space-y-2">
                        {subjects.map(subject => (
                            <li key={subject.id} className="flex justify-between items-center p-2 border rounded-md">
                                <div>
                                    <p className="font-semibold">{subject.name}</p>
                                    <p className="text-sm text-muted-foreground">{subject.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(subject)}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">{t('edit')}</span>
                                    </Button>
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
                                                    {t('confirm_deletion_desc', { subjectName: subject.name })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(subject.id)}>{t('delete')}</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground">{t('no_subjects_yet')}</p>
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
  const [showCustomClass, setShowCustomClass] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);


  const form = useForm<ClassSubjectFormValues>({
    resolver: zodResolver(classSubjectSchema),
    defaultValues: { className: '', customClassName: '', subjectName: '', subjectDescription: '' },
  });

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    form.setValue('subjectName', subject.name);
    form.setValue('subjectDescription', subject.description);
    // When editing, we don't know the class, so we can't pre-fill it.
    // The class fields are disabled to only allow editing of subject name and description.
    form.setValue('className', '');
    form.setValue('customClassName', '');
    setShowCustomClass(false);
  };

  const resetForm = () => {
    form.reset();
    setEditingSubject(null);
    setShowCustomClass(false);
  }

  const onSubmit: SubmitHandler<ClassSubjectFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);

    if(editingSubject) {
        // Update logic
        const subjectDocRef = doc(firestore, 'subjects', editingSubject.id);
        try {
            await updateDoc(subjectDocRef, {
                name: values.subjectName,
                description: values.subjectDescription || ''
            });
             toast({
                title: t('subject_updated_success_title'),
                description: t('subject_updated_success_desc', { subjectName: values.subjectName }),
            });
            resetForm();
        } catch (error) {
            console.error('Error updating subject:', error);
            toast({
                variant: 'destructive',
                title: t('subject_update_error_title'),
                description: t('subject_update_error_desc'),
            });
        } finally {
            setIsSubmitting(false);
        }
        return;
    }
    
    // Create logic
    const finalClassName = values.className === 'other' ? values.customClassName! : values.className;
    const subjectId = createSlug(values.subjectName);
    const classId = createSlug(finalClassName);

    try {
      const subjectDocRef = doc(firestore, 'subjects', subjectId);
      await setDoc(subjectDocRef, {
          id: subjectId,
          name: values.subjectName,
          description: values.subjectDescription || ''
      });

      const classDocRef = doc(firestore, 'classes', classId);
      await setDoc(classDocRef, {
        id: classId,
        name: finalClassName,
        description: `Content for ${finalClassName}`
      }, { merge: true });


      toast({
        title: t('subject_created_success_title'),
        description: t('subject_created_success_desc', { subjectName: values.subjectName, className: finalClassName }),
      });
      resetForm();
    } catch (error) {
      console.error('Error creating subject:', error);
      toast({
        variant: 'destructive',
        title: t('subject_creation_error_title'),
        description: t('subject_creation_error_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('manage_topics')}</h1>
        <p className="text-muted-foreground">{t('create_new_subject_for_class')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>{editingSubject ? t('edit_subject') : t('create_new_subject')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="className"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('class_name')}</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            setShowCustomClass(value === 'other');
                        }} 
                        value={field.value}
                        disabled={!!editingSubject}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_a_class')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Class V">Class V</SelectItem>
                          <SelectItem value="Class VI">Class VI</SelectItem>
                          <SelectItem value="Class VII">Class VII</SelectItem>
                          <SelectItem value="Class VIII">Class VIII</SelectItem>
                          <SelectItem value="Class IX">Class IX</SelectItem>
                          <SelectItem value="Class X">Class X</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {showCustomClass && (
                    <FormField
                    control={form.control}
                    name="customClassName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('custom_class_name')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('enter_custom_class_name')} {...field} disabled={!!editingSubject} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

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
                  name="subjectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('subject_description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('subject_description_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                        ? (editingSubject ? t('updating_subject') : t('creating_subject'))
                        : (editingSubject ? t('update_subject') : t('create_subject'))
                    }
                  </Button>
                  {editingSubject && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                          {t('cancel')}
                      </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <ExistingSubjectsList onEdit={handleEdit} />
      </div>
    </div>
  );
}
