'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/firebase';
import { Mail, Send, Twitter, Facebook, Instagram } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const feedbackSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters.' }),
  message: z
    .string()
    .min(10, { message: 'Message must be at least 10 characters.' })
    .max(1000, { message: 'Message must not exceed 1000 characters.' }),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function ContactPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      name: user?.displayName || '',
      subject: '',
      message: '',
    },
  });

  const onSubmit: SubmitHandler<FeedbackFormValues> = async (values) => {
    setIsSubmitting(true);
    
    // NOTE: This is where you would integrate with an email sending service (e.g., SendGrid, Resend).
    // For now, we will simulate a successful submission.
    console.log('Feedback submitted:', values);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Message Sent!',
      description: "Thank you for contacting us. We'll get back to you soon.",
    });

    form.reset();
    form.setValue('name', user?.displayName || '');
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Contact Us</CardTitle>
          <CardDescription>
            We'd love to hear from you. Please fill out the form below or reach out to us through our other channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Suggestion for new feature" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what's on your mind..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </Form>
          
          <Separator className="my-8" />

          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold">Other Ways to Reach Us</h3>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href="mailto:contact@tnpsc99.com" className="hover:underline">contact@tnpsc99.com</a>
            </div>
            <p className="text-sm text-muted-foreground pt-2">Follow us on social media:</p>
            <div className="flex items-center justify-center gap-6">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <Instagram className="h-6 w-6" />
                </a>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}