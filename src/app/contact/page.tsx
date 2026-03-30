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
import { Mail, Send, Twitter, Facebook, Instagram, Phone, MapPin, MessageCircle, Clock, Globe, Youtube, Send as TelegramIcon } from 'lucide-react';
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
    
    // Simulating email submission
    console.log('Feedback submitted:', values);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Message Sent!',
      description: "Thank you for contacting us. We'll get back to you soon.",
    });

    form.reset();
    form.setValue('name', user?.displayName || '');
    setIsSubmitting(false);
  };

  const contactInfos = [
    {
      icon: <Mail className="h-6 w-6 text-primary" />,
      label: "Email Us",
      value: "support@tnpsc99.com",
      href: "mailto:support@tnpsc99.com",
    },
    {
      icon: <Phone className="h-6 w-6 text-primary" />,
      label: "Call or WhatsApp",
      value: "+91 95970 91008",
      href: "tel:+919597091008",
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      label: "Support Hours",
      value: "Mon - Sat: 9 AM to 6 PM",
      href: null,
    },
    {
        icon: <Globe className="h-6 w-6 text-primary" />,
        label: "Website",
        value: "www.tnpsc99.com",
        href: "https://www.tnpsc99.com",
      }
  ];

  return (
    <div className="flex flex-col gap-12 pb-20">
      {/* Hero Section */}
      <section className="bg-primary py-12 text-primary-foreground text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold sm:text-5xl md:mb-4">Get in <span className="text-secondary">Touch</span></h1>
          <p className="mx-auto max-w-2xl text-lg opacity-90">
            Have questions about subscriptions or tests? We're here to help you on your TNPSC journey.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Side: Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactInfos.map((info, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                        {info.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{info.label}</p>
                      {info.href ? (
                        <a href={info.href} className="text-sm font-medium hover:text-primary transition-colors">
                            {info.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{info.value}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator className="my-6" />

            <div>
              <p className="text-sm font-semibold mb-4 text-center lg:text-left">Follow us on social media</p>
              <div className="flex items-center justify-center lg:justify-start gap-4">
                {[
                  { icon: <Youtube className="h-5 w-5" />, href: "https://youtube.com/@tnpsc99-com" },
                  { icon: <Facebook className="h-5 w-5" />, href: "https://facebook.com/tnpsc99.com" },
                  { icon: <TelegramIcon className="h-5 w-5" />, href: "https://t.me/tnpsc99_com" },
                  { icon: <MessageCircle className="h-5 w-5" />, href: "https://wa.me/919597091008" },
                  { icon: <Twitter className="h-5 w-5" />, href: "#" },
                  { icon: <Instagram className="h-5 w-5" />, href: "https://instagram.com/tnpsc99_com" },
                ].map((social, idx) => (
                  <a key={idx} href={social.href} className="h-10 w-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-none">
              <CardHeader className="bg-muted/30">
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>Fill out the form and our team will get back to you within 24 hours.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., John Doe" {...field} className="h-11 shadow-sm" />
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
                                <Input placeholder="e.g., Question about Group IV" {...field} className="h-11 shadow-sm" />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="How can we help you?"
                              className="min-h-[150px] shadow-sm resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full text-base py-6 shadow-md shadow-primary/20">
                      {isSubmitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-5 w-5" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ Sneak Peek */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8">Quick Help</h2>
          <div className="grid gap-6">
            {[
              { q: "How do I subscribe to a plan?", a: "Navigate to the 'Subscriptions' page from your dashboard and select a plan that fits your needs." },
              { q: "Can I take tests on mobile?", a: "Yes, tnpsc99.com is fully responsive and works seamlessly on all mobile devices and tablets." },
              { q: "Are previous year papers available?", a: "Yes, we have a dedicated section for previous year questions grouped by exam type." }
            ].map((faq, idx) => (
              <Card key={idx} className="border-none shadow-sm">
                <CardHeader className="py-4">
                  <CardTitle className="text-base font-semibold">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
