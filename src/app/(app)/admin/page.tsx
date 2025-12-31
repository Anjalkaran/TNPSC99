
'use client';
import { useFirestore, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Shield, BookOpen, FileQuestion, BarChart, Trophy, FileText, BrainCircuit } from 'lucide-react';
import { useMemoFirebase } from '@/firebase/provider';
import { useTranslation } from '@/hooks/use-translation';
import { IconMcqBank, IconQuestionBank, IconTopicManagement } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
    const { t } = useTranslation();

    const adminSections = [
        { href: '/admin', label: t('user_management'), icon: <Shield /> },
        { href: '/admin/topics', label: t('topic_management'), icon: <IconTopicManagement />},
        { href: '#', label: t('study_material'), icon: <BookOpen />, comingSoon: true },
        { href: '/admin/upload', label: t('mcq_bank'), icon: <IconMcqBank /> },
        { href: '#', label: t('question_bank'), icon: <IconQuestionBank />, comingSoon: true },
        { href: '#', label: t('live_test'), icon: <Trophy />, comingSoon: true },
        { href: '#', label: t('analytics'), icon: <BarChart />, comingSoon: true },
    ];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div>
            <h1 className="text-3xl font-bold">{t('admin_panel')}</h1>
            <p className="text-muted-foreground">{t('admin_panel_desc')}</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {adminSections.map(section => (
                <Link key={section.label} href={section.href} className={section.comingSoon ? "pointer-events-none" : ""}>
                    <Card className="h-full hover:border-primary hover:ring-2 hover:ring-primary transition-all">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                            <div className="text-primary">{section.icon}</div>
                            <span className="font-semibold">{section.label}</span>
                            {section.comingSoon && <span className="text-xs text-muted-foreground">({t('coming_soon')})</span>}
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}
