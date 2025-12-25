
'use client';

import Link from 'next/link';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if(!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if(isUserLoading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <section className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              {t('home_title')}
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              {t('home_subtitle')}
            </p>
            <div className="mt-8 flex justify-center gap-4">
                  <>
                  <Button asChild size="lg">
                    <Link href="/login">
                      <LogIn className="mr-2 h-5 w-5" />
                      {t('login')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/signup">
                      <UserPlus className="mr-2 h-5 w-5" />
                      {t('sign_up')}
                    </Link>
                  </Button>
                </>
            </div>
          </section>

          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4">{t('ready_to_start')}</h2>
            <p className="text-muted-foreground mb-8">{t('start_your_preparation')}</p>
            <Button asChild size="lg">
                <Link href="/signup">
                    {t('get_started_free')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
