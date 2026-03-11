'use client';
import Link from 'next/link';
import {
  ArrowRight,
  BookCopy,
  Archive,
  Flame,
  Book,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    {
      title: t('class_wise_tests'),
      href: '/class-wise',
      icon: <Book className="h-8 w-8 text-blue-500" />,
    },
    {
      title: t('group_1_tests'),
      href: '/exam-wise/group-1',
      icon: <Flame className="h-8 w-8 text-red-500" />,
    },
    {
      title: t('group_2_tests'),
      href: '/exam-wise/group-2',
      icon: <BookCopy className="h-8 w-8 text-green-500" />,
    },
    {
      title: t('group_4_tests'),
      href: '/exam-wise/group-4',
      icon: <Archive className="h-8 w-8 text-amber-500" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
       <section className="mb-12 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">Find What You Need</h1>
        <p className="text-muted-foreground text-center mb-6">Search for tests, topics, or anything across the app.</p>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for a test..."
            className="w-full pl-10 h-12 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-5xl mx-auto">
        {categories.map((category) => (
           <Link href={category.href} key={category.title} className="block hover:no-underline group">
            <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-xl group-hover:ring-1 group-hover:ring-primary">
              <CardContent className="flex flex-grow flex-col items-center justify-center p-6 gap-4 text-center">
                {category.icon}
                <CardTitle className="text-xl">{category.title}</CardTitle>
              </CardContent>
              <CardFooter className="justify-center">
                 <div className="flex items-center text-sm font-medium text-primary group-hover:underline">
                    {t('view_tests')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
