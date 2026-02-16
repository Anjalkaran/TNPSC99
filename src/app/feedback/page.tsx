'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function OldFeedbackPage() {
  useEffect(() => {
    redirect('/contact');
  }, []);

  return null;
}
