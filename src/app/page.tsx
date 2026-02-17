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

  const welcomeName = 'Aspirant';

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
      href: '/online-tests' // Placeholder
    },
    {
      icon: <CalendarDays className="h-8 w-8 text-purple-500" />,
      title: 'Study Planner',
      description: 'Organize Learning',
      href: '/online-tests' // Placeholder
    },
    {
      icon: <FileText className="h-8 w-8 text-red-500" />,
      title: 'PDF Notes',
      description: 'Downloadable Content',
      href: '/online-tests' // Placeholder
    },
    {
      icon: <ClipboardList className="h-8 w-8 text-green-500" />,
      title: 'MCQs',
      description: 'Practice Questions',
      href: '/online-tests'
    },
    {
      icon: <Layers className="h-8 w-8 text-yellow-500" />,
      title: 'Flash Cards',
      description: 'Quick Revision',
      href: '/online-tests' // Placeholder
    },
    {
      icon: <Globe className="h-8 w-8 text-blue-500" />,
      title: 'Web Guide',
      description: 'Curated Resources',
      href: '/online-tests' // Placeholder
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
        href: '/online-tests' // Placeholder
      },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="py-16 md:py-20 text-center"
        >
           <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-blue-700">
              Welcome {welcomeName}
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-6">
              Mission Inspector Posts: Start Now. Finish Strong.
            </p>
            <div className="flex flex-col items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto max-w-xs">
                <Link href="#">
                  <Download className="mr-2 h-5 w-5" />
                  Download Our Android App
                </Link>
              </Button>
               <Button asChild size="lg" variant="outline" className="border-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white w-full sm:w-auto max-w-xs shadow-lg hover:shadow-xl transition-shadow">
                <Link href="/online-tests">
                  <Flame className="mr-2 h-5 w-5" />
                  Live: All India Mock Tests
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4">
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
