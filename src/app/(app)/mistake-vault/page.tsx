'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { MistakeVaultItem, UserProfile } from '@/lib/types';
import { hasActiveSubscription } from '@/lib/subscription-utils';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Sparkles, 
  RotateCcw, 
  ArrowRight,
  BookCheck,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { TextbookReferenceDrawer } from '@/components/test/textbook-reference-drawer';

export default function MistakeVaultPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'mastered'>('unresolved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReference, setSelectedReference] = useState<{
    referencePage: number;
    referencePageOffset?: number;
    subjectName?: string;
  } | null>(null);

  // User Profile for authorization
  const userProfileRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  const isAuthorizedForReferences = Boolean(userProfile?.isAdmin || hasActiveSubscription(userProfile));

  // Query Mistake Vault subcollection
  const mistakeColRef = useMemoFirebase(
    () => (user && firestore ? collection(firestore, `users/${user.uid}/mistakeVault`) : null),
    [user, firestore]
  );
  const mistakeQuery = useMemoFirebase(
    () => (mistakeColRef ? query(mistakeColRef, orderBy('lastFailedDate', 'desc')) : null),
    [mistakeColRef]
  );
  const { data: mistakes = [], isLoading } = useCollection<MistakeVaultItem>(mistakeQuery);

  // Counts
  const totalCount = mistakes.length;
  const unresolvedCount = useMemo(() => mistakes.filter(m => m.status === 'unresolved').length, [mistakes]);
  const masteredCount = useMemo(() => mistakes.filter(m => m.status === 'mastered').length, [mistakes]);

  // Filtered items
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = m.questionText.toLowerCase().includes(q);
        const matchesChapter = (m.chapterName || '').toLowerCase().includes(q);
        if (!matchesText && !matchesChapter) return false;
      }
      return true;
    });
  }, [mistakes, statusFilter, searchQuery]);

  // Handle Mark as Mastered toggle
  const handleToggleResolved = async (item: MistakeVaultItem) => {
    if (!user || !firestore) return;
    const itemRef = doc(firestore, `users/${user.uid}/mistakeVault`, item.questionId);
    const newStatus = item.status === 'unresolved' ? 'mastered' : 'unresolved';
    try {
      await updateDoc(itemRef, {
        status: newStatus,
        resolvedAt: newStatus === 'mastered' ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Failed to update mistake status:', err);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-3xl text-center py-20">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Login to view Mistake Vault</h2>
        <Link href="/login">
          <Button className="bg-[#1e3a8a] text-white">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
              தனிப்பயன் திருப்புதல்
            </span>
            <span className="text-xs text-blue-200">100% Deterministic Mastery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2">
            தவறு பெட்டகம் (Mistake Vault)
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl font-medium leading-relaxed">
            மாதிரித் தேர்வுகளில் நீங்கள் தவறாகப் பதிலளித்த வினாக்கள் இங்கு பதிவாகின்றன. பாடநூல் குறிப்புகளைப் படித்து, திருப்புதல் தேர்வெழுதி முழுமையான தேர்ச்சி பெறுங்கள்.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6 max-w-lg">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/10">
              <div className="text-xl sm:text-2xl font-black">{totalCount}</div>
              <div className="text-xs text-blue-200 font-semibold">மொத்தத் தவறுகள்</div>
            </div>
            <div className="bg-rose-500/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-rose-500/30">
              <div className="text-xl sm:text-2xl font-black text-rose-300">{unresolvedCount}</div>
              <div className="text-xs text-rose-200 font-semibold">சரிசெய்ய வேண்டியவை</div>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-emerald-500/30">
              <div className="text-xl sm:text-2xl font-black text-emerald-300">{masteredCount}</div>
              <div className="text-xs text-emerald-200 font-semibold">தேர்ச்சி பெற்றவை</div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {unresolvedCount > 0 && (
          <div className="mt-6 relative z-10 flex flex-wrap gap-3">
            <Link href={`/revision?source=mistake_vault&count=${Math.min(20, unresolvedCount)}`}>
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                தவறுகளைத் திருப்புதல் செய்க ({Math.min(20, unresolvedCount)} வினாக்கள்)
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={statusFilter === 'unresolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('unresolved')}
            className={statusFilter === 'unresolved' ? 'bg-[#1e3a8a] text-white' : ''}
          >
            சரிசெய்ய வேண்டியவை ({unresolvedCount})
          </Button>
          <Button
            variant={statusFilter === 'mastered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('mastered')}
            className={statusFilter === 'mastered' ? 'bg-emerald-600 text-white' : ''}
          >
            தேர்ச்சி பெற்றவை ({masteredCount})
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            அனைத்தும் ({totalCount})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="வினா அல்லது பாடத்தைத் தேடுக..."
            className="pl-9 h-9 text-sm rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Mistake Cards List */}
      {filteredMistakes.length > 0 ? (
        <div className="space-y-4">
          {filteredMistakes.map((item, index) => {
            const isUnresolved = item.status === 'unresolved';
            const selectedOpt = item.answerOptions[item.selectedOptionIndex];

            return (
              <Card 
                key={item.questionId} 
                className={`border rounded-2xl transition-all shadow-sm overflow-hidden ${
                  isUnresolved ? 'border-rose-200 bg-white hover:border-rose-300' : 'border-emerald-200 bg-slate-50/50'
                }`}
              >
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs font-bold bg-slate-100 text-slate-700">
                        #{index + 1}
                      </Badge>
                      <Badge className={isUnresolved ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>
                        {isUnresolved ? 'சரிசெய்ய வேண்டும்' : 'தேர்ச்சி பெற்றது'}
                      </Badge>
                      {item.failureCount > 1 && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                          {item.failureCount} முறை தவறியது
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.chapterName || item.testTitle}
                      </span>
                    </div>

                    {item.referencePage && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-xs shrink-0 font-bold">
                        பக்கம் {item.referencePage}
                      </Badge>
                    )}
                  </div>

                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 mt-3 leading-relaxed">
                    {item.questionText}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
                  {/* Options Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-rose-700">உங்கள் பதில்:</div>
                        <div className="font-semibold">{selectedOpt || 'பதிலளிக்கப்படவில்லை'}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-700">சரியான விடை:</div>
                        <div className="font-semibold">{item.correctAnswer}</div>
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  {item.explanation && (
                    <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <span className="font-bold text-blue-900 block mb-1">விளக்கம்:</span>
                      {item.explanation}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-4 sm:p-6 pt-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/30">
                  <div className="text-xs text-muted-foreground font-medium">
                    கடைசியாகத் தவறிய நாள்: {item.lastFailedDate ? new Date(item.lastFailedDate).toLocaleDateString('ta-IN') : '-'}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.referencePage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReference({
                          referencePage: item.referencePage!,
                          referencePageOffset: item.referencePageOffset || 0,
                          subjectName: item.chapterName,
                        })}
                        className="text-xs font-bold text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        பாடநூல் குறிப்பு
                      </Button>
                    )}

                    <Button
                      variant={isUnresolved ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleResolved(item)}
                      className="text-xs font-bold"
                    >
                      {isUnresolved ? 'தேர்ச்சி என மாற்றுக' : 'மறுபரிசீலனைக்கு மாற்று'}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 rounded-3xl p-12 text-center">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              {statusFilter === 'unresolved' ? 'அருமை! சரிசெய்ய வேண்டிய தவறுகள் எதுவும் இல்லை!' : 'பதிவுகள் எதுவும் கிடைக்கவில்லை'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {statusFilter === 'unresolved' 
                ? 'நீங்கள் அனைத்து வினாக்களிலும் சிறப்பான தேர்ச்சி பெற்றுள்ளீர்கள். புதிய மாதிரித் தேர்வுகளைத் தொடங்குங்கள்.'
                : 'தேடல் விதிகளுக்குப் பொருந்தும் தவறுகள் எதுவும் இல்லை.'}
            </p>
            <Link href="/class-wise">
              <Button className="bg-[#1e3a8a] text-white font-bold rounded-xl mt-2">
                பாடவாரியான மாதிரித் தேர்வுகள் எழுத
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Textbook Reference Radix Drawer */}
      {selectedReference && (
        <TextbookReferenceDrawer
          isOpen={Boolean(selectedReference)}
          onClose={() => setSelectedReference(null)}
          referencePage={selectedReference.referencePage}
          referencePageOffset={selectedReference.referencePageOffset}
          subjectName={selectedReference.subjectName}
          isAuthorized={isAuthorizedForReferences}
        />
      )}
    </div>
  );
}
