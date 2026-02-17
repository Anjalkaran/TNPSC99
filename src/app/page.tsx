'use client';

import Link from 'next/link';
import {
  BookOpen,
  CalendarDays,
  FileText,
  ClipboardList,
  Layers,
  Globe,
  Archive,
  Newspaper,
  ArrowRight,
  Download,
  Flame,
  BookCopy,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { useUser } from '@/firebase';
import React, { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';


export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

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
      icon: <BookOpen className="h-8 w-8 text-orange-500" />,
      title: 'Syllabus',
      description: 'Detailed Course Map',
      href: '/online-tests'
    },
    {
      icon: <FileText className="h-8 w-8 text-red-500" />,
      title: 'PDF Notes',
      description: 'Downloadable Content',
      href: '/online-tests'
    },
    {
      icon: <ClipboardList className="h-8 w-8 text-green-500" />,
      title: 'MCQs',
      description: 'Practice Questions',
      href: '/online-tests'
    },
    {
      icon: <Archive className="h-8 w-8 text-indigo-500" />,
      title: 'Previous Year',
      description: 'Exam Patterns',
      href: '/previous-year'
    },
    {
        icon: <Newspaper className="h-8 w-8 text-teal-500" />,
        title: 'Current Affairs',
        description: 'Stay Updated',
        href: '/online-tests'
      },
  ];

  const examCategories = [
    {
      title: t('group_1_tests'),
      description: t('group_1_tests_short_desc'),
      href: '/exam-wise/group-1', // Assuming this path
      icon: <Layers className="h-8 w-8" />,
    },
    {
      title: t('group_2_tests'),
      description: t('group_2_tests_short_desc'),
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-8 w-8" />,
    },
    {
      title: t('group_4_tests'),
      description: t('group_4_tests_short_desc'),
      href: '/exam-wise/group-4',
      icon: <Archive className="h-8 w-8" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="py-12 md:py-16 text-center bg-gray-50"
        >
           <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-green-700">
              Crack TNPSC in Your First Attempt with TNPSC99
            </h1>
            <p className="max-w-3xl mx-auto text-lg text-gray-700 mb-8 leading-relaxed" style={{lineHeight: 1.6}}>
              Curated MCQs for Group 1, 2, 2A, 4 & VAO • Real-Time Performance Tracking • Previous Year Questions with Explanations • Ace Your Exam with Confidence
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 my-8">
                <div className="flex items-center gap-2 text-green-600">
                    <ClipboardList className="h-6 w-6" />
                    <span className="font-semibold">10,000+ MCQs</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                    <FileText className="h-6 w-6" />
                    <span className="font-semibold">500+ Mock Tests</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                    <BarChart2 className="h-6 w-6" />
                    <span className="font-semibold">Real-Time Analytics</span>
                </div>
            </div>
            <Button asChild size="lg">
                <Link href="/signup">{t('get_started_free')}</Link>
            </Button>
          </div>
        </section>

        {/* Exam Categories Section */}
        <section className="py-8 md:py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Exam Categories</h2>
              <p className="mt-2 text-gray-500">Focus your preparation on specific exam groups</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {examCategories.map((category) => (
                <Link href={category.href} key={category.title} className="block hover:no-underline group">
                  <Card className="flex h-full flex-col items-center text-center p-6 overflow-hidden transition-shadow duration-300 hover:shadow-xl">
                      <div className="mb-4 text-primary">
                        {category.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-1">{category.title}</h3>
                      <p className="text-muted-foreground text-sm">
                        {category.description}
                      </p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="pb-8 md:pb-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Our Core Features</h2>
              <p className="mt-2 text-gray-500">Everything you need to succeed in one place</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {features.map((feature, index) => (
                <Link href={feature.href} key={index} className="block hover:no-underline">
                  <Card className="text-center h-full transition-all hover:shadow-lg hover:border-blue-300">
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        <div className="p-3 bg-gray-100 rounded-lg mb-4">
                            {feature.icon}
                        </div>
                        <h3 className="text-md md:text-lg font-semibold mb-1 text-gray-800">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {feature.description}
                        </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
