'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Question, Test, MistakeVaultItem, UserProfile } from '@/lib/types';
import { getSubscriptionStatus } from '@/lib/subscription-utils';
import { McqTest } from '@/components/mcq-test';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, AlertCircle, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function RevisionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const source = searchParams.get('source') || 'mistake_vault';
  const requestedCount = parseInt(searchParams.get('count') || '10', 10);
  const chapterId = searchParams.get('chapterId') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [revisionTest, setRevisionTest] = useState<Test | null>(null);
  const [availableCount, setAvailableCount] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !firestore) return;

    async function prepareRevisionTest() {
      setIsLoading(true);

      // Check subscription
      const userDocSnap = await getDoc(doc(firestore, 'users', user.uid));
      if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        const { isExpired } = getSubscriptionStatus(profile);
        if (isExpired && !profile.isAdmin) {
          router.push('/subscription');
          return;
        }
      }

      let questions: Question[] = [];
      let testTitle = 'தனிப்பயன் திருப்புதல் தேர்வு';

      if (source === 'mistake_vault') {
        // Fetch unresolved mistakes
        const mistakeCol = collection(firestore, `users/${user.uid}/mistakeVault`);
        const q = query(mistakeCol, where('status', '==', 'unresolved'));
        const snap = await getDocs(q);

        const mistakeItems = snap.docs.map(d => d.data() as MistakeVaultItem);
        setAvailableCount(mistakeItems.length);

        if (mistakeItems.length === 0) {
          setIsLoading(false);
          return;
        }

        // Shuffle and slice requested count
        const shuffled = [...mistakeItems].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, requestedCount);

        if (selected.length < requestedCount) {
          setNoticeMessage(
            `கோரப்பட்ட ${requestedCount} வினாக்களுக்குப் பதிலாக, பெட்டகத்தில் உள்ள ${selected.length} வினாக்கள் மட்டுமே சேர்க்கப்பட்டுள்ளன.`
          );
        }

        testTitle = `தவறு பெட்டகம் — திருப்புதல் தேர்வு (${selected.length} வினாக்கள்)`;

        questions = selected.map(item => ({
          id: item.questionId,
          text: item.questionText,
          answerOptions: item.answerOptions,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          referencePage: item.referencePage,
        }));
      } else if (source === 'weak_chapter' && chapterId) {
        // Fetch questions from weak chapter test
        const testDoc = await getDoc(doc(firestore, 'tests', chapterId));
        if (testDoc.exists()) {
          const testData = testDoc.data() as Test;
          const allQuestions = testData.questions || [];
          setAvailableCount(allQuestions.length);

          const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
          questions = shuffled.slice(0, Math.min(requestedCount, allQuestions.length));
          testTitle = `${testData.title} — மீள்திருப்புதல் தேர்வு (${questions.length} வினாக்கள்)`;

          if (questions.length < requestedCount) {
            setNoticeMessage(
              `பாடப்பிரிவில் தற்போது ${questions.length} வினாக்கள் மட்டுமே உள்ளன.`
            );
          }
        }
      }

      if (questions.length > 0) {
        const testObj: Test = {
          id: `rev-${source}-${Date.now()}`,
          title: testTitle,
          questions,
          questionIds: questions.map(q => q.id),
          isMockTest: true,
          duration: Math.max(5, questions.length), // 1 min per question
          referencePageOffset: 10,
        };
        setRevisionTest(testObj);
      }

      setIsLoading(false);
    }

    prepareRevisionTest().catch(err => {
      console.error('Revision engine error:', err);
      setIsLoading(false);
    });
  }, [user, firestore, source, requestedCount, chapterId, router]);

  if (isUserLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800">திருப்புதல் தேர்வு வினாக்கள் தயாராகின்றன...</h3>
        <p className="text-sm text-muted-foreground mt-1">கணிதரீதியான வரிசைப்படுத்தல் நடைபெறுகிறது</p>
      </div>
    );
  }

  if (!revisionTest || revisionTest.questions.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-2xl py-16">
        <Card className="rounded-3xl border-2 border-dashed p-8 text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <BookOpen className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">
              திருப்புதல் செய்ய வினாக்கள் இல்லை
            </CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto mt-2">
              தவறு பெட்டகத்தில் திருப்புதல் செய்ய வேண்டிய வினாக்கள் எதுவும் தற்போது இல்லை. புதிய மாதிரித் தேர்வுகளை எழுதி உங்கள் அறிவை சோதிக்கவும்.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3 pt-4">
            <Link href="/mistake-vault">
              <Button variant="outline" className="rounded-xl">தவறு பெட்டகம்</Button>
            </Link>
            <Link href="/class-wise">
              <Button className="bg-[#1e3a8a] text-white rounded-xl">பாடவாரியான தேர்வுகள்</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
      {noticeMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Render seamlessly in Phase 3B MCQ engine */}
      <McqTest
        test={revisionTest}
        totalQuestions={revisionTest.questions.length}
        answeredQuestions={0}
        inProgressAttempt={null}
      />
    </div>
  );
}
