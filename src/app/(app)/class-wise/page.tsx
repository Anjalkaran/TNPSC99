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
        <h1 className="text-3xl md:text-4xl font-bold">{t('class_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">{t('class_wise_tests_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Samacheer Kalvi Books Card */}
        <Link href="/online-tests" className="block hover:no-underline">
          <Card className="flex flex-col overflow-hidden hover:shadow-xl hover:shadow-accent/20 transition-all duration-300 h-full hover:ring-1 hover:ring-primary">
              <CardHeader className="flex-row items-center gap-4">
                  <BookCopy className="h-8 w-8 text-primary" />
                  <div>
                      <CardTitle>Samacheer Kalvi Books</CardTitle>
                      <CardDescription>Tests based on the current Samacheer Kalvi curriculum.</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="flex-grow">
                   <p className="text-muted-foreground">Click to browse tests for each class from 6th to 12th standard.</p>
              </CardContent>
          </Card>
        </Link>

        {/* Old Books Card */}
        <Link href="/online-tests?bookType=old" className="block hover:no-underline">
            <Card className="flex flex-col overflow-hidden hover:shadow-xl hover:shadow-accent/20 transition-all duration-300 h-full hover:ring-1 hover:ring-primary">
                <CardHeader className="flex-row items-center gap-4">
                    <Archive className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>Old Books</CardTitle>
                        <CardDescription>Practice tests from older syllabus books.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-muted-foreground">Click to browse tests for each class from the old syllabus.</p>
                </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  );
}
