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
import { useAuth, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
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

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const loginSchema = z.object({
    email: z.string().email(t('invalid_email')),
    password: z.string().min(1, t('password_required')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: 'destructive',
        title: t('email_required'),
        description: t('enter_email_for_reset'),
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: t('reset_email_sent'),
        description: t('reset_email_sent_desc'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('error_sending_email'),
        description: t('error_sending_email_desc'),
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const firestore = getFirestore(auth.app);

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            const userProfile: UserProfile = {
                id: user.uid,
                username: user.displayName || user.email!,
                email: user.email!,
                registrationDate: new Date().toISOString(),
                isAdmin: user.email === 'admin@tnpsc99.com',
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
            title: t('login_successful'),
            description: t('redirecting_to_dashboard'),
        });
        router.push('/');
    } catch (error: any) {
        console.error('Google Sign-In error', error);
        toast({
            variant: 'destructive',
            title: t('google_signin_error'),
            description: error.message || t('something_went_wrong'),
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: t('login_successful'),
        description: t('redirecting_to_dashboard'),
      });
      router.push('/');
    } catch (error: any) {
      console.error('Login error', error);
      let description = t('something_went_wrong');
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = t('invalid_credentials');
      }
      toast({
        variant: 'destructive',
        title: t('login_error'),
        description: description,
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
        <CardTitle>{t('login')}</CardTitle>
        <CardDescription className="text-gray-300">
          {t('login_to_continue')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t('password')}</FormLabel>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs text-orange-500 hover:text-orange-400 hover:underline"
                        >
                          {t('forgot_password')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t('reset_password')}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('reset_password_desc')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePasswordReset}>
                            {t('send_link')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <FormControl>
                    <Input className="bg-transparent placeholder:text-gray-400" type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('logging_in') : t('login')}
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-black/30 px-2 text-gray-400">
              {t('or_continue_with')}
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full bg-transparent hover:bg-white/10" onClick={handleGoogleSignIn} disabled={isSubmitting}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Gmail
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-400">
          {t('no_account')}{' '}
          <Link href="/signup" className="text-orange-500 hover:text-orange-400 hover:underline">
            {t('register')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
