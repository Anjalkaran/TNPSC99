'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookText } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

// Static data for class cards
const staticClasses = [
    { id: '6', name: 'வகுப்பு 6' },
];


export default function OnlineTestsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">{t('online_tests')}</h1>
        <p className="text-muted-foreground mt-2">கல்வி வகுப்பு தரங்களின்படி ஒழுங்கமைக்கப்பட்ட தேர்வுகள்.</p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {staticClasses.map((cls) => (
          <Card key={cls.id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex-row items-center gap-4">
              <BookText className="w-8 h-8 text-primary" />
              <CardTitle className="text-xl">{cls.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end">
              <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                <Link href={`/class/${cls.id}`}>
                  {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
