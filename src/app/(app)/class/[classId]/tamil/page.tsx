'use client';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookText } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";

export default function TamilCategoryPage() {
  const params = useParams();
  const { t } = useTranslation();
  const classId = params.classId;

  const categories = [
    {
      id: "urai",
      name: "உரைநடை & செய்யுள்",
      description: "உரைநடை மற்றும் செய்யுள் பகுதியிலிருந்து வரும் கேள்விகள்.",
      href: `/class/${classId}/tamil/urai`
    },
    {
      id: "ilakkanam",
      name: "இலக்கணம்",
      description: "தமிழ் இலக்கண விதிகளின் அடிப்படையில் கேள்விகள்.",
      href: `/class/${classId}/tamil/ilakkanam`
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">தமிழ் தேர்வு வகைகள்</h1>
        <p className="text-muted-foreground mt-2">நீங்கள் பயிற்சி செய்ய விரும்பும் வகையைத் தேர்ந்தெடுக்கவும்.</p>
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
            <CardContent>
              <Button asChild className="w-full mt-4" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                <Link href={category.href}>
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
