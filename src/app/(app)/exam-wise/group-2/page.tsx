'use client';
import { useTranslation } from '@/hooks/use-translation';

export default function Group2Page() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold">{t('group_2_tests')}</h1>
      <p className="text-muted-foreground mt-2">This page is under construction. Tests for Group II will be available here soon.</p>
    </div>
  );
}
