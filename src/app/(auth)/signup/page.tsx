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
import { doc, setDoc, getFirestore, getDoc, collection, query, where, getDocs, updateDoc, runTransaction, deleteField } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useTranslation } from '@/hooks/use-translation';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
  );

export default function SignupPage() {
  const auth = useAuth();
  const firestore = getFirestore(auth.app);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signupSchema = z
  .object({
    username: z.string().min(3, t('username_min_chars')),
    email: z.string().email(t('invalid_email')),
    password: z.string().min(6, t('password_min_chars')),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('passwords_dont_match'),
    path: ['confirmPassword'],
  });

  type SignupFormValues = z.infer<typeof signupSchema>;


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
            const subscriptionExpires = new Date();
            subscriptionExpires.setDate(subscriptionExpires.getDate() + 1);

            const userProfile: UserProfile = {
                id: user.uid,
                username: user.displayName || user.email!,
                email: user.email!,
                registrationDate: new Date().toISOString(),
                isAdmin: user.email === 'admin@tnpsc99.com',
                referralCode: user.uid.slice(0, 8),
                referralCount: 0,
                subscriptionStatus: 'premium',
                subscriptionExpires: subscriptionExpires.toISOString(),
            };

            setDoc(userDocRef, userProfile).catch((error) => {
                console.error('Error creating user profile:', error);
                if (error?.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: userDocRef.path,
                        operation: 'create',
                        requestResourceData: userProfile,
                    }));
                }
            });
        }
        
        toast({
            title: t('account_created'),
            description: t('account_created_successfully'),
        });
        router.push('/');

    } catch (error: any) {
        console.error('Google Sign-Up error', error);
        toast({
            variant: 'destructive',
            title: t('google_signup_error'),
            description: error.message || t('something_went_wrong'),
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

      await updateProfile(newUser, { displayName: values.username });
      
      const subscriptionExpires = new Date();
      subscriptionExpires.setDate(subscriptionExpires.getDate() + 1); // 1-day trial

      const userProfile: UserProfile = {
        id: newUser.uid,
        username: values.username,
        email: values.email,
        registrationDate: new Date().toISOString(),
        isAdmin: values.email === 'admin@tnpsc99.com',
        referralCode: newUser.uid.slice(0, 8),
        referralCount: 0,
        subscriptionStatus: 'premium',
        subscriptionExpires: subscriptionExpires.toISOString(),
      };

      if (values.referralCode) {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('referralCode', '==', values.referralCode));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const referrerDoc = querySnapshot.docs[0];
          userProfile.referredBy = referrerDoc.id;
          // Note: Incrementing the referralCount should ideally be done in a transaction
          // or a server-side function to prevent race conditions.
          // For simplicity here, we'll leave it out of the client-side signup.
          console.log(`User was referred by ${referrerDoc.id}`);
        }
      }

      const userDocRef = doc(firestore, 'users', newUser.uid);

      setDoc(userDocRef, userProfile).catch((error) => {
        console.error('Error creating user profile:', error);
        if (error?.code === 'permission-denied') {
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
              path: userDocRef.path,
              operation: 'create',
              requestResourceData: userProfile,
            })
          );
        }
      });

      toast({
        title: t('account_created'),
        description: t('account_created_successfully'),
      });
      router.push('/');
    } catch (error: any) {
      console.error('Signup error', error);
      toast({
        variant: 'destructive',
        title: t('signup_error'),
        description:
          error.code === 'auth/email-already-in-use'
            ? t('email_already_in_use')
            : t('something_went_wrong'),
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
    <div className="w-full max-w-md px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">
          Join <span className="text-primary italic">TNPSC99</span>
        </h1>
        <p className="text-slate-600 font-medium">
          {t('enter_details_to_start')}
        </p>
      </div>

      <Card className="w-full bg-white/40 backdrop-blur-2xl border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold text-slate-900">{t('create_new_account')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 font-semibold text-sm ml-1">{t('username')}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 bg-white/60 border-slate-200 focus:border-primary/50 placeholder:text-slate-400 rounded-xl transition-all"
                        placeholder="Your Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 font-semibold text-sm ml-1">{t('email')}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 bg-white/60 border-slate-200 focus:border-primary/50 placeholder:text-slate-400 rounded-xl transition-all"
                        placeholder="name@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-slate-700 font-semibold text-sm ml-1">{t('password')}</FormLabel>
                      <FormControl>
                        <Input
                          className="h-11 bg-white/60 border-slate-200 focus:border-primary/50 placeholder:text-slate-400 rounded-xl transition-all"
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-slate-700 font-semibold text-sm ml-1">{t('confirm_password')}</FormLabel>
                      <FormControl>
                        <Input
                          className="h-11 bg-white/60 border-slate-200 focus:border-primary/50 placeholder:text-slate-400 rounded-xl transition-all"
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-700 font-semibold text-sm ml-1">{t('referral_code_optional')}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-11 bg-white/60 border-slate-200 focus:border-primary/50 placeholder:text-slate-400 rounded-xl transition-all"
                        placeholder="Enter code from a friend"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-white hover:bg-primary/90 transition-all duration-300 font-black text-base rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('creating_account')}
                  </div>
                ) : t('create_account')}
              </Button>
            </form>
          </Form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-white/10 backdrop-blur-sm px-3 text-slate-400">
                OR
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 bg-white border-slate-200 hover:bg-slate-50 text-slate-900 hover:text-slate-900 transition-all duration-300 font-bold rounded-xl active:scale-[0.98]"
            onClick={handleGoogleSignUp}
            disabled={isSubmitting}
          >
            <GoogleIcon className="mr-3 h-5 w-5" />
            Continue with Google
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center pb-8 pt-2">
          <p className="text-sm text-slate-600 font-medium">
            {t('already_have_account')}{' '}
            <Link href="/login" className="text-brand-orange hover:text-brand-orange/80 font-black hover:underline transition-colors ml-1">
              {t('login')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
