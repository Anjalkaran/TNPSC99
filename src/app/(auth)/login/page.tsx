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

const loginSchema = z.object({
  email: z.string().email('தவறான மின்னஞ்சல் முகவரி.'),
  password: z.string().min(1, 'கடவுச்சொல் தேவை.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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
      toast({
        variant: 'destructive',
        title: 'உள்நுழைவதில் பிழை',
        description:
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential'
            ? 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்.'
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
        <CardTitle>உள்நுழைக</CardTitle>
        <CardDescription>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>கடவுச்சொல்</FormLabel>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs"
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
                    <Input type="password" placeholder="••••••••" {...field} />
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
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          கணக்கு இல்லையா?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            பதிவு செய்க
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
