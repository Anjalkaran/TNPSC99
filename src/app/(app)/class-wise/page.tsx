'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookCopy, Archive } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function ClassWiseTestsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">வகுப்பு வாரியான தேர்வுகள்</h1>
        <p className="text-muted-foreground mt-2">கல்வி வகுப்பு தரங்களின்படி ஒழுங்கமைக்கப்பட்ட தேர்வுகள்.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Samacheer Kalvi Books Card */}
        <Card className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex-row items-center gap-4">
                <BookCopy className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Samacheer Kalvi Books</CardTitle>
                    <CardDescription>Tests based on the current Samacheer Kalvi curriculum.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-muted-foreground">Click below to browse tests for each class from 6th to 12th standard.</p>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                    <Link href="/online-tests">
                        {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>

        {/* Old Books Card */}
        <Card className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4">
                <Archive className="h-8 w-8 text-primary" />
                <div>
                    <CardTitle>Old Books</CardTitle>
                    <CardDescription>Practice tests from older syllabus books.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg font-semibold">விரைவில் வருகிறது</p>
                    <p>பழைய புத்தகங்களில் இருந்து தேர்வுகள் இங்கு சேர்க்கப்படும்.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
