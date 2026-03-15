'use client';

import { useRouter, useParams, notFound } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect } from 'react';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const userEditSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  email: z.string().email(), // Readonly
  isAdmin: z.boolean().default(false),
  subscriptionStatus: z.enum(['free', 'premium']),
  subscriptionExpires: z.date().optional(),
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
      subscriptionStatus: 'free',
      subscriptionExpires: undefined,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
        subscriptionStatus: user.subscriptionStatus || 'free',
        subscriptionExpires: user.subscriptionExpires ? new Date(user.subscriptionExpires) : undefined,
      });
    }
  }, [user, form]);


  const onSubmit = async (values: UserEditFormValues) => {
    if (!userRef) return;
    
    // We don't want to update the email.
    const { email, ...updateData } = values;

    const valuesToSubmit: { [key: string]: any } = {
        ...updateData,
        subscriptionExpires: updateData.subscriptionStatus === 'premium' && updateData.subscriptionExpires 
            ? updateData.subscriptionExpires.toISOString() 
            : deleteField()
    };

    try {
      await updateDoc(userRef, valuesToSubmit);
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
          requestResourceData: valuesToSubmit,
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

              <FormField
                control={form.control}
                name="subscriptionStatus"
                render={({ field }) => (
                    <FormItem className="space-y-3 rounded-lg border p-4">
                    <FormLabel className="text-base">Subscription Status</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="free" /></FormControl>
                            <FormLabel className="font-normal">Free</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="premium" /></FormControl>
                            <FormLabel className="font-normal">Premium</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
               />

              {form.watch('subscriptionStatus') === 'premium' && (
                <FormField
                    control={form.control}
                    name="subscriptionExpires"
                    render={({ field }) => (
                    <FormItem className="flex flex-col rounded-lg border p-4">
                        <FormLabel>Subscription Expiry Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                                )}
                            >
                                {field.value ? (
                                format(field.value, "dd-MM-yyyy")
                                ) : (
                                <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormDescription>
                            Set the expiration date for the premium subscription.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                )}
              
              <div className="flex justify-end gap-2 pt-4">
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
