'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Bookmark, Flag, Send, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  answers: (number | undefined)[];
  markedForReview: boolean[];
  onSelectQuestion: (index: number) => void;
  onSubmitTest?: () => void;
  mode: 'practice' | 'exam';
  isSubmitted?: boolean;
}

export function QuestionPalette({
  totalQuestions,
  currentQuestionIndex,
  answers,
  markedForReview,
  onSelectQuestion,
  onSubmitTest,
  mode,
  isSubmitted = false,
}: QuestionPaletteProps) {
  // Compute counts
  const answeredCount = answers.filter(a => a !== undefined && a !== -1).length;
  const unansweredCount = totalQuestions - answeredCount;
  const markedCount = markedForReview.filter(Boolean).length;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Status Legends Bar with Non-Colour Indicators */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-foreground p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-emerald-800 text-white shrink-0 flex items-center justify-center">
            <Check className="h-2.5 w-2.5" />
          </span>
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-card border border-border shrink-0 flex items-center justify-center text-[9px] font-mono text-muted-foreground">
            –
          </span>
          <span>Unanswered ({unansweredCount})</span>
        </div>
        {mode === 'exam' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md bg-purple-800 text-white shrink-0 flex items-center justify-center">
                <Flag className="h-2 w-2" />
              </span>
              <span>Review ({markedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md border-2 border-primary bg-primary/20 shrink-0" />
              <span>Current ({currentQuestionIndex + 1})</span>
            </div>
          </>
        )}
      </div>

      {/* Numbered Palette Grid */}
      <div className="flex-1 overflow-y-auto max-h-[360px] sm:max-h-[420px] pr-1">
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => {
            const isCurrent = index === currentQuestionIndex;
            const isAnswered = answers[index] !== undefined && answers[index] !== -1;
            const isMarked = markedForReview[index] === true;

            let buttonStyle = 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800';

            if (isAnswered && isMarked) {
              buttonStyle = 'bg-purple-800 text-white border-purple-900 shadow-sm';
            } else if (isMarked) {
              buttonStyle = 'bg-purple-50 text-purple-900 border-purple-400 dark:bg-purple-950/50 dark:text-purple-200';
            } else if (isAnswered) {
              buttonStyle = 'bg-emerald-800 text-white border-emerald-900 shadow-sm';
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectQuestion(index)}
                aria-label={`Question ${index + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}${isMarked ? ', Marked for Review' : ''}${isCurrent ? ', Current Question' : ''}`}
                className={cn(
                  "relative flex items-center justify-center h-10 w-full rounded-xl text-xs font-bold border transition-all duration-150 active:scale-95",
                  buttonStyle,
                  isCurrent && "ring-2 ring-primary ring-offset-2 font-black scale-105 z-10"
                )}
                title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ' (Unanswered)'}${isMarked ? ' (Marked for Review)' : ''}`}
              >
                <span>{index + 1}</span>

                {/* Mark indicator icon/dot */}
                {isMarked && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-purple-500 border border-white flex items-center justify-center">
                    <Flag className="h-1.5 w-1.5 text-white fill-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button in Exam Mode */}
      {mode === 'exam' && !isSubmitted && onSubmitTest && (
        <div className="pt-2 border-t border-border">
          <Button
            onClick={onSubmitTest}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md"
          >
            <Send className="mr-2 h-4 w-4" />
            Submit Examination
          </Button>
        </div>
      )}
    </div>
  );
}
