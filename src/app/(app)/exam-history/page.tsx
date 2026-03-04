'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserTestAttempt } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { Badge } from '@/components/ui/badge';

export default function ExamHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const testAttemptsCollection = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/testAttempts`) : null, 
    [user, firestore]
  );
  
  const testAttemptsQuery = useMemoFirebase(() => 
    testAttemptsCollection ? query(testAttemptsCollection, orderBy('lastUpdatedDate', 'desc')) : null,
    [testAttemptsCollection]
  );

  const { data: testAttempts, isLoading: attemptsLoading } = useCollection<UserTestAttempt>(testAttemptsQuery);

  if (isUserLoading || attemptsLoading) {
    return <div className="container mx-auto p-4">Loading history...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">Please log in to view your exam history.</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>தேர்வு வரலாறு</CardTitle>
          <CardDescription>நீங்கள் எடுத்த அனைத்து தேர்வுகளின் பட்டியல்.</CardDescription>
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
                    <TableCell>{format(new Date(attempt.lastUpdatedDate), 'PPp')}</TableCell>
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
                <p className="text-muted-foreground">நீங்கள் இன்னும் எந்த தேர்வையும் எடுக்கவில்லை.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
