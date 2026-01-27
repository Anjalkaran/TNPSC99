
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/hooks/use-translation';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const faviconUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-5029416251-928dd.firebasestorage.app/o/Logo%20icon%20featuring%20.png?alt=media&token=7579a4b6-596d-44aa-80f9-10aad1d78f98';

export const metadata: Metadata = {
  title: 'tnpsc99.com',
  description: 'Your partner for TNPSC exam preparation. Practice with class-wise, subject-wise, and previous year MCQs.',
  icons: {
    icon: faviconUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Manually adding the link as a fallback for stubborn browser caches */}
        <link rel="icon" href={faviconUrl} sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
