'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserTestAttempt } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function UserExamHistoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const params = useParams();
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : undefined;

  const testAttemptsCollection = useMemoFirebase(() => 
    userId ? collection(firestore, `users/${userId}/testAttempts`) : null, 
    [userId, firestore]
  );
  
  const testAttemptsQuery = useMemoFirebase(() => 
    testAttemptsCollection ? query(testAttemptsCollection, orderBy('lastUpdatedDate', 'desc')) : null,
    [testAttemptsCollection]
  );

  const { data: testAttempts, isLoading: attemptsLoading } = useCollection<UserTestAttempt>(testAttemptsQuery);

  if (attemptsLoading) {
    return <div className="text-center p-8">Loading history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam History</CardTitle>
        <CardDescription>A list of all tests taken by this user.</CardDescription>
      </CardHeader>
      <CardContent>
        {testAttempts && testAttempts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>தேர்வு</TableHead>
                <TableHead>தேதி</TableHead>
                <TableHead>நிலை</TableHead>
                <TableHead className="text-right">மதிப்பெண்</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell className="font-medium">
                    {attempt.testTitle ?? 'Unknown Test'}
                    {attempt.isMockTest && <Badge variant="secondary" className="ml-2">Mock Test</Badge>}
                  </TableCell>
                  <TableCell>{format(new Date(attempt.lastUpdatedDate), 'dd-MM-yyyy')}</TableCell>
                   <TableCell>
                      <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'}>
                        {attempt.status}
                      </Badge>
                    </TableCell>
                  <TableCell className="text-right">{attempt.score > 0 ? attempt.score : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-16">
              <p className="text-muted-foreground">This user has not attempted any tests yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
