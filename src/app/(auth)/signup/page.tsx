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
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getFirestore, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
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
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'கடவுச்சொற்கள் பொருந்தவில்லை.',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.02 2.25-4.42 0-8.03-3.6-8.03-8.03s3.6-8.03 8.03-8.03c2.5 0 4.12.98 5.02 1.9l2.4-2.4C18.02 2.37 15.48 1 12.48 1 5.88 1 1 5.88 1 12s4.88 11 11.48 11c6.6 0 11.12-4.42 11.12-11.25 0-.75-.07-1.48-.2-2.18h-11z" fill="currentColor"/>
    </svg>
  );

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
      referralCode: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            const userProfile: UserProfile = {
                id: user.uid,
                username: user.displayName || user.email!,
                email: user.email!,
                registrationDate: new Date().toISOString(),
                isAdmin: user.email === 'admin@tnpsc99.com',
                referralCode: user.uid.slice(0, 8),
                referralCount: 0,
                subscriptionStatus: 'none',
            };

            setDoc(userDocRef, userProfile).catch((error) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userProfile,
                }));
            });
        }
        
        toast({
            title: 'கணக்கு உருவாக்கப்பட்டது',
            description: 'உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது.',
        });
        router.push('/');

    } catch (error: any) {
        console.error('Google Sign-Up error', error);
        toast({
            variant: 'destructive',
            title: 'Google உடன் பதிவு செய்வதில் பிழை',
            description: error.message || 'ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };


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
      
      // TODO: This is where the referral code logic would go.
      // 1. Query the 'users' collection to find a user with the matching `values.referralCode`.
      // 2. If a referrer is found, use a transaction to increment their `referralCount`.
      // 3. If their new count reaches 10, update their `subscriptionStatus` to 'free_access'.
      // This logic requires secure backend implementation (e.g., Cloud Functions) to prevent abuse.

      const userProfile: UserProfile = {
        id: newUser.uid,
        username: values.username,
        email: values.email,
        registrationDate: new Date().toISOString(),
        isAdmin: values.email === 'admin@tnpsc99.com',
        referralCode: newUser.uid.slice(0, 8), // Generate a unique code
        referralCount: 0,
        subscriptionStatus: 'none',
        // referredBy: referrerId, // This would be set if a valid code was used
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
    <Card className="w-full max-w-sm text-white bg-black/40 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle>புதிய கணக்கை உருவாக்கவும்</CardTitle>
        <CardDescription className="text-gray-300">
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
                    <Input className="bg-transparent placeholder:text-gray-400" placeholder="Your Name" {...field} />
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
                    <Input className="bg-transparent placeholder:text-gray-400" placeholder="name@example.com" {...field} />
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
                    <Input className="bg-transparent placeholder:text-gray-400" type="password" placeholder="••••••••" {...field} />
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
                    <Input className="bg-transparent placeholder:text-gray-400" type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <Input className="bg-transparent placeholder:text-gray-400" placeholder="Enter code from a friend" {...field} />
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
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black/30 px-2 text-gray-400">
              அல்லது தொடரவும்
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full bg-transparent hover:bg-white/10" onClick={handleGoogleSignUp} disabled={isSubmitting}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-400">
          ஏற்கனவே கணக்கு உள்ளதா?{' '}
          <Link href="/login" className="text-white hover:underline">
            உள்நுழைக
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
