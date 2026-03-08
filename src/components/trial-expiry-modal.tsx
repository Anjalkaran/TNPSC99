'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

export function TrialExpiryModal({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free Trial Expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your one-day free trial has ended. Please subscribe to continue enjoying full access to all tests and features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction asChild>
            <Link href="/subscription">Go to Subscription</Link>
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
