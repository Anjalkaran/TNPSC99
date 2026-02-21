'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export default function AboutUsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">About Us</CardTitle>
          <CardDescription>Our Mission to Help TNPSC Aspirants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>
            Welcome to tnpsc99.com, your dedicated partner in preparing for the Tamil Nadu Public Service Commission (TNPSC) exams. Our mission is to provide a comprehensive, accessible, and effective learning platform for all TNPSC aspirants.
          </p>
          <p>
            We understand the challenges and competition involved in these examinations. That's why we've created a one-stop solution with a vast question bank, detailed performance analytics, and resources covering the entire TNPSC syllabus.
          </p>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Our Vision</h3>
            <p>
              Our vision is to empower every TNPSC aspirant with the knowledge and confidence to excel in their exams. We believe in leveraging technology to make quality education affordable and accessible to everyone, regardless of their location or background.
            </p>

            <h3 className="text-xl font-semibold text-foreground">What We Offer</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Extensive Question Bank:</strong> Practice with thousands of MCQs covering every subject and topic for Group I, II, IV, and class-wise tests.</li>
              <li><strong>Syllabus-Centric Approach:</strong> Our content is meticulously organized according to the official TNPSC syllabus to ensure you study what matters most.</li>
              <li><strong>Performance Analytics:</strong> Track your progress with our AI-powered performance reports. Identify your strengths and weaknesses to focus your efforts effectively.</li>
              <li><strong>Previous Year Papers:</strong> Get exam-ready by practicing with previous year question papers to understand the pattern and types of questions asked.</li>
              <li><strong>User-Friendly Interface:</strong> Our platform is designed to be intuitive and easy to navigate, providing a seamless learning experience.</li>
            </ul>

             <h3 className="text-xl font-semibold text-foreground">Our Team</h3>
            <p>
              We are a team of passionate educators, tech enthusiasts, and content creators who are committed to making a difference in the lives of TNPSC aspirants. We continuously work to update our content and improve our platform to meet the evolving needs of our users.
            </p>
          </div>
          <p>
            Join us on your journey to success. Happy learning!
          </p>

        </CardContent>
      </Card>
    </div>
  );
}
