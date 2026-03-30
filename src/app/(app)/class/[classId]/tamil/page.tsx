'use client';
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

export default function TamilCategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const classId = params.classId;
  const bookType = searchParams.get('bookType');

  const categories = [
    {
      id: "urai",
      name: "உரைநடை & செய்யுள்",
      slug: "urai-seyyul",
      description: "உரைநடை மற்றும் செய்யுள் பகுதியிலிருந்து வரும் கேள்விகள்.",
    },
    {
      id: "ilakkanam",
      name: "இலக்கணம்",
      slug: "ilakkanam",
      description: "தமிழ் இலக்கண விதிகளின் அடிப்படையில் கேள்விகள்.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" className="mb-4">
            <Link href={`/class/${classId}${bookType ? `?bookType=${bookType}` : ''}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back_to_subjects')}
            </Link>
        </Button>
        <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold">தமிழ் தேர்வு வகைகள்</h1>
            <p className="text-muted-foreground mt-2">நீங்கள் பயிற்சி செய்ய விரும்பும் வகையைத் தேர்ந்தெடுக்கவும்.</p>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {categories.map((category) => (
          <Card key={category.id} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-2xl">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-muted-foreground">{category.description}</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                <Link href={`/class/${classId}/tamil/${category.slug}`}>
                  {t('view_tests')} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
