'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart2,
  FilePenLine,
  Library,
  LogIn,
  Target,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const heroImage = PlaceHolderImages.find((img) => img.id === 'homepage-hero');

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  const features = [
    {
      icon: <Library className="h-10 w-10 text-primary mb-4" />,
      title: 'Extensive Test Categories',
      description:
        'Practice with a wide range of tests, including class-wise, subject-wise, and previous year question papers.',
    },
    {
      icon: <Target className="h-10 w-10 text-primary mb-4" />,
      title: 'Targeted Preparation',
      description:
        'Focus on specific subjects or exam groups like Group II and Group IV to streamline your study.',
    },
    {
      icon: <BarChart2 className="h-10 w-10 text-primary mb-4" />,
      title: 'Performance Analytics',
      description:
        'Our AI-powered analysis helps you identify your strengths and weaknesses to improve your scores.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="relative py-20 md:py-32"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage?.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
           <div className="relative container mx-auto px-4 text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              {t('home_title')}
            </h1>
            <p className="max-w-2xl text-lg text-primary-foreground/90 mb-8">
              {t('home_subtitle')}
            </p>
            <div className="flex justify-start gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  {t('get_started_free')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/login">{t('login')}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-accent">
                Everything You Need to Succeed
              </h2>
              <p className="max-w-2xl mx-auto mt-2 text-muted-foreground">
                Our platform is designed to provide a complete preparation
                experience.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center bg-card">
                  <CardContent className="p-8">
                    {feature.icon}
                    <h3 className="text-xl font-semibold mb-2 text-accent">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-accent">How It Works</h2>
              <p className="max-w-xl mx-auto mt-2 text-muted-foreground">
                Get started in just a few simple steps.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground mb-4">
                  <UserPlus className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-accent">1. Create Account</h3>
                <p className="text-muted-foreground">
                  Sign up for free and get immediate access to our platform.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground mb-4">
                  <FilePenLine className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-accent">2. Take Tests</h3>
                <p className="text-muted-foreground">
                  Choose from a wide variety of tests to practice and improve.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground mb-4">
                  <BarChart2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-accent">3. Track Progress</h3>
                <p className="text-muted-foreground">
                  Use our analytics to monitor your performance and focus on weak
                  areas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4 text-accent">{t('ready_to_start')}</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {t('start_your_preparation')}
            </p>
            <Button asChild size="lg">
              <Link href="/signup">
                {t('get_started_free')}{' '}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
