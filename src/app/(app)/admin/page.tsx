'use client';
import { useFirestore, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { UserProfile, UserTestAttempt } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Shield, BookOpen, FileQuestion, BarChart, Trophy, FileText, BrainCircuit } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { useTranslation } from '@/hooks/use-translation';
import { IconMcqBank, IconQuestionBank, IconTopicManagement } from '@/components/icons';


function UserManagementTab() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    const usersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);


    if (usersLoading) return <div className="p-4">{t('loading_users')}</div>

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('users')}</CardTitle>
                <CardDescription>{t('all_users_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-4">
                     <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('search_by_name_email')}
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('username')}</TableHead>
                            <TableHead>{t('email')}</TableHead>
                            <TableHead>{t('phone')}</TableHead>
                            <TableHead>{t('city')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.phone || 'N/A'}</TableCell>
                                <TableCell>{user.city || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {filteredUsers?.length === 0 && <p className="text-center text-muted-foreground p-8">{t('no_users_found')}</p>}
            </CardContent>
        </Card>
    )
}

function PlaceholderTab({ title }: { title: string }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t(title as any)} - {t('coming_soon')}</p>
        </div>
    );
}

export default function AdminPage() {
    const { t } = useTranslation();

    const adminTabs = [
        { value: 'user-management', label: t('user_management'), icon: <Shield /> },
        { value: 'topic-management', label: t('topic_management'), icon: <IconTopicManagement /> },
        { value: 'study-material', label: t('study_material'), icon: <BookOpen /> },
        { value: 'mcq-bank', label: t('mcq_bank'), icon: <IconMcqBank /> },
        { value: 'question-bank', label: t('question_bank'), icon: <IconQuestionBank /> },
        { value: 'reasoning-bank', label: t('reasoning_bank'), icon: <BrainCircuit /> },
        { value: 'live-test', label: t('live_test'), icon: <Trophy /> },
        { value: 'analytics', label: t('analytics'), icon: <BarChart /> },
    ];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div>
            <h1 className="text-3xl font-bold">{t('admin_panel')}</h1>
            <p className="text-muted-foreground">{t('admin_panel_desc')}</p>
        </div>
        
        <Tabs defaultValue="user-management" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 h-auto bg-transparent p-0">
                {adminTabs.map(tab => (
                     <TabsTrigger key={tab.value} value={tab.value} asChild>
                         <Card className="cursor-pointer data-[state=active]:border-primary data-[state=active]:ring-2 data-[state=active]:ring-primary">
                            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                {tab.icon}
                                <span className="text-sm font-medium">{tab.label}</span>
                            </CardContent>
                         </Card>
                     </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="user-management" className="mt-6">
                <UserManagementTab />
            </TabsContent>
            {adminTabs.slice(1).map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-6">
                    <PlaceholderTab title={tab.label} />
                </TabsContent>
            ))}
        </Tabs>
    </div>
  );
}
