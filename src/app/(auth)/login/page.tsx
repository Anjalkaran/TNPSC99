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

const loginSchema = z.object({
  email: z.string().email('தவறான மின்னஞ்சல் முகவரி.'),
  password: z.string().min(1, 'கடவுச்சொல் தேவை.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.02 2.25-4.42 0-8.03-3.6-8.03-8.03s3.6-8.03 8.03-8.03c2.5 0 4.12.98 5.02 1.9l2.4-2.4C18.02 2.37 15.48 1 12.48 1 5.88 1 1 5.88 1 12s4.88 11 11.48 11c6.6 0 11.12-4.42 11.12-11.25 0-.75-.07-1.48-.2-2.18h-11z" fill="currentColor"/>
    </svg>
  );

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

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
        title: 'மின்னஞ்சல் தேவை',
        description: 'கடவுச்சொல்லை மீட்டமைக்க ஒரு மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'மீட்டமைப்பு மின்னஞ்சல் அனுப்பப்பட்டது',
        description:
          'உங்கள் கடவுச்சொல்லை மீட்டமைப்பதற்கான வழிமுறைகளுடன் ஒரு மின்னஞ்சல் அனுப்பப்பட்டுள்ளது.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'மின்னஞ்சல் அனுப்புவதில் பிழை',
        description: 'கடவுச்சொல் மீட்டமைப்பு மின்னஞ்சலை அனுப்புவதில் ஒரு சிக்கல் ஏற்பட்டது. மின்னஞ்சல் சரியானதா என சரிபார்க்கவும்.',
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
            title: 'வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்',
            description: 'முகப்பு பக்கத்திற்கு திருப்பிவிடப்படுகிறீர்கள்.',
        });
        router.push('/');
    } catch (error: any) {
        console.error('Google Sign-In error', error);
        toast({
            variant: 'destructive',
            title: 'Google உடன் உள்நுழைவதில் பிழை',
            description: error.message || 'ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.',
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
        title: 'வெற்றிகரமாக உள்நுழைந்துள்ளீர்கள்',
        description: 'முகப்பு பக்கத்திற்கு திருப்பிவிடப்படுகிறீர்கள்.',
      });
      router.push('/');
    } catch (error: any) {
      console.error('Login error', error);
      let description = 'ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல். தயவுசெய்து உங்கள் சான்றுகளைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.';
      }
      toast({
        variant: 'destructive',
        title: 'உள்நுழைவதில் பிழை',
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
        <CardTitle>உள்நுழைக</CardTitle>
        <CardDescription className="text-gray-300">
          உங்கள் கணக்கைத் தொடர உள்நுழையவும்.
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
                  <div className="flex items-center justify-between">
                    <FormLabel>கடவுச்சொல்</FormLabel>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs text-white hover:underline"
                        >
                          கடவுச்சொல்லை மறந்துவிட்டீர்களா?
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            கடவுச்சொல்லை மீட்டமைக்கவும்
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            உங்கள் கடவுச்சொல்லை மீட்டமைக்க ஒரு இணைப்பைப் பெற
                            உங்கள் மின்னஞ்சல் முகவரியை உள்ளிடவும்.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>ரத்துசெய்</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePasswordReset}>
                            இணைப்பை அனுப்பு
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
              {isSubmitting ? 'உள்நுழைந்து கொண்டிருக்கிறது...' : 'உள்நுழைக'}
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
        <Button variant="outline" className="w-full bg-transparent hover:bg-white/10" onClick={handleGoogleSignIn} disabled={isSubmitting}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-400">
          கணக்கு இல்லையா?{' '}
          <Link href="/signup" className="text-white hover:underline">
            பதிவு செய்க
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
