'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const scoresCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'scores') : null),
    [firestore]
  );
  
  // We fetch all scores and then aggregate them on the client.
  const { data: scores, isLoading } = useCollection<Score>(scoresCollection);

  const leaderboardData = useMemo(() => {
    if (!scores) {
      return [];
    }

    const userScores = new Map<string, LeaderboardEntry>();

    scores.forEach((score) => {
      const existingEntry = userScores.get(score.userId);
      if (existingEntry) {
        existingEntry.totalScore += score.score;
      } else {
        userScores.set(score.userId, {
          userId: score.userId,
          username: score.username,
          totalScore: score.score,
        });
      }
    });

    return Array.from(userScores.values()).sort(
      (a, b) => b.totalScore - a.totalScore
    );
  }, [scores]);

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            {t('leaderboard')}
          </CardTitle>
          <CardDescription>
            சிறப்பாக செயல்படும் பயனர்களைக் காண்க.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('loading_users')}...</p>
          ) : leaderboardData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">தரம்</TableHead>
                  <TableHead>பயனர்</TableHead>
                  <TableHead className="text-right">மொத்த மதிப்பெண்கள்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((user, index) => (
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
                    <TableCell className="text-right font-semibold">
                      {user.totalScore}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground p-8">
              முன்னிலை வகிப்பவர்கள் தரவு இன்னும் இல்லை.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
