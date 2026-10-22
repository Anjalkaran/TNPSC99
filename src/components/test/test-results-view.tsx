'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  Flag,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Question, Test } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TextbookReferenceDrawer } from './textbook-reference-drawer';

interface TestResultsViewProps {
  test: Test;
  questions: Question[];
  answers: (number | undefined)[];
  markedForReview: boolean[];
  timeTakenSeconds: number;
  mode: 'practice' | 'exam';
  onRetake: (newMode: 'practice' | 'exam') => void;
  onExit: () => void;
  isAuthorizedForReferences: boolean;
  studyMaterialUrl?: string;
}

export function TestResultsView({
  test,
  questions,
  answers,
  markedForReview,
  timeTakenSeconds,
  mode,
  onRetake,
  onExit,
  isAuthorizedForReferences,
  studyMaterialUrl,
}: TestResultsViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'incorrect' | 'correct' | 'unanswered' | 'marked'>('all');
  
  // Drawer state for reviewing references
  const [activeReferenceQuestion, setActiveReferenceQuestion] = useState<Question | null>(null);

  // Calculate statistics
  const totalQuestions = questions.length;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let markedCount = 0;

  questions.forEach((q, idx) => {
    const ansIdx = answers[idx];
    if (markedForReview[idx]) markedCount++;

    if (ansIdx === undefined || ansIdx === -1) {
      unansweredCount++;
    } else if (q.answerOptions[ansIdx] === q.correctAnswer) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const attemptedCount = totalQuestions - unansweredCount;
  const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const accuracyPercentage = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

  // Format time taken
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Filter questions for display
  const filteredQuestions = questions.map((q, index) => ({ q, index })).filter(({ q, index }) => {
    const ansIdx = answers[index];
    const isAnswered = ansIdx !== undefined && ansIdx !== -1;
    const isCorrect = isAnswered && q.answerOptions[ansIdx] === q.correctAnswer;

    if (activeFilter === 'incorrect') return isAnswered && !isCorrect;
    if (activeFilter === 'correct') return isCorrect;
    if (activeFilter === 'unanswered') return !isAnswered;
    if (activeFilter === 'marked') return markedForReview[index] === true;
    return true; // 'all'
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overview Scorecard */}
      <Card className="rounded-2xl border-border bg-card shadow-lg overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-emerald-500" />
        <CardHeader className="text-center p-6 sm:p-8 space-y-2">
          <Badge variant="outline" className="w-fit mx-auto px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border-primary/30 bg-primary/5">
            {mode === 'exam' ? 'Examination Result' : 'Practice Session Summary'}
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
            {test.title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Completed on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </CardDescription>

          {/* Big Score Display */}
          <div className="py-4">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl sm:text-6xl font-black text-foreground">{correctCount}</span>
              <span className="text-xl sm:text-2xl font-bold text-muted-foreground">/ {totalQuestions}</span>
            </div>
            <div className="max-w-xs mx-auto mt-3">
              <Progress value={scorePercentage} className="h-3" />
              <p className="text-xs font-bold text-muted-foreground mt-1.5">{scorePercentage.toFixed(1)}% Score</p>
            </div>
          </div>

          {/* 4 Metrics Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-left">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-1">
                <Target className="h-4 w-4 text-emerald-600" />
                <span>Accuracy</span>
              </div>
              <p className="text-lg font-black text-foreground">{accuracyPercentage.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">Of attempted questions</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Time Taken</span>
              </div>
              <p className="text-lg font-black text-foreground">{formatTime(timeTakenSeconds)}</p>
              <p className="text-[10px] text-muted-foreground">Total elapsed time</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Attempted</span>
              </div>
              <p className="text-lg font-black text-foreground">{attemptedCount} <span className="text-xs text-muted-foreground font-normal">/ {totalQuestions}</span></p>
              <p className="text-[10px] text-muted-foreground">{unansweredCount} skipped</p>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mb-1">
                <Flag className="h-4 w-4 text-purple-600" />
                <span>Reviewed</span>
              </div>
              <p className="text-lg font-black text-foreground">{markedCount}</p>
              <p className="text-[10px] text-muted-foreground">Marked for review</p>
            </div>
          </div>
        </CardHeader>

        {/* Retake & Action Buttons */}
        <CardFooter className="flex flex-col sm:flex-row gap-3 p-6 bg-muted/20 border-t border-border justify-between">
          <Button variant="outline" onClick={onExit} className="w-full sm:w-auto rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tests
          </Button>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onRetake('practice')}
              className="w-full sm:w-auto rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Retake in Practice Mode
            </Button>
            <Button
              onClick={() => onRetake('exam')}
              className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Retake in Exam Mode
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Review Filter Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
            activeFilter === 'all' ? "bg-foreground text-background shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          All Questions ({totalQuestions})
        </button>
        <button
          onClick={() => setActiveFilter('incorrect')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
            activeFilter === 'incorrect' ? "bg-destructive text-destructive-foreground shadow-sm" : "bg-card border border-border text-destructive hover:bg-destructive/10"
          )}
        >
          <XCircle className="h-3.5 w-3.5" /> Incorrect ({incorrectCount})
        </button>
        <button
          onClick={() => setActiveFilter('correct')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
            activeFilter === 'correct' ? "bg-emerald-600 text-white shadow-sm" : "bg-card border border-border text-emerald-600 hover:bg-emerald-50"
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Correct ({correctCount})
        </button>
        <button
          onClick={() => setActiveFilter('unanswered')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
            activeFilter === 'unanswered' ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground"
          )}
        >
          Unanswered ({unansweredCount})
        </button>
        {markedCount > 0 && (
          <button
            onClick={() => setActiveFilter('marked')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              activeFilter === 'marked' ? "bg-purple-600 text-white shadow-sm" : "bg-card border border-border text-purple-600 hover:bg-purple-50"
            )}
          >
            <Flag className="h-3.5 w-3.5" /> Marked ({markedCount})
          </button>
        )}
      </div>

      {/* Filtered Question Cards */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card className="rounded-2xl border-border p-8 text-center bg-card">
            <p className="text-sm font-semibold text-muted-foreground">No questions in this filter.</p>
          </Card>
        ) : (
          filteredQuestions.map(({ q, index }) => {
            const userAnswerIndex = answers[index];
            const isAnswered = userAnswerIndex !== undefined && userAnswerIndex !== -1;
            const isCorrect = isAnswered && q.answerOptions[userAnswerIndex] === q.correctAnswer;
            const isMarked = markedForReview[index] === true;

            const referenceUrl = q.referenceUrl || studyMaterialUrl || test.description;

            return (
              <Card key={q.id || index} className="rounded-2xl border-border bg-card shadow-sm overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-xs font-black text-foreground">
                        {index + 1}
                      </span>
                      {isCorrect ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Correct (+1)
                        </Badge>
                      ) : isAnswered ? (
                        <Badge variant="destructive" className="text-[10px] font-bold">
                          <XCircle className="h-3 w-3 mr-1" /> Incorrect
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                          Skipped
                        </Badge>
                      )}
                      {isMarked && (
                        <Badge variant="outline" className="text-[10px] font-bold text-purple-600 border-purple-300 bg-purple-50">
                          <Flag className="h-3 w-3 mr-1" /> Marked
                        </Badge>
                      )}
                    </div>

                    {/* Textbook Reference Link if available */}
                    {q.referencePage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveReferenceQuestion(q)}
                        className="h-7 px-2.5 rounded-lg text-primary text-xs font-bold hover:bg-primary/10"
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1" /> Page {q.referencePage}
                      </Button>
                    )}
                  </div>

                  {/* Question Text */}
                  <p className="text-base font-semibold text-foreground whitespace-pre-line leading-relaxed">
                    {q.text}
                  </p>

                  {/* Question Image if present */}
                  {q.imageUrl && (
                    <div className="flex justify-center p-2 rounded-xl bg-muted/30 border border-border">
                      <img src={q.imageUrl} alt="Question diagram" className="max-h-60 object-contain rounded-lg" />
                    </div>
                  )}

                  {/* Answer Options */}
                  <div className="space-y-2 pt-1">
                    {q.answerOptions.map((opt, optIdx) => {
                      const isOptionCorrect = opt === q.correctAnswer;
                      const isOptionSelected = optIdx === userAnswerIndex;

                      let optClass = 'border-border bg-card text-foreground/80';

                      if (isOptionCorrect) {
                        optClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-bold';
                      } else if (isOptionSelected && !isOptionCorrect) {
                        optClass = 'border-destructive bg-destructive/10 text-destructive font-semibold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm transition-colors",
                            optClass
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-muted-foreground">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span className="whitespace-pre-line">{opt}</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isOptionSelected && !isOptionCorrect && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Your Choice</Badge>
                            )}
                            {isOptionCorrect && (
                              <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5">Correct Answer</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation & Reference Rationale */}
                  {(q.explanation || q.reference) && (
                    <div className="mt-3 p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
                      {q.explanation && (
                        <div>
                          <p className="font-bold text-primary flex items-center gap-1.5">
                            <Info className="h-3.5 w-3.5" /> விளக்கம் (Explanation):
                          </p>
                          <p className="text-foreground/90 mt-1 whitespace-pre-line leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                      {q.reference && (
                        <div className="pt-1 border-t border-primary/10">
                          <p className="font-bold text-primary flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" /> பாடநூல் குறிப்பு (Textbook Citation):
                          </p>
                          <p className="text-foreground/90 mt-1 whitespace-pre-line leading-relaxed">
                            {q.reference}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Inline Reference Viewer Drawer */}
      {activeReferenceQuestion && (
        <TextbookReferenceDrawer
          open={!!activeReferenceQuestion}
          onOpenChange={(isOpen) => { if (!isOpen) setActiveReferenceQuestion(null); }}
          url={activeReferenceQuestion.referenceUrl || studyMaterialUrl}
          printedPage={activeReferenceQuestion.referencePage}
          offset={test.referencePageOffset || 0}
          title={test.title}
          citation={activeReferenceQuestion.reference}
          isAuthorized={isAuthorizedForReferences}
        />
      )}
    </div>
  );
}
