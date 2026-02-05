'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useMemo } from 'react';
import type { Score } from '@/lib/types';
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

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const scoresCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'scores') : null), [firestore]);
  const scoresQuery = useMemoFirebase(() => (scoresCollection ? query(scoresCollection) : null), [scoresCollection]);
  const { data: allScores, isLoading } = useCollection<Score>(scoresQuery);

  const processedLeaderboard = useMemo(() => {
    if (!allScores) return [];

    const userScores = new Map<string, { username: string; totalScore: number; testsTaken: number }>();

    allScores.forEach(score => {
      if (!userScores.has(score.userId)) {
        userScores.set(score.userId, {
          username: score.username,
          totalScore: 0,
          testsTaken: 0,
        });
      }

      const userData = userScores.get(score.userId)!;
      userData.totalScore += score.score;
      userData.testsTaken += 1;
    });

    const leaderboard = Array.from(userScores.entries()).map(([userId, data]) => ({
      userId,
      ...data,
    }));

    // Sort by total score descending
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    return leaderboard;
  }, [allScores]);

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            {t('leaderboard')}
          </CardTitle>
          <CardDescription className="mt-2">
            See the top performers based on their total score across all tests.
          </CardDescription>
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
                  <TableHead className="text-right">மொத்த மதிப்பெண்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedLeaderboard.map((user, index) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-bold text-lg">
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
                    <TableCell className="text-right font-semibold">
                      {user.totalScore}
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
