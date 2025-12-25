'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import type { Subject, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect } from 'react';

const createSlug = (name: string) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
};

const topicSchema = z.object({
  name: z.string().min(3, { message: 'Topic name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
});

type TopicFormValues = z.infer<typeof topicSchema>;

function ExistingTopicsList() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
    const { data: subjects, isLoading } = useCollection<Subject>(subjectsCollection);

    if (isLoading) return <p>{t('loading_users')}...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('existing_topics')}</CardTitle>
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
                    <p className="text-muted-foreground">{t('no_topics_yet')}</p>
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
  const router = useRouter();

  const { user, isUserLoading } = useUser();
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || !userProfile?.isAdmin) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: { name: '', description: '' },
  });

  const onSubmit: SubmitHandler<TopicFormValues> = async (values) => {
    if (!firestore) return;
    setIsSubmitting(true);
    
    const subjectId = createSlug(values.name);

    try {
      const subjectsCollection = collection(firestore, 'subjects');
      await addDoc(subjectsCollection, {
          id: subjectId,
          ...values
      });

      toast({
        title: t('topic_created_success_title'),
        description: t('topic_created_success_desc', { name: values.name }),
      });
      form.reset();
    } catch (error) {
      console.error('Error creating topic:', error);
      toast({
        variant: 'destructive',
        title: t('topic_creation_error_title'),
        description: t('topic_creation_error_desc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isUserLoading || isProfileLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!userProfile?.isAdmin) {
    return <div className="container mx-auto p-4">You are not authorized to view this page.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('manage_topics')}</h1>
        <p className="text-muted-foreground">{t('create_new_topic')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('create_new_topic')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('topic_name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('topic_name_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('topic_description')}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t('topic_description_placeholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('creating_topic') : t('create_topic')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <ExistingTopicsList />
      </div>
    </div>
  );
}
