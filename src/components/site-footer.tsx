'use client';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="py-2 md:px-8 md:py-0 border-t bg-background/95">
      <div className="container flex flex-col items-center justify-between gap-2 md:h-12 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {new Date().getFullYear()} tnpsc99.com. {t('footer_copyright')}
        </p>
        <div className="flex items-center gap-x-4">
          <Link href="https://instagram.com/tnpsc99_com" target="_blank" className="text-sm text-muted-foreground hover:text-foreground">Instagram</Link>
          <Link href="/about-us" className="text-sm text-muted-foreground hover:text-foreground">{t('about_us')}</Link>
          <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground">{t('footer_privacy')}</Link>
          <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-foreground">{t('footer_terms')}</Link>
          <Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">{t('footer_refund')}</Link>
        </div>
      </div>
    </footer>
  );
}
