'use client';
import Link from 'next/link';
import {
  ArrowRight,
  BookCopy,
  Library,
  Archive,
  Flame,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';


export default function DashboardPage() {
  const { t } = useTranslation();

  const categories = [
    {
      title: t('class_wise_tests'),
      href: '/class-wise',
      icon: <Library className="h-8 w-8 text-blue-500" />,
    },
    {
      title: t('group_1_tests'),
      href: '/exam-wise/group-1',
      icon: <Flame className="h-8 w-8 text-red-500" />,
    },
    {
      title: t('group_2_tests'),
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-8 w-8 text-green-500" />,
    },
    {
      title: t('group_4_tests'),
      href: '/exam-wise/group-4',
      icon: <Archive className="h-8 w-8 text-amber-500" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-5xl mx-auto">
        {categories.map((category) => (
           <Link href={category.href} key={category.title} className="block hover:no-underline">
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl group">
              <CardContent className="flex flex-grow flex-col items-center justify-center p-6 gap-4 text-center">
                {category.icon}
                <CardTitle className="text-xl">{category.title}</CardTitle>
              </CardContent>
              <CardFooter className="justify-center">
                 <div className="flex items-center text-sm font-medium text-accent group-hover:underline">
                    {t('view_tests')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
