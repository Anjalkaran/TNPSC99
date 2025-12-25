
'use client';

import Link from 'next/link';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

export default function PublicHomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

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
              TNPSC தேர்வுகளில் தேர்ச்சி பெறுங்கள்
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              TNPSC தேர்வு தயாரிப்புக்கான உங்கள் இறுதி இலக்கு. MCQ களின் பரந்த
              நூலகத்தை அணுகி, தேர்வில் வெற்றிபெற உங்கள் முன்னேற்றத்தைக்
              கண்காணிக்கவும்.
            </p>
            <div className="mt-8 flex justify-center gap-4">
                  <>
                  <Button asChild size="lg">
                    <Link href="/login">
                      <LogIn className="mr-2 h-5 w-5" />
                      உள்நுழைக
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/signup">
                      <UserPlus className="mr-2 h-5 w-5" />
                      பதிவு செய்க
                    </Link>
                  </Button>
                </>
            </div>
          </section>

          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4">தயாராக இருக்கிறீர்களா?</h2>
            <p className="text-muted-foreground mb-8">இன்றே உங்கள் தயாரிப்பைத் தொடங்குங்கள்.</p>
            <Button asChild size="lg">
                <Link href="/signup">
                    இலவசமாக தொடங்கவும் <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
