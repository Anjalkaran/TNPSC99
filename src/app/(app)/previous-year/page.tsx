import Link from "next/link";
import Image from "next/image";
import { tests } from "@/lib/data";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function PreviousYearPapersPage() {
  const previousYearTests = tests.filter((test) => test.category === 'previous');

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">முந்தைய ஆண்டு தாள்கள்</h1>
        <p className="text-muted-foreground mt-2">கடந்த காலத் தாள்களுடன் தேர்வு முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.</p>
      </div>

      {previousYearTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {previousYearTests.map((test) => (
            <Card key={test.slug} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <Image
                src={test.image.imageUrl}
                alt={test.title}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint={test.image.imageHint}
              />
              <CardHeader>
                <CardTitle>{test.title}</CardTitle>
                <CardDescription>{test.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{test.questions.length} கேள்விகள்</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                  <Link href={`/test/${test.slug}`}>
                    தேர்வைத் தொடங்கவும் <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">தற்போது முந்தைய ஆண்டு தாள்கள் எதுவும் இல்லை.</p>
        </div>
      )}
    </div>
  );
}
