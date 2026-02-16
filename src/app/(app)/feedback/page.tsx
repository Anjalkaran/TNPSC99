'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldFeedbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/feedback');
  }, [router]);

  return null; // Render nothing while redirecting
}
