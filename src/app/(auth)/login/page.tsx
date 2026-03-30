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
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
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
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
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

function LoginContent() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading, pendingSessionConflict, isSessionLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    if (!isUserLoading && user && !pendingSessionConflict && !isSessionLoading) {
      router.push('/');
    }
  }, [user, isUserLoading, router, pendingSessionConflict, isSessionLoading]);

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'multi_device') {
      toast({
        variant: 'destructive',
        title: t('security_notice'),
        description: t('logout_reason_multi_device'),
      });
      // Gently clean up the URL without a full reload
      router.replace('/login');
    }
  }, [searchParams, toast, router]);

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

  const handleSuccessfulLogin = async (user: import('firebase/auth').User) => {
    const firestore = getFirestore(auth.app);
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const update: any = {};
    let needsUpdate = false;

    if (userDocSnap.exists()) {
        const userProfile = userDocSnap.data() as any; // Read as 'any' to handle old data model
        const now = new Date();
        const expires = userProfile.subscriptionExpires ? new Date(userProfile.subscriptionExpires) : null;
        const trialExpires = userProfile.trialEndsAt ? new Date(userProfile.trialEndsAt) : null;

        // Migrate old 'free_trial' status
        if (userProfile.subscriptionStatus === 'free_trial') {
            update.subscriptionStatus = 'premium';
            if (trialExpires) {
                update.subscriptionExpires = userProfile.trialEndsAt;
            }
            update.trialEndsAt = deleteField();
            needsUpdate = true;
        }
        // Migrate old 'free_access' status
        else if (userProfile.subscriptionStatus === 'free_access') {
            const longExpiry = new Date();
            longExpiry.setFullYear(longExpiry.getFullYear() + 50); // Grant 50 years of premium
            update.subscriptionStatus = 'premium';
            update.subscriptionExpires = longExpiry.toISOString();
            needsUpdate = true;
        }
        // Handle expired premium users
        else if (userProfile.subscriptionStatus === 'premium' && expires && expires < now) {
            update.subscriptionStatus = 'free';
            needsUpdate = true;
        }
        // Handle users with no status (old users)
        else if (!userProfile.subscriptionStatus || userProfile.subscriptionStatus === 'none') {
            const newTrialExpiry = new Date();
            newTrialExpiry.setDate(newTrialExpiry.getDate() + 1);
            update.subscriptionStatus = 'premium';
            update.subscriptionExpires = newTrialExpiry.toISOString();
            needsUpdate = true;
        }

        if (needsUpdate) {
            await updateDoc(userDocRef, update);
        }
        sessionStorage.setItem('show_sidebar_hint', 'true');
    } else {
        // New user (e.g., first sign-in with Google, or email sign-in without sign-up)
        const subscriptionExpires = new Date();
        subscriptionExpires.setDate(subscriptionExpires.getDate() + 1);

        const newUserProfile: UserProfile = {
            id: user.uid,
            username: user.displayName || user.email!,
            email: user.email!,
            registrationDate: new Date().toISOString(),
            isAdmin: user.email === 'admin@tnpsc99.com',
            referralCode: user.uid.slice(0, 8),
            referralCount: 0,
            subscriptionStatus: 'premium', // Grant trial
            subscriptionExpires: subscriptionExpires.toISOString(),
        };
        await setDoc(userDocRef, newUserProfile);
        sessionStorage.setItem('show_sidebar_hint', 'true');
    }
  };


  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await handleSuccessfulLogin(result.user);
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
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(credential.user);
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
    <div className="w-full max-w-md px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2 tracking-tight">
          Welcome back to <span className="text-primary italic">TNPSC99</span>
        </h1>
        <p className="text-muted-foreground font-medium">
          {t('login_to_continue')}
        </p>
      </div>

      <Card className="w-full bg-card/40 backdrop-blur-2xl border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        {/* Subtle top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">{t('login')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-foreground/80 font-semibold text-sm ml-1">{t('email')}</FormLabel>
                    <FormControl>
                      <Input 
                        className="h-12 bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50 rounded-xl transition-all" 
                        placeholder={t('email_placeholder')} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <FormLabel className="text-foreground/80 font-semibold text-sm">{t('password')}</FormLabel>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-xs text-brand-orange hover:text-brand-orange/80 hover:underline font-bold"
                          >
                            {t('forgot_password')}
                          </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent className="bg-card border-border text-foreground">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">
                              {t('reset_password')}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              {t('reset_password_desc')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="bg-muted/30 border-border focus:border-primary/50"
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-muted border-none text-foreground hover:bg-muted/80 transition-colors">
                                {t('cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handlePasswordReset} className="bg-primary hover:bg-primary/90 text-white font-bold">
                              {t('send_link')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Input 
                          className="h-12 bg-muted/30 border-border focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50 pr-12 rounded-xl transition-all" 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder={t('password_placeholder')} 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-10 w-10 p-0 hover:bg-muted text-muted-foreground/60 hover:text-foreground rounded-lg transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
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
                        {t('logging_in')}
                    </div>
                ) : t('login')}
              </Button>
            </form>
          </Form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="bg-background/10 backdrop-blur-sm px-3 text-muted-foreground">
                OR
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12 bg-muted/30 border-border hover:bg-muted/50 text-foreground hover:text-foreground transition-all duration-300 font-bold rounded-xl active:scale-[0.98]" 
            onClick={handleGoogleSignIn} 
            disabled={isSubmitting}
          >
            <GoogleIcon className="mr-3 h-5 w-5" />
            {t('continue_with_google')}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pb-8 pt-2">
          <p className="text-sm text-muted-foreground font-medium">
            {t('no_account')}{' '}
            <Link href="/signup" className="text-brand-orange hover:text-brand-orange/80 font-black hover:underline transition-colors ml-1">
              {t('register')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
