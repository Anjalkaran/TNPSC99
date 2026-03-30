'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useEffect, useState, useMemo, Suspense } from 'react';
import type { Test } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';
import { Input } from '@/components/ui/input';

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { t } = useTranslation();
    const queryParam = searchParams.get('q');
    
    const [searchTerm, setSearchTerm] = useState(queryParam || '');
    const [results, setResults] = useState<Test[]>([]);
    
    const testsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'tests')) : null, [firestore]);
    const { data: allTests, isLoading } = useCollection<Test>(testsQuery);

    useEffect(() => {
        if (!isLoading && allTests && searchTerm) {
            const lowerCaseQuery = searchTerm.toLowerCase();
            const filteredTests = allTests.filter(test => 
                (test.title.toLowerCase().includes(lowerCaseQuery) ||
                (test.description && test.description.toLowerCase().includes(lowerCaseQuery)) ||
                (test.syllabusTopic && test.syllabusTopic.toLowerCase().includes(lowerCaseQuery)) ||
                (test.unitName && test.unitName.toLowerCase().includes(lowerCaseQuery))) &&
                !test.isMockTest
            );
            setResults(filteredTests);
        } else {
            setResults([]);
        }
    }, [isLoading, allTests, searchTerm]);
    
    useEffect(() => {
        setSearchTerm(queryParam || '');
    }, [queryParam]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto mb-8">
                <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search for a test..."
                    className="w-full pl-10 h-12 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </form>
            </div>

            <div className="flex items-center gap-2 mb-8">
                <h1 className="text-2xl font-bold">
                    Search Results
                </h1>
                {results.length > 0 && <Badge variant="secondary">{results.length} found</Badge>}
            </div>

            {isLoading && <p>Searching...</p>}

            {!isLoading && queryParam && results.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-lg text-muted-foreground">
                        No results found for "{searchTerm}". Try a different search term.
                    </p>
                </div>
            )}

            {!isLoading && results.length > 0 && (
                 <div className="space-y-4">
                    {results.map((test) => (
                         <Card key={test.id}>
                            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex-grow">
                                    <p className="font-semibold text-lg">{test.title}</p>
                                    <div className="flex items-center flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                                        {test.classId && <Badge variant="outline">Class {test.classId}</Badge>}
                                        {test.examGroup && <Badge variant="secondary">{test.examGroup}</Badge>}
                                        {test.term && <Badge variant="outline">{test.term}</Badge>}
                                        {test.unitName && <Badge variant="outline">{test.unitName}</Badge>}
                                    </div>
                                </div>
                                <Button asChild variant="outline" className="w-full mt-4 sm:mt-0 sm:w-auto">
                                    <Link href={`/test/${test.id}`}>
                                        View Test <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                         </Card>
                    ))}
                 </div>
            )}
        </div>
    );
}

export default function SearchPage() {
    return (
      <Suspense fallback={<div>Loading search...</div>}>
          <SearchContent />
      </Suspense>
    );
}
