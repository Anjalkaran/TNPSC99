'use client';
import { useFirestore, useCollection } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { UserProfile, UserTestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { useTranslation } from '@/hooks/use-translation';

function AllUsersList() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    if (usersLoading) return <p>Loading users...</p>

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('all_users')}</CardTitle>
                <CardDescription>{t('all_users_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('username')}</TableHead>
                            <TableHead>{t('email')}</TableHead>
                            <TableHead>{t('registration_date')}</TableHead>
                            <TableHead>{t('is_admin')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{format(new Date(user.registrationDate), 'PP')}</TableCell>
                                <TableCell>{user.isAdmin ? t('yes') : t('no')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {users?.length === 0 && <p className="text-center text-muted-foreground p-8">{t('no_users_found')}</p>}
            </CardContent>
        </Card>
    )
}

function AllUserAttempts() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [allAttempts, setAllAttempts] = useState<(UserTestAttempt & { userEmail?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    useEffect(() => {
        const fetchAllAttempts = async () => {
            if (!firestore || !users) {
              setLoading(false);
              return;
            }
        
            setLoading(true);
            const allUserAttempts: (UserTestAttempt & { userEmail?: string })[] = [];
        
            for (const user of users) {
              const attemptsRef = collection(firestore, 'users', user.id, 'testAttempts');
              const attemptsSnapshot = await getDocs(attemptsRef);
              attemptsSnapshot.forEach((doc) => {
                allUserAttempts.push({ 
                  id: doc.id,
                  ...(doc.data() as UserTestAttempt),
                  userEmail: user.email
                });
              });
            }
        
            setAllAttempts(allUserAttempts.sort((a,b) => new Date(b.attemptDate).getTime() - new Date(a.attemptDate).getTime()));
            setLoading(false);
          };
      
          fetchAllAttempts();
    }, [users, firestore]);

    if(loading || usersLoading) return <p>Loading all user attempts...</p>
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('all_user_attempts')}</CardTitle>
                <CardDescription>{t('all_user_attempts_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('user')}</TableHead>
                            <TableHead>{t('test')}</TableHead>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead className="text-right">{t('score')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allAttempts.map((attempt) => (
                            <TableRow key={attempt.id}>
                                <TableCell>{attempt.userEmail}</TableCell>
                                <TableCell className="font-medium">{attempt.testTitle ?? t('unknown_test')}</TableCell>
                                <TableCell>{format(new Date(attempt.attemptDate), 'PPp')}</TableCell>
                                <TableCell className="text-right">{attempt.score}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {allAttempts.length === 0 && <p className="text-center text-muted-foreground p-8">{t('no_attempts_found')}</p>}
            </CardContent>
        </Card>
    )

}

export default function AdminPage() {
    const { t } = useTranslation();
  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">{t('admin_panel')}</h1>
            <Button asChild>
                <Link href="/admin/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    {t('upload_mcqs')}
                </Link>
            </Button>
        </div>
      <AllUsersList />
      <AllUserAttempts />
    </div>
  );
}
