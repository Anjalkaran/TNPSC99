'use client';
import { useTranslation } from '@/hooks/use-translation';
import { IconMcqBank, IconTopicManagement } from '@/components/icons';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, BookOpen, Trophy, BarChart, FileText, Archive, BookOpenCheck } from 'lucide-react';

export default function AdminPage() {
    const { t } = useTranslation();

    const adminSections = [
        { href: '/admin/users', label: t('user_management'), icon: <Shield /> },
        { href: '/admin/topics', label: t('topic_management'), icon: <IconTopicManagement />},
        { href: '/admin/upload', label: t('mcq_bank'), icon: <IconMcqBank /> },
        { href: '/admin/study-material', label: 'Study Material', icon: <BookOpen /> },
        { href: '/admin/syllabus', label: 'Syllabus Management', icon: <BookOpenCheck /> },
        { href: '/admin/comments', label: 'User Feedback', icon: <FileText /> },
        { href: '/admin/previous-year-papers', label: t('previous_year_papers'), icon: <Archive /> },
        { href: '#', label: t('live_test'), icon: <Trophy />, comingSoon: true },
        { href: '#', label: t('analytics'), icon: <BarChart />, comingSoon: true },
    ];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div>
            <h1 className="text-3xl font-bold">{t('admin_panel')}</h1>
            <p className="text-muted-foreground">{t('admin_panel_desc')}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {adminSections.map(section => (
                <Link key={section.label} href={section.href} className={section.comingSoon ? "pointer-events-none" : ""}>
                    <Card className="h-full hover:border-primary hover:ring-1 hover:ring-primary transition-all">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                            <div className="text-primary text-4xl">{section.icon}</div>
                            <h3 className="font-semibold text-lg">{section.label}</h3>
                            {section.comingSoon && <span className="text-xs text-muted-foreground">({t('coming_soon')})</span>}
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    </div>
  );
}
