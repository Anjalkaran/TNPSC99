'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import type { Subject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';

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

function ExistingSubjectsList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading } = useCollection<Subject>(subjectsCollection);

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
                            <li key={subject.id} className="p-2 border rounded-md">
                                <p className="font-semibold">{subject.name}</p>
                                <p className="text-sm text-muted-foreground">{subject.description}</p>
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

  const form = useForm<ClassSubjectFormValues>({
    resolver: zodResolver(classSubjectSchema),
    defaultValues: { className: '', customClassName: '', subjectName: '', subjectDescription: '' },
  });

  const onSubmit: SubmitHandler<ClassSubjectFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const finalClassName = values.className === 'other' ? values.customClassName! : values.className;
    const subjectId = createSlug(values.subjectName);
    const classId = createSlug(finalClassName);

    try {
      // Create subject
      const subjectsCollection = collection(firestore, 'subjects');
      await addDoc(subjectsCollection, {
          id: subjectId,
          name: values.subjectName,
          description: values.subjectDescription || ''
      });

      // Optionally, create or update class if it doesn't exist
      // This part depends on whether you have a separate `classes` collection to manage
      // For now, we are creating subjects with class/subject IDs

      toast({
        title: t('subject_created_success_title'),
        description: t('subject_created_success_desc', { subjectName: values.subjectName, className: finalClassName }),
      });
      form.reset();
      setShowCustomClass(false);
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
            <CardTitle>{t('create_new_subject')}</CardTitle>
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
                        defaultValue={field.value}
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
                            <Input placeholder={t('enter_custom_class_name')} {...field} />
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('creating_subject') : t('create_subject')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <ExistingSubjectsList />
      </div>
    </div>
  );
}
