'use client';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { History, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function UserManagementPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
             <div className="mb-8">
                <h1 className="text-3xl font-bold">{t('user_management')}</h1>
                <p className="text-muted-foreground">{t('all_users_desc')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('users')}</CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <p>{t('loading_users')}...</p>
                    ) : users && users.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('username')}</TableHead>
                                    <TableHead>{t('email')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/admin/users/${user.id}/history`}>
                                                    <History className="mr-2 h-4 w-4" />
                                                    View History
                                                </Link>
                                            </Button>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/admin/users/${user.id}/performance`}>
                                                    <BarChart2 className="mr-2 h-4 w-4" />
                                                    View Performance
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center">{t('no_users_found')}</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
