import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { LanguageProvider } from '@/hooks/use-translation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'tnpsc99.com',
  description: 'Your partner for TNPSC exam preparation.',
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
  return (
    <html suppressHydrationWarning>
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