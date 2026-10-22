'use client';

import { useState } from 'react';
import type { MistakeVaultItem, UserTestAttempt, Test, Question } from '@/lib/types';
import { computeStudentProgress } from '@/lib/deterministic-progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  BookOpen, 
  Sparkles, 
  ChevronRight,
  LayoutDashboard,
  Archive,
  Book,
  Flame,
  BookCopy
} from 'lucide-react';
import { TextbookReferenceDrawer } from '@/components/test/textbook-reference-drawer';
import { McqTest } from '@/components/mcq-test';

// Sample mock data for preview
const mockAttempts: UserTestAttempt[] = [
  {
    id: 'att_01',
    userId: 'preview_user',
    testId: 'test_tamil_10_01',
    testTitle: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்',
    status: 'completed',
    score: 4,
    answers: [3, 0, 1, 2, 1],
    questionIds: ['10_1_g_S_01', '10_1_g_S_02', '10_1_g_S_03', '10_1_g_S_04', '10_1_g_S_05'],
    mode: 'exam',
    lastUpdatedDate: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'att_02',
    userId: 'preview_user',
    testId: 'test_tamil_10_01',
    testTitle: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்',
    status: 'completed',
    score: 5,
    answers: [3, 0, 1, 2, 1],
    questionIds: ['10_1_g_S_01', '10_1_g_S_02', '10_1_g_S_03', '10_1_g_S_04', '10_1_g_S_05'],
    mode: 'practice',
    lastUpdatedDate: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockMistakes: MistakeVaultItem[] = [
  {
    questionId: '10_1_g_S_04',
    testId: 'test_tamil_10_01',
    testTitle: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்',
    chapterName: 'இயல் 1: சொல் (இலக்கணம்)',
    questionText: 'எட்டு என்ற சொல் பிரிந்து நின்று தரும் பொருள் யாது?',
    answerOptions: ['எட்டைக் குறிக்கும்', 'எல் + து (எல்லைத் தூரம்)', 'எல் + து (எல்லை உண்)', 'பகை'],
    correctAnswer: 'எல் + து (எல்லை உண்)',
    selectedOptionIndex: 1,
    explanation: 'எட்டு என்ற எண் எல்+து எனப் பிரிந்து எல்லை உண் எனப் பொருள் தரும்.',
    referencePage: 14,
    referencePageOffset: 10,
    lastFailedDate: new Date(Date.now() - 3600000).toISOString(),
    failureCount: 2,
    status: 'unresolved',
  },
  {
    questionId: '10_1_g_S_01',
    testId: 'test_tamil_10_01',
    testTitle: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்',
    chapterName: 'இயல் 1: சொல் (இலக்கணம்)',
    questionText: 'சொல் என்பதன் வேறு பெயர்களில் பொருந்தாதது எது?',
    answerOptions: ['பதம்', 'மொழி', 'கிளவி', 'எழுத்து'],
    correctAnswer: 'எழுத்து',
    selectedOptionIndex: 0,
    explanation: 'சொல் என்பதற்குப் பதம், மொழி, கிளவி ஆகிய வேறு பெயர்களும் உண்டு. எழுத்து என்பது சொல்லின் பகுதி.',
    referencePage: 13,
    referencePageOffset: 10,
    lastFailedDate: new Date(Date.now() - 7200000).toISOString(),
    failureCount: 1,
    status: 'unresolved',
  },
  {
    questionId: '10_1_g_S_03',
    testId: 'test_tamil_10_01',
    testTitle: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்',
    chapterName: 'இயல் 1: சொல் (இலக்கணம்)',
    questionText: 'இரண்டு அல்லது அதற்கு மேற்பட்ட சொற்கள் தொடர்ந்து வந்து பொருள் தருவது?',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'இரட்டைக்கிளவி'],
    correctAnswer: 'தொடர்மொழி',
    selectedOptionIndex: 0,
    explanation: 'இரண்டு அல்லது அதற்கு மேற்பட்ட தனிமொழிகள் தொடர்ந்து வந்து பொருள் தருவது தொடர்மொழி ஆகும்.',
    referencePage: 13,
    referencePageOffset: 10,
    lastFailedDate: new Date(Date.now() - 86400000).toISOString(),
    failureCount: 1,
    status: 'mastered',
    resolvedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function Phase3CPreviewPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mistake-vault' | 'revision'>('dashboard');
  const [selectedReference, setSelectedReference] = useState<{
    referencePage: number;
    referencePageOffset?: number;
    subjectName?: string;
  } | null>(null);

  const progress = computeStudentProgress(mockAttempts, mockMistakes);

  const revisionTest: Test = {
    id: 'rev-preview-01',
    title: 'தவறு பெட்டகம் — திருப்புதல் மாதிரித் தேர்வு (2 வினாக்கள்)',
    questions: mockMistakes.filter(m => m.status === 'unresolved').map(m => ({
      id: m.questionId,
      text: m.questionText,
      answerOptions: m.answerOptions,
      correctAnswer: m.correctAnswer,
      explanation: m.explanation,
      referencePage: m.referencePage,
    })),
    questionIds: mockMistakes.filter(m => m.status === 'unresolved').map(m => m.questionId),
    isMockTest: true,
    duration: 5,
    referencePageOffset: 10,
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl space-y-6">
      {/* Top Preview Navigator */}
      <div className="bg-card border border-border p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#1e3a8a] text-white">Phase 3C Preview</Badge>
          <span className="text-xs text-muted-foreground font-semibold">Deterministic Learning Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'bg-[#1e3a8a] text-white' : ''}
          >
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
            Student Dashboard
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'mistake-vault' ? 'default' : 'outline'}
            onClick={() => setActiveTab('mistake-vault')}
            className={activeTab === 'mistake-vault' ? 'bg-[#1e3a8a] text-white' : ''}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-rose-500" />
            Mistake Vault (2)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'revision' ? 'default' : 'outline'}
            onClick={() => setActiveTab('revision')}
            className={activeTab === 'revision' ? 'bg-[#1e3a8a] text-white' : ''}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Revision Test
          </Button>
        </div>
      </div>

      {/* 1. STUDENT DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              TNPSC Academy Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1">
              வணக்கம், சண்முகம்!
            </h1>
            <p className="text-blue-100 text-sm sm:text-base font-medium max-w-lg">
              கற்றல் துல்லியம், தவறு பெட்டகம் மற்றும் பாடவாரியான மாதிரித் தேர்வுகள் மூலம் உங்கள் அரசுப் பணி இலக்கை அடையுங்கள்.
            </p>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">துல்லியம் (Accuracy)</span>
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">{progress.overallAccuracy}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {progress.totalCorrect} / {progress.totalQuestionsAttempted} வினாக்கள் சரி
                </p>
              </div>
              <Progress value={progress.overallAccuracy} className="h-1.5 mt-3" />
            </Card>

            <Card className="rounded-2xl border p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">முடித்த தேர்வுகள்</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">{progress.completedAttempts}</div>
                <p className="text-xs text-muted-foreground mt-1">2 மாதிரித் தேர்வுகள்</p>
              </div>
              <div className="text-xs text-emerald-700 font-semibold mt-3">
                சுய-கற்றல் & தேர்வுக்கூடம்
              </div>
            </Card>

            <Card className="rounded-2xl border bg-rose-50/50 border-rose-200 p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-700 uppercase">தவறு பெட்டகம்</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-rose-900">{progress.unresolvedMistakesCount}</div>
                <p className="text-xs text-rose-700 mt-1">சரிசெய்ய வேண்டியவை</p>
              </div>
              <button 
                onClick={() => setActiveTab('mistake-vault')}
                className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1 mt-3"
              >
                பெட்டகத்தைப் பார்க்க <ArrowRight className="h-3 w-3" />
              </button>
            </Card>

            <Card className="rounded-2xl border bg-gradient-to-br from-indigo-50/80 to-blue-50/80 border-blue-200 p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-800 uppercase">அடுத்த இலக்கு</span>
                <RotateCcw className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 line-clamp-1">
                  {progress.recommendedRevision?.title}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {progress.recommendedRevision?.description}
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => setActiveTab('revision')}
                className="w-full h-8 text-xs font-bold bg-[#1e3a8a] text-white rounded-xl mt-3"
              >
                திருப்புதல் தொடங்கு (2)
              </Button>
            </Card>
          </div>

          {/* Chapter Mastery Status */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">பாடவாரியான கற்றல் நிலை (Chapter Mastery)</h3>
                <p className="text-xs text-muted-foreground">சான்றுகள் மற்றும் துல்லியமான கணிதக் கணக்கீடு</p>
              </div>
            </div>

            <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">தமிழ் (Tamil)</span>
                  <Badge variant="secondary" className="text-xs">1 / 1 இயல் தேர்ச்சி</Badge>
                </div>
                <span className="text-xs font-bold text-muted-foreground">சராசரி: 90%</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/60 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-foreground">பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல்</div>
                  <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                    <span>துல்லியம்: 90%</span>
                    <span>•</span>
                    <span>எழுதியது: 2 முறை</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">
                    தேர்ச்சி பெற்றது
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MISTAKE VAULT VIEW */}
      {activeTab === 'mistake-vault' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
                தனிப்பயன் திருப்புதல்
              </span>
              <span className="text-xs text-blue-200">100% Deterministic Mastery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              தவறு பெட்டகம் (Mistake Vault)
            </h1>
            <p className="text-blue-100 text-sm max-w-xl">
              மாதிரித் தேர்வுகளில் தவறாகப் பதிலளித்த வினாக்கள் இங்கு சேமிக்கப்படுகின்றன. பாடநூல் குறிப்புகளைப் படித்து திருப்புதல் தேர்வு எழுதலாம்.
            </p>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {mockMistakes.map((item, idx) => {
              const isUnresolved = item.status === 'unresolved';
              return (
                <Card 
                  key={item.questionId} 
                  className={`border rounded-2xl shadow-sm overflow-hidden ${
                    isUnresolved ? 'border-rose-200 bg-white' : 'border-emerald-200 bg-slate-50/50'
                  }`}
                >
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs font-bold bg-slate-100 text-slate-700">
                          #{idx + 1}
                        </Badge>
                        <Badge className={isUnresolved ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}>
                          {isUnresolved ? 'சரிசெய்ய வேண்டும்' : 'தேர்ச்சி பெற்றது'}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">{item.chapterName}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-xs font-bold">
                        பக்கம் {item.referencePage}
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 mt-3 leading-relaxed">
                      {item.questionText}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 pt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-rose-700">உங்கள் பதில்:</div>
                          <div className="font-semibold">{item.answerOptions[item.selectedOptionIndex]}</div>
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

                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-slate-800">
                      <span className="font-bold text-blue-900 block mb-1">விளக்கம்:</span>
                      {item.explanation}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 sm:p-6 pt-0 flex items-center justify-between border-t border-slate-100 bg-slate-50/30">
                    <span className="text-xs text-muted-foreground">தோல்வி எண்ணிக்கை: {item.failureCount} முறை</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReference({
                        referencePage: item.referencePage!,
                        referencePageOffset: item.referencePageOffset || 0,
                        subjectName: item.chapterName,
                      })}
                      className="text-xs font-bold text-primary border-primary/30"
                    >
                      <BookOpen className="h-3.5 w-3.5 mr-1" />
                      பாடநூல் குறிப்பு
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. REVISION ENGINE VIEW */}
      {activeTab === 'revision' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>தவறு பெட்டகத்தில் உள்ள 2 சரிசெய்யப்படாத வினாக்கள் திருப்புதல் தேர்வுக்காக ஏற்றப்பட்டுள்ளன.</span>
          </div>

          <McqTest
            test={revisionTest}
            totalQuestions={revisionTest.questions.length}
            answeredQuestions={0}
            inProgressAttempt={null}
          />
        </div>
      )}

      {/* Textbook Reference Drawer */}
      {selectedReference && (
        <TextbookReferenceDrawer
          isOpen={Boolean(selectedReference)}
          onClose={() => setSelectedReference(null)}
          referencePage={selectedReference.referencePage}
          referencePageOffset={selectedReference.referencePageOffset}
          subjectName={selectedReference.subjectName}
          isAuthorized={true}
        />
      )}
    </div>
  );
}
