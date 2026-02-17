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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';


export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const welcomeName = isProfileLoading ? '...' : userProfile?.username || t('user');

  const categories = [
    {
      title: t('class_wise_tests'),
      description: t('class_wise_tests_desc'),
      href: '/class-wise',
      icon: <Library className="h-8 w-8 text-primary" />,
    },
    {
      title: t('group_1_tests'),
      description: t('group_1_tests_desc'),
      href: '/exam-wise/group-1',
      icon: <Flame className="h-8 w-8 text-primary" />,
    },
    {
      title: t('group_2_tests'),
      description: t('group_2_tests_desc'),
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-8 w-8 text-primary" />,
    },
    {
      title: t('group_4_tests'),
      description: t('group_4_tests_desc'),
      href: '/exam-wise/group-4',
      icon: <Archive className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <section className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          {t('welcome_message', { name: welcomeName })}
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
          {t('welcome_subtitle')}
        </p>
      </section>

      <section className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {categories.map((category) => (
           <Link href={category.href} key={category.title} className="block hover:no-underline">
            <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-xl group">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                {category.icon}
                <CardTitle className="text-xl">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">
                  {category.description}
                </p>
              </CardContent>
              <CardFooter>
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
