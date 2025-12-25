'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useAuth, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const signupSchema = z
  .object({
    username: z.string().min(3, 'பயனர்பெயர் குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்.'),
    email: z.string().email('தவறான மின்னஞ்சல் முகவரி.'),
    password: z.string().min(6, 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const auth = useAuth();
  const firestore = getFirestore(auth.app);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const newUser = userCredential.user;

      // Also update the user's auth profile
      await updateProfile(newUser, { displayName: values.username });

      const userProfile: UserProfile = {
        id: newUser.uid,
        username: values.username,
        email: values.email,
        registrationDate: new Date().toISOString(),
        isAdmin: values.email === 'shan@thervumaiyam.in',
      };

      const userDocRef = doc(firestore, 'users', newUser.uid);

      setDoc(userDocRef, userProfile).catch((error) => {
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfile,
          })
        );
      });

      toast({
        title: 'கணக்கு உருவாக்கப்பட்டது',
        description: 'உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.',
      });
      router.push('/');
    } catch (error: any) {
      console.error('Signup error', error);
      toast({
        variant: 'destructive',
        title: 'பதிவு செய்வதில் பிழை',
        description:
          error.code === 'auth/email-already-in-use'
            ? 'இந்த மின்னஞ்சல் ஏற்கனவே பயன்பாட்டில் உள்ளது.'
            : 'ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>புதிய கணக்கை உருவாக்கவும்</CardTitle>
        <CardDescription>
          தொடங்க உங்கள் விவரங்களை உள்ளிடவும்.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>பயனர்பெயர்</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
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
                  <FormLabel>மின்னஞ்சல்</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>கடவுச்சொல்</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>கடவுச்சொல்லை உறுதிப்படுத்தவும்</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'உருவாக்கப்படுகிறது...' : 'கணக்கை உருவாக்கவும்'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          ஏற்கனவே கணக்கு உள்ளதா?{' '}
          <Link href="/login" className="text-primary hover:underline">
            உள்நுழைக
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
