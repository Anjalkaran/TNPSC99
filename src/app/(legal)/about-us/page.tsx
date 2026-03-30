'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { BookOpen, Target, BarChart3, History, MousePointer2, Users, CheckCircle2, Heart } from "lucide-react";

export default function AboutUsPage() {
  const { t } = useTranslation();

  const features = [
    {
      title: "Extensive Question Bank",
      description: "Practice with thousands of MCQs covering every subject and topic for Group I, II, IV, and class-wise tests.",
      icon: <BookOpen className="h-8 w-8 text-primary" />,
    },
    {
      title: "Syllabus-Centric Approach",
      description: "Our content is meticulously organized according to the official TNPSC syllabus to ensure you study what matters most.",
      icon: <Target className="h-8 w-8 text-secondary-foreground" />,
    },
    {
      title: "Performance Analytics",
      description: "Track your progress with our AI-powered performance reports. Identify your strengths and weaknesses effectively.",
      icon: <BarChart3 className="h-8 w-8 text-green-500" />,
    },
    {
      title: "Previous Year Papers",
      description: "Get exam-ready by practicing with previous year question papers to understand types of questions asked.",
      icon: <History className="h-8 w-8 text-orange-500" />,
    },
    {
      title: "User-Friendly Interface",
      description: "Our platform is designed to be intuitive and easy to navigate, providing a seamless learning experience.",
      icon: <MousePointer2 className="h-8 w-8 text-blue-500" />,
    },
    {
      title: "Dedicated Support",
      description: "We are here to help you every step of the way. Our team is committed to your success in the competitive exams.",
      icon: <Heart className="h-8 w-8 text-red-500" />,
    }
  ];

  return (
    <div className="flex flex-col gap-12 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground sm:py-24">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            About <span className="text-secondary">Us</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg opacity-90 sm:text-xl">
            Your dedicated partner in preparing for the Tamil Nadu Public Service Commission (TNPSC) exams. Empowering aspirants with knowledge and confidence.
          </p>
        </div>
        {/* Background Decorative patterns */}
        <div className="absolute top-0 left-0 h-full w-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-white blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary blur-[100px]" />
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container mx-auto px-4 max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="border-l-4 border-l-primary shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Target className="h-6 w-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                Our mission is to provide a comprehensive, accessible, and effective learning platform for all TNPSC aspirants. We understand the challenges and competition involved in these examinations and aim to provide a one-stop solution for success.
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary shadow-lg overflow-hidden">
            <CardHeader className="bg-secondary/10">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <CheckCircle2 className="h-6 w-6 text-secondary-foreground" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed text-muted-foreground">
                We believe in leveraging technology to make quality education affordable and accessible to everyone, regardless of their location or background. Empowering every TNPSC aspirant with confidence to excel in their journey.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* What We Offer Grid */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4 max-w-6xl text-center">
          <h2 className="mb-12 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            What We <span className="text-primary italic">Offer</span>
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-none bg-background shadow-md">
                <CardHeader className="items-center">
                  <div className="mb-4 rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team/Commitment Section */}
      <section className="container mx-auto px-4 max-w-4xl text-center">
        <div className="rounded-3xl bg-secondary/10 p-8 sm:p-12 shadow-inner border border-secondary/20">
           <Users className="mx-auto h-12 w-12 text-secondary-foreground mb-6" />
           <h2 className="mb-6 text-3xl font-bold">Our Commitment</h2>
           <p className="text-lg text-muted-foreground leading-relaxed mb-8">
             We are a team of passionate educators, tech enthusiasts, and content creators committed to making a difference in the lives of TNPSC aspirants. We continuously work to update our content and improve our platform to meet the evolving needs of our users.
           </p>
           <p className="text-xl font-medium text-foreground italic font-serif">
             "Join us on your journey to success. Happy learning!"
           </p>
        </div>
      </section>
    </div>
  );
}
