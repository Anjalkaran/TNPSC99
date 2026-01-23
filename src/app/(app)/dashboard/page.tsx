'use client';
import Link from 'next/link';
import {
  ArrowRight,
  BookCopy,
  Library,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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

      <section className="grid md:grid-cols-1 gap-8 max-w-lg mx-auto">
        {categories.map((category) => (
          <Card
            key={category.title}
            className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              {category.icon}
              <CardTitle className="text-xl">{category.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <p className="text-muted-foreground mb-4">
                {category.description}
              </p>
              <Button
                asChild
                className="w-full mt-auto"
                style={{
                  backgroundColor: 'hsl(var(--accent))',
                  color: 'hsl(var(--accent-foreground))',
                }}
              >
                <Link href={category.href}>
                  {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
