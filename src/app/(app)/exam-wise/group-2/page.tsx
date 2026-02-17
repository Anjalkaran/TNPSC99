'use client';
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Archive, ArrowRight } from 'lucide-react';

export default function Group2Page() {
  const { t } = useTranslation();

  const categories = [
    {
      title: t('previous_year_papers'),
      href: '/previous-year/group-2',
      icon: <Archive className="h-8 w-8 text-amber-500" />,
    },
     // ... other categories for Group II can be added here
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight">{t('group_2_tests')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('group_2_tests_desc')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {categories.map((category) => (
          <Link href={category.href} key={category.title} className="block hover:no-underline">
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl group">
              <CardContent className="flex flex-grow flex-col items-center justify-center p-6 gap-4 text-center">
                 {category.icon}
                <CardTitle className="text-xl">{category.title}</CardTitle>
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
