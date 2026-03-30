'use client';
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookCopy, Archive, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function ClassWiseTestsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
          <Link href="/dashboard" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            {t('back_to_dashboard')}
          </Link>
        </Button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold">{t('class_wise_tests')}</h1>
        <p className="text-muted-foreground mt-2">{t('class_wise_tests_desc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Samacheer Kalvi Books Card */}
        <Link href="/online-tests" className="block hover:no-underline group">
          <Card className="flex flex-col overflow-hidden border-blue-100 bg-blue-50/30 hover:bg-blue-50/50 hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300 h-full group-hover:ring-1 group-hover:ring-blue-400">
              <CardHeader className="flex-row items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-lg shadow-sm">
                    <BookCopy className="h-8 w-8 text-white" />
                  </div>
                  <div>
                      <CardTitle className="text-blue-900 group-hover:text-blue-600 transition-colors">Samacheer Kalvi Books</CardTitle>
                      <CardDescription className="text-blue-700/70">Tests based on the current Samacheer Kalvi curriculum.</CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="flex-grow">
                   <p className="text-blue-800/80">Click to browse tests for each class from 6th to 12th standard.</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button variant="ghost" className="p-0 text-blue-600 hover:text-blue-700 hover:bg-transparent flex items-center gap-2 font-semibold">
                  {t('view_tests')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
          </Card>
        </Link>

        {/* Old Books Card */}
        <Link href="/online-tests?bookType=old" className="block hover:no-underline group">
            <Card className="flex flex-col overflow-hidden border-amber-100 bg-amber-50/30 hover:bg-amber-50/50 hover:shadow-xl hover:shadow-amber-200/50 transition-all duration-300 h-full group-hover:ring-1 group-hover:ring-amber-400">
                <CardHeader className="flex-row items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-lg shadow-sm">
                      <Archive className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-amber-900 group-hover:text-amber-600 transition-colors">Old Books</CardTitle>
                        <CardDescription className="text-amber-700/70">Practice tests from older syllabus books.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-amber-800/80">Click to browse tests for each class from the old syllabus.</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" className="p-0 text-amber-600 hover:text-amber-700 hover:bg-transparent flex items-center gap-2 font-semibold">
                    {t('view_tests')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
            </Card>
        </Link>
      </div>
    </div>
  );
}
