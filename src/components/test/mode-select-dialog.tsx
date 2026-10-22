'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Timer, BookOpen, Sparkles, Check, ShieldAlert, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TestMode = 'practice' | 'exam';

interface ModeSelectDialogProps {
  open: boolean;
  testTitle: string;
  totalQuestions: number;
  estimatedDurationMinutes?: number;
  onSelectMode: (mode: TestMode) => void;
}

export function ModeSelectDialog({
  open,
  testTitle,
  totalQuestions,
  estimatedDurationMinutes = Math.max(1, Math.round(totalQuestions * 0.75)),
  onSelectMode,
}: ModeSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl p-6 sm:p-8 rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <Badge variant="outline" className="w-fit mx-auto px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
            Select Preparation Mode
          </Badge>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            {testTitle || 'Choose Test Mode'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Choose how you want to attempt this test ({totalQuestions} questions). You can switch modes on future attempts.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {/* Practice Mode Card */}
          <div 
            onClick={() => onSelectMode('practice')}
            className="group relative flex flex-col justify-between p-5 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-emerald-400 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  Self-Paced
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  Practice Mode (பயிற்சி)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Learn chapter concepts with instant feedback.
                </p>
              </div>

              <ul className="space-y-2 pt-2 text-xs text-foreground/80 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Instant answer reveal (Correct / Incorrect)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Detailed conceptual explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Inline textbook page citations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>No compulsory time limit pressure</span>
                </li>
              </ul>
            </div>

            <Button 
              className="mt-6 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-700/20"
              onClick={() => onSelectMode('practice')}
            >
              Start Practice Mode
            </Button>
          </div>

          {/* Exam Mode Card */}
          <div 
            onClick={() => onSelectMode('exam')}
            className="group relative flex flex-col justify-between p-5 rounded-2xl border-2 border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all duration-200"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                  <Timer className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold">
                  Exam Hall
                </Badge>
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                  Exam Mode (தேர்வு)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulate real TNPSC exam hall conditions.
                </p>
              </div>

              <ul className="space-y-2 pt-2 text-xs text-foreground/80 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Strict countdown timer (~{estimatedDurationMinutes} mins)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Zero answers revealed during exam</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Question palette & Mark for Review</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>Scorecard & explanations upon submission</span>
                </li>
              </ul>
            </div>

            <Button 
              className="mt-6 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md shadow-primary/25"
              onClick={() => onSelectMode('exam')}
            >
              Start Exam Mode
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
