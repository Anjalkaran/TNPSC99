import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookCopy, Library, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const categories = [
  {
    title: 'Class-wise Tests',
    description: 'Practice tests organized by academic class standards.',
    href: '/class-wise',
    icon: <Library className="h-8 w-8 text-primary" />,
    image: PlaceHolderImages.find(img => img.id === 'class-wise')!,
  },
  {
    title: 'Subject-wise Tests',
    description: 'Focus your preparation on specific subjects.',
    href: '/subject-wise',
    icon: <BookCopy className="h-8 w-8 text-primary" />,
    image: PlaceHolderImages.find(img => img.id === 'subject-wise')!,
  },
  {
    title: 'Previous Year Papers',
    description: 'Get familiar with the exam pattern with past papers.',
    href: '/previous-year',
    icon: <Archive className="h-8 w-8 text-primary" />,
    image: PlaceHolderImages.find(img => img.id === 'previous-year')!,
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <section className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Master the TNPSC Exams
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
          Your ultimate destination for TNPSC exam preparation. Access a vast library of MCQs and track your progress to ace the test.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        {categories.map((category) => (
          <Card key={category.title} className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
             <CardHeader className="flex flex-row items-center gap-4 pb-2">
              {category.icon}
              <CardTitle className="text-xl">{category.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between">
              <p className="text-muted-foreground mb-4">{category.description}</p>
              <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                <Link href={category.href}>
                  View Tests <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
