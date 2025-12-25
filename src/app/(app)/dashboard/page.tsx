'use client';
import Link from 'next/link';
import { ArrowRight, BookCopy, Library, Archive, LayoutDashboard, Shield, Edit, BookOpen, HelpCircle, User, History, BarChart2, Award, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/firebase';

const categories = [
  {
    title: 'வகுப்பு வாரியான தேர்வுகள்',
    description: 'கல்வி வகுப்பு தரங்களின்படி ஒழுங்கமைக்கப்பட்ட பயிற்சித் தேர்வுகள்.',
    href: '/class-wise',
    icon: <Library className="h-8 w-8 text-primary" />,
  },
  {
    title: 'பாடம் வாரியான தேர்வுகள்',
    description: 'குறிப்பிட்ட பாடங்களில் உங்கள் தயாரிப்பை மையப்படுத்துங்கள்.',
    href: '/subject-wise',
    icon: <BookCopy className="h-8 w-8 text-primary" />,
  },
  {
    title: 'முந்தைய ஆண்டு தாள்கள்',
    description: 'கடந்த காலத் தாள்களுடன் தேர்வு முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.',
    href: '/previous-year',
    icon: <Archive className="h-8 w-8 text-primary" />,
  },
];

const sidebarLinks = [
    { href: '/admin', label: 'Admin', icon: Shield },
    { href: '/online-tests', label: 'Online Tests', icon: Edit },
    { href: '/study-material', label: 'Study Material', icon: BookOpen },
    { href: '/ask-your-doubt', label: 'Ask Your Doubt', icon: HelpCircle },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/exam-history', label: 'Exam History', icon: History },
    { href: '/performance', label: 'Performance', icon: BarChart2 },
    { href: '/leaderboard', label: 'Leaderboard', icon: Award },
    { href: '/feedback', label: 'Feedback', icon: Star },
    { href: '/whatsapp-support', label: 'WhatsApp Support', icon: MessageSquare },
]


export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
    <section className="text-center mb-12 md:mb-16">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        Welcome, {user?.displayName || 'User'}!
      </h1>
      <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
        TNPSC தேர்வு தயாரிப்புக்கான உங்கள் இறுதி இலக்கு. MCQ களின் பரந்த
        நூலகத்தை அணுகி, தேர்வில் வெற்றிபெற உங்கள் முன்னேற்றத்தைக்
        கண்காணிக்கவும்.
      </p>
    </section>

    <section className="grid md:grid-cols-3 gap-8">
      {categories.map((category) => (
        <Card
          key={category.title}
          className="flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300"
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            {category.icon}
            <CardTitle className="text-xl">{category.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-between">
            <p className="text-muted-foreground mb-4">
              {category.description}
            </p>
            <Button
              asChild
              className="w-full mt-auto"
              style={{
                backgroundColor: 'hsl(var(--accent))',
                color: 'hsl(var(--accent-foreground))',
              }}
            >
              <Link href={category.href}>
                தேர்வுகளைக் காண்க <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  </div>
  );
}
