'use client';

import { useRouter, useParams, notFound } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

const userEditSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  email: z.string().email(), // Readonly
  isAdmin: z.boolean().default(false),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

export default function EditUserPage() {
  const params = useParams();
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : '';
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => (firestore && userId ? doc(firestore, 'users', userId) : null), [firestore, userId]);
  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile>(userRef);

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      username: '',
      email: '',
      isAdmin: false,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
      });
    }
  }, [user, form]);


  const onSubmit = async (values: UserEditFormValues) => {
    if (!userRef) return;
    
    // We don't want to update the email.
    const { email, ...updateData } = values;

    try {
      await updateDoc(userRef, updateData);
      toast({
        title: 'User Updated',
        description: 'The user profile has been successfully updated.',
      });
      router.push('/admin/users');
    } catch (error: any) {
      console.error('Error updating user:', error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData,
        })
      );
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'You may not have permission to update this user.',
      });
    }
  };

  // Wait until the userId is available from params AND the data is loading.
  const pageIsLoading = isUserLoading || !userId;

  if (pageIsLoading) {
    return (
        <div className="container mx-auto p-8 space-y-4">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
  }

  // Only call notFound if loading is finished AND there is no user.
  if (!user) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Modify user details and permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Read-only)</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">
                            Administrator
                        </FormLabel>
                        <FormDescription>
                           Grant administrator privileges to this user.
                        </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                 <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
