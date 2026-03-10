'use client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Flame, BookCopy, Archive } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function PreviousYearPapersPage() {
  const { t } = useTranslation();

  const examGroups = [
    { name: 'Group I', href: '/previous-year/group-1', icon: <Flame className="h-8 w-8 text-red-500" /> },
    { name: 'Group II', href: '/previous-year/group-2', icon: <BookCopy className="h-8 w-8 text-green-500" /> },
    { name: 'Group IV', href: '/previous-year/group-4', icon: <Archive className="h-8 w-8 text-amber-500" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight">{t('previous_year_papers')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select an exam group to view past papers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {examGroups.map((group) => (
          <Link href={group.href} key={group.name} className="block hover:no-underline">
            <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl group hover:ring-2 hover:ring-primary">
              <CardContent className="flex flex-grow flex-col items-center justify-center p-6 gap-4 text-center">
                 {group.icon}
                <CardTitle className="text-xl">{group.name}</CardTitle>
              </CardContent>
               <CardFooter className="justify-center">
                 <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                    {t('view_tests')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
