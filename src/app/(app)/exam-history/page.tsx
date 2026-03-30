'use client';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserTestAttempt } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ExamHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();
  const router = useRouter();

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
    return <div className="container mx-auto p-4">{t('loading_history')}</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">{t('login_to_view_history')}</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>{t('exam_history')}</CardTitle>
          <CardDescription>{t('exam_history_list_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {testAttempts && testAttempts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('test_label')}</TableHead>
                  <TableHead>{t('date_label')}</TableHead>
                  <TableHead>{t('status_label')}</TableHead>
                  <TableHead className="text-right">{t('score_label')}</TableHead>
                  <TableHead className="text-right">{t('action_label')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testAttempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="font-medium">
                      {attempt.testTitle ?? 'Unknown Test'}
                      {attempt.isMockTest && <Badge variant="secondary" className="ml-2">Mock Test</Badge>}
                    </TableCell>
                    <TableCell>{attempt.lastUpdatedDate ? format(new Date(attempt.lastUpdatedDate), 'dd-MM-yyyy') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={attempt.status === 'completed' ? 'default' : 'secondary'}>
                        {attempt.status === 'completed' ? t('status_completed') : t('status_in_progress')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{attempt.score > 0 || attempt.status === 'completed' ? attempt.score : '-'}</TableCell>
                    <TableCell className="text-right">
                      {attempt.status === 'in-progress' && (
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary"
                          onClick={() => router.push(`/test/${attempt.testId}?resume=true`)}
                        >
                          {t('resume')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
                <p className="text-muted-foreground">{t('no_tests_taken')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
