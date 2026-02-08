import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/hooks/use-translation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'tnpsc99.com - TNPSC Online Tests and Exam Preparation',
    template: '%s | tnpsc99.com',
  },
  description: 'Your ultimate partner for TNPSC exam preparation. Practice with thousands of MCQs for Group II, Group IV, and class-wise tests on tnpsc99.com. Track your performance and ace the TNPSC exams.',
  keywords: ['tnpsc', 'tnpsc99', 'tnpsc99.com', 'tnpsc exams', 'tnpsc online test', 'tnpsc preparation', 'tnpsc mcq', 'group 2', 'group 4', 'tnpsc ace'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "tnpsc99.com",
    "url": "https://tnpsc99.com",
    "description": "Your ultimate partner for TNPSC exam preparation. Practice with thousands of MCQs for Group II, Group IV, and class-wise tests on tnpsc99.com. Track your performance and ace the TNPSC exams.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://tnpsc99.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html suppressHydrationWarning>
       <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
