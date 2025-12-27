'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { Score, Test, Class, Subject } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [filterType, setFilterType] = useState<'overall' | 'class' | 'subject'>('overall');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Fetch all necessary data
  const scoresCollection = useMemoFirebase(() => firestore ? collection(firestore, 'scores') : null, [firestore]);
  const testsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'tests') : null, [firestore]);
  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  
  const { data: scores, isLoading: scoresLoading } = useCollection<Score>(scoresCollection);
  const { data: tests, isLoading: testsLoading } = useCollection<Test>(testsCollection);
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

  const testsMap = useMemo(() => {
    if (!tests) return new Map();
    return new Map(tests.map(test => [test.id, test]));
  }, [tests]);

  const uniqueClasses = useMemo(() => {
    if (!classes) return [];
    const seen = new Set();
    return classes.filter(cls => {
      const duplicate = seen.has(cls.id);
      seen.add(cls.id);
      return !duplicate;
    });
  }, [classes]);

  const uniqueSubjects = useMemo(() => {
    if (!subjects) return [];
    const seen = new Set();
    return subjects.filter(sub => {
      const duplicate = seen.has(sub.id);
      seen.add(sub.id);
      return !duplicate;
    });
  }, [subjects]);


  const leaderboardData = useMemo(() => {
    if (!scores) {
      return [];
    }

    let filteredScores = scores;

    if (filterType === 'class' && selectedClassId) {
        filteredScores = scores.filter(score => {
            const test = testsMap.get(score.testId);
            return test && test.classId === selectedClassId;
        });
    } else if (filterType === 'subject' && selectedSubjectId) {
        filteredScores = scores.filter(score => {
            const test = testsMap.get(score.testId);
            return test && test.subjectId === selectedSubjectId;
        });
    }

    const userScores = new Map<string, LeaderboardEntry>();

    filteredScores.forEach((score) => {
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
  }, [scores, filterType, selectedClassId, selectedSubjectId, testsMap]);

  const isLoading = scoresLoading || testsLoading || classesLoading || subjectsLoading;
  
  const handleTabChange = (value: string) => {
    setFilterType(value as 'overall' | 'class' | 'subject');
    setSelectedClassId(null);
    setSelectedSubjectId(null);
  }

  const getFilterDescription = () => {
    if (filterType === 'class' && selectedClassId) {
      const className = classes?.find(c => c.id === selectedClassId)?.name;
      return `Showing top performers for ${className}`;
    }
    if (filterType === 'subject' && selectedSubjectId) {
        const subjectName = subjects?.find(s => s.id === selectedSubjectId)?.name;
        return `Showing top performers for ${subjectName}`;
    }
    return "சிறப்பாக செயல்படும் பயனர்களைக் காண்க.";
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className='flex justify-between items-start'>
            <div>
                <CardTitle className="text-3xl font-bold flex items-center gap-2">
                    <Trophy className="text-yellow-500" />
                    {t('leaderboard')}
                </CardTitle>
                <CardDescription className="mt-2">
                    {getFilterDescription()}
                </CardDescription>
            </div>
          </div>
           <Tabs value={filterType} onValueChange={handleTabChange} className="w-full pt-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overall">Overall</TabsTrigger>
                    <TabsTrigger value="class">Class-wise</TabsTrigger>
                    <TabsTrigger value="subject">Subject-wise</TabsTrigger>
                </TabsList>
                <TabsContent value="class" className="mt-4">
                    <Select onValueChange={setSelectedClassId} value={selectedClassId || ''} disabled={classesLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a class..." />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </TabsContent>
                <TabsContent value="subject" className="mt-4">
                     <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId || ''} disabled={subjectsLoading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a subject..." />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueSubjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </TabsContent>
            </Tabs>
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
              No data for this filter.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
