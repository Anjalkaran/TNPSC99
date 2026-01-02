'use client';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { UserTestAttempt, UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { useParams, notFound } from 'next/navigation';

export default function UserExamHistoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const params = useParams();
  const userIdParam = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const userId = userIdParam ? decodeURIComponent(userIdParam) : undefined;

  const userRef = useMemoFirebase(() => (userId && firestore ? doc(firestore, 'users', userId) : null), [userId, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userRef);

  const testAttemptsCollection = useMemoFirebase(() => 
    userId ? collection(firestore, `users/${userId}/testAttempts`) : null, 
    [userId, firestore]
  );
  
  const testAttemptsQuery = useMemoFirebase(() => 
    testAttemptsCollection ? query(testAttemptsCollection, orderBy('attemptDate', 'desc')) : null,
    [testAttemptsCollection]
  );

  const { data: testAttempts, isLoading: attemptsLoading } = useCollection<UserTestAttempt>(testAttemptsQuery);

  const isLoading = isProfileLoading || attemptsLoading;

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading history...</div>;
  }
  
  if (!userProfile) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Exam History for {userProfile.username}</CardTitle>
          <CardDescription>A list of all tests taken by {userProfile.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          {testAttempts && testAttempts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>தேர்வு</TableHead>
                  <TableHead>தேதி</TableHead>
                  <TableHead className="text-right">மதிப்பெண்</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">{attempt.testTitle ?? 'Unknown Test'}</TableCell>
                    <TableCell>{format(new Date(attempt.attemptDate), 'PPp')}</TableCell>
                    <TableCell className="text-right">{attempt.score}</TableCell>
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
    </div>
  );
}
