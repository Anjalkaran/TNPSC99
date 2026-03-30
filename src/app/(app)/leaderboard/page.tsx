'use client';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import type { Score, Test } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

interface ProcessedScore {
  userId: string;
  username: string;
  totalScore: number;
  testsTaken: number;
  totalQuestions: number;
  accuracy: number;
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('overall');
  const [activeMockGroup, setActiveMockGroup] = useState('Group IV');

  const scoresQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'scores')) : null, [firestore]);
  const { data: allScores, isLoading: scoresLoading } = useCollection<Score>(scoresQuery);

  const testsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tests')) : null, [firestore]);
  const { data: allTests, isLoading: testsLoading } = useCollection<Test>(testsQuery);

  const isLoading = scoresLoading || testsLoading;

  const testsMetadata = useMemo(() => {
    if (!allTests) return new Map<string, { isMockTest: boolean; examGroup: string }>();
    return new Map(allTests.map(test => [
      test.id,
      { isMockTest: !!test.isMockTest, examGroup: test.examGroup || '' }
    ]));
  }, [allTests]);

  const processedLeaderboard = useMemo(() => {
    if (!allScores) return [];

    // 1. Filter for first attempts for each user and test
    const firstAttempts = new Map<string, Score>();
    
    // Sort scores by creation date to easily find the first one
    const sortedScores = [...allScores].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sortedScores.forEach(score => {
        const key = `${score.userId}-${score.testId}`;
        if (!firstAttempts.has(key)) {
            firstAttempts.set(key, score);
        }
    });

    // 2. Aggregate scores from first attempts only, excluding certain users
    const userScores = new Map<string, { username: string; totalScore: number; testsTaken: number; totalQuestions: number }>();

    firstAttempts.forEach(score => {
        // Exclude Admin and Anonymous users from the leaderboard
        if (score.username === 'Admin' || score.username === 'Anonymous') {
            return;
        }

        // Filter based on active tab
        if (activeTab === 'mock-tests') {
          const testMeta = testsMetadata.get(score.testId);
          if (!testMeta || !testMeta.isMockTest) return; // Must be a mock test
          if (testMeta.examGroup !== activeMockGroup) return; // Must match the selected exam group
        }

        // Only include valid attempts in our calculation
        const isValidScore = typeof score.totalQuestionsInTest === 'number' && score.totalQuestionsInTest > 0 && typeof score.score === 'number' && score.score <= score.totalQuestionsInTest;
        
        if (isValidScore) {
          if (!userScores.has(score.userId)) {
              userScores.set(score.userId, {
                username: score.username,
                totalScore: 0,
                testsTaken: 0,
                totalQuestions: 0,
              });
          }
          const userData = userScores.get(score.userId)!;
          userData.testsTaken += 1;
          userData.totalScore += score.score;
          userData.totalQuestions += score.totalQuestionsInTest;
        }
    });

    const leaderboard: ProcessedScore[] = Array.from(userScores.entries()).map(([userId, data]) => ({
      userId,
      ...data,
      accuracy: data.totalQuestions > 0 ? (data.totalScore / data.totalQuestions) * 100 : 0,
    }));
    
    const filteredLeaderboard = leaderboard.filter(user => user.testsTaken > 0 && user.accuracy > 0);

    // Sort by accuracy descending, then by tests taken descending as a tie-breaker
    filteredLeaderboard.sort((a, b) => {
        if (b.accuracy !== a.accuracy) {
            return b.accuracy - a.accuracy;
        }
        return b.testsTaken - a.testsTaken;
    });

    return filteredLeaderboard;
  }, [allScores, activeTab, activeMockGroup, testsMetadata]);
  
  const getRankClass = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400/20';
    if (rank === 2) return 'bg-slate-400/20';
    if (rank === 3) return 'bg-orange-400/20';
    return '';
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                {t('leaderboard')}
              </CardTitle>
              <CardDescription className="mt-2">
                See the top performers based on their overall accuracy.
              </CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overall" className="font-semibold">{t('overall')}</TabsTrigger>
                <TabsTrigger value="mock-tests" className="font-semibold">{t('mock_tests')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {activeTab === 'mock-tests' && (
            <div className="mt-4 pt-4 border-t">
              <Tabs value={activeMockGroup} onValueChange={setActiveMockGroup} className="w-full max-w-md">
                <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                  <TabsTrigger value="Group I" className="text-sm">Group I</TabsTrigger>
                  <TabsTrigger value="Group II" className="text-sm">Group II</TabsTrigger>
                  <TabsTrigger value="Group IV" className="text-sm">Group IV</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center p-8">{t('loading_users')}...</p>
          ) : processedLeaderboard && processedLeaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">தரம்</TableHead>
                  <TableHead>பயனர்</TableHead>
                  <TableHead className="text-center">தேர்வுகள்</TableHead>
                  <TableHead className="text-center">கேள்விகள்</TableHead>
                  <TableHead className="text-right">துல்லியம்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedLeaderboard.map((user, index) => (
                  <TableRow key={user.userId} className={cn(getRankClass(index + 1))}>
                    <TableCell className="font-bold text-lg text-center">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{user.testsTaken}</TableCell>
                    <TableCell className="text-center font-medium">
                      {user.totalQuestions}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-lg">
                      {user.accuracy.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <p className="text-center text-muted-foreground p-8">
              No scores have been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
