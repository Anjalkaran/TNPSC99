"use client";

import { useState } from 'react';
import type { Test } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import Link from 'next/link';

export function McqTest({ test }: { test: Test }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(test.questions.length).fill(''));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = () => {
    let calculatedScore = 0;
    test.questions.forEach((q, index) => {
      if (q.correctAnswer === answers[index]) {
        calculatedScore++;
      }
    });
    setScore(calculatedScore);
    setIsSubmitted(true);
  };

  const handleTryAgain = () => {
    setCurrentQuestionIndex(0);
    setAnswers(Array(test.questions.length).fill(''));
    setIsSubmitted(false);
    setScore(0);
  };

  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;
  const currentQuestion = test.questions[currentQuestionIndex];

  if (isSubmitted) {
    const scorePercentage = (score / test.questions.length) * 100;
    return (
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl">தேர்வு முடிந்தது!</CardTitle>
          <CardDescription>நீங்கள் {test.title} தேர்வை முடித்துவிட்டீர்கள்.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-5xl font-bold" style={{ color: 'hsl(var(--accent))' }}>
            {score} / {test.questions.length}
          </div>
          <div className="w-full">
            <Progress value={scorePercentage} className="h-4" />
            <p className="text-sm text-muted-foreground mt-2">{scorePercentage.toFixed(0)}% சரி</p>
          </div>
          <div className="space-y-4 max-h-60 overflow-y-auto p-4 border rounded-md">
            {test.questions.map((q, index) => (
              <div key={q.id} className="text-left p-2 rounded-md bg-muted/50">
                <p className="font-semibold flex items-center gap-2">
                  {answers[index] === q.correctAnswer ? <CheckCircle2 className="text-green-500"/> : <XCircle className="text-red-500"/>}
                  {q.question}
                </p>
                <p className="text-sm pl-8">உங்கள் பதில்: <span className={answers[index] === q.correctAnswer ? 'text-green-600' : 'text-red-600'}>{answers[index] || 'பதிலளிக்கப்படவில்லை'}</span></p>
                <p className="text-sm pl-8">சரியான பதில்: <span className="text-green-600">{q.correctAnswer}</span></p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-4">
          <Button onClick={handleTryAgain} className="w-full sm:w-auto">
            <RotateCw className="mr-2 h-4 w-4" />
            மீண்டும் முயற்சிக்கவும்
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/">முகப்புக்குத் திரும்பு</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{test.title}</CardTitle>
        <CardDescription>கேள்வி {currentQuestionIndex + 1} / {test.questions.length}</CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="py-6">
        <p className="font-semibold text-lg mb-6">{currentQuestion.question}</p>
        <RadioGroup value={answers[currentQuestionIndex]} onValueChange={handleAnswerChange}>
          <div className="space-y-4">
            {currentQuestion.options.map((option) => (
              <Label key={option} className="flex items-center space-x-3 p-4 border rounded-lg has-[:checked]:bg-primary/20 has-[:checked]:border-primary transition-colors cursor-pointer">
                <RadioGroupItem value={option} id={option} />
                <span>{option}</span>
              </Label>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          முந்தைய
        </Button>
        {currentQuestionIndex < test.questions.length - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
            அடுத்தது
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
            சமர்ப்பிக்கவும்
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
