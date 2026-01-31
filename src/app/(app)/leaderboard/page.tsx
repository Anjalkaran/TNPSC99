'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemo, useState } from 'react';
import type { Score, Class, Subject } from '@/lib/types';
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

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [filterType, setFilterType] = useState<'overall' | 'class' | 'subject'>('overall');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const classesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const subjectsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  
  const { data: classes, isLoading: classesLoading } = useCollection<Class>(classesCollection);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsCollection);

  const scoresQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    const constraints = [orderBy('score', 'desc'), limit(100)];
    
    if (filterType === 'class' && selectedClassId) {
        constraints.unshift(where('classId', '==', selectedClassId));
    } else if (filterType === 'subject' && selectedSubjectId) {
        constraints.unshift(where('subjectId', '==', selectedSubjectId));
    }
    
    return query(collection(firestore, 'scores'), ...constraints);
  }, [firestore, filterType, selectedClassId, selectedSubjectId]);

  const { data: leaderboardData, isLoading: scoresLoading } = useCollection<Score>(scoresQuery);

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

  const isLoading = scoresLoading || classesLoading || subjectsLoading;
  
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
          ) : leaderboardData && leaderboardData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">தரம்</TableHead>
                  <TableHead>பயனர் / தேர்வு</TableHead>
                  <TableHead className="text-right">மதிப்பெண்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((score, index) => (
                  <TableRow key={score.id}>
                    <TableCell className="font-bold text-lg">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {score.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">{score.username}</span>
                          <p className="text-sm text-muted-foreground">{score.testTitle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {score.score}
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
