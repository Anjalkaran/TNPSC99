'use client';
import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t bg-background/95">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {new Date().getFullYear()} tnpsc99.com. All Rights Reserved.
        </p>
        <div className="flex items-center gap-x-4">
          <Link href="/about-us" className="text-sm text-muted-foreground hover:text-foreground">About Us</Link>
          <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-foreground">Terms & Conditions</Link>
          <Link href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</Link>
        </div>
      </div>
    </footer>
  );
}
