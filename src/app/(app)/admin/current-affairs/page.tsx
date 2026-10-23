'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Clock, RefreshCw, ExternalLink, BookOpen, Layers } from 'lucide-react';

interface MockDraftItem {
  id: string;
  eventDate: string;
  category: string;
  question_en: string;
  question_ta: string;
  options: { en: string; ta: string }[];
  correctOptionIndex: number;
  explanation_en: string;
  explanation_ta: string;
  sourceUrl: string;
  sourcePublisher: string;
  verificationScore: number;
  status: 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';
}

const INITIAL_MOCK_QUEUE: MockDraftItem[] = [
  {
    id: 'ca26_0b71ff519391',
    eventDate: '2026-04-27',
    category: 'International Relations',
    question_en: 'India signed a Free Trade Agreement on 27 April 2026 with which country?',
    question_ta: '2026 ஏப்ரல் 27 அன்று இந்தியா எந்த நாட்டுடன் தடையற்ற வர்த்தக ஒப்பந்தத்தில் கையெழுத்திட்டது?',
    options: [
      { en: 'New Zealand', ta: 'நியூசிலாந்து' },
      { en: 'Australia', ta: 'ஆஸ்திரேலியா' },
      { en: 'Japan', ta: 'ஜப்பான்' },
      { en: 'Canada', ta: 'கனடா' },
    ],
    correctOptionIndex: 0,
    explanation_en: 'A PIB release dated 27 April 2026 records the India–New Zealand FTA signing.',
    explanation_ta: '2026 ஏப்ரல் 27 அன்று இந்தியா–நியூசிலாந்து தடையற்ற வர்த்தக ஒப்பந்தம் கையெழுத்தானதாக PIB அறிவித்தது.',
    sourceUrl: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2255963&lang=1&reg=3',
    sourcePublisher: 'Press Information Bureau, Government of India',
    verificationScore: 92,
    status: 'REVIEW_REQUIRED',
  },
  {
    id: 'ca26_8c149eb0f3a4',
    eventDate: '2026-06-15',
    category: 'Tamil Nadu & Welfare',
    question_en: 'Under the expanded Kalaignar Magalir Urimai Thittam, how many additional beneficiaries were enrolled?',
    question_ta: 'விரிவாக்கப்பட்ட கலைஞர் மகளிர் உரிமைத் திட்டத்தின் கீழ் எத்தனை கூடுதல் பயனாளிகள் சேர்க்கப்பட்டுள்ளனர்?',
    options: [
      { en: '1.5 Lakhs', ta: '1.5 லட்சம்' },
      { en: '2.0 Lakhs', ta: '2.0 லட்சம்' },
      { en: '5.0 Lakhs', ta: '5.0 லட்சம்' },
      { en: '10.0 Lakhs', ta: '10.0 லட்சம்' },
    ],
    correctOptionIndex: 0,
    explanation_en: 'TN DIPR release confirmed 1.5 lakh additional women enrolled in June 2026.',
    explanation_ta: '2026 ஜூன் மாத செய்திக்குறிப்பில் 1.5 லட்சம் கூடுதல் மகளிர் சேர்க்கப்பட்டது உறுதிசெய்யப்பட்டது.',
    sourceUrl: 'https://www.tn.gov.in/pressrelease',
    sourcePublisher: 'Tamil Nadu DIPR',
    verificationScore: 98,
    status: 'REVIEW_REQUIRED',
  },
];

export default function CurrentAffairsAdminPage() {
  const [queue, setQueue] = useState<MockDraftItem[]>(INITIAL_MOCK_QUEUE);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [retractId, setRetractId] = useState('');
  const [retractNotice, setRetractNotice] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'APPROVED' } : item))
    );
  };

  const handleReject = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'REJECTED' } : item))
    );
  };

  const handleRetract = () => {
    if (!retractId) return;
    setRetractNotice(
      `Retraction initiated for ${retractId}. 2 published manifests identified. Student attempts queued for score adjustment without result deletion.`
    );
    setRetractId('');
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            Current Affairs Intelligence & Editorial Desk
          </h1>
          <p className="text-muted-foreground mt-1">
            Unattended Daily Ingestion, Verification Gate & Editorial Governance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={autoPublishEnabled ? 'default' : 'secondary'} className="px-3 py-1 text-sm font-semibold">
            Auto-Publish: {autoPublishEnabled ? 'ENABLED (Low-Risk Only)' : 'DISABLED (Strict Editorial Gate)'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoPublishEnabled(!autoPublishEnabled)}
            className="border-dashed"
          >
            Toggle Policy
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Review Queue</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-500 flex items-center justify-between">
              {queue.filter((q) => q.status === 'REVIEW_REQUIRED').length}
              <Clock className="h-5 w-5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Awaiting human editorial verification
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved & Staged</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-500 flex items-center justify-between">
              {queue.filter((q) => q.status === 'APPROVED').length + 21}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Ready for manifest compilation
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Schedule Status</CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-500 flex items-center justify-between">
              HEALTHY
              <RefreshCw className="h-5 w-5 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Next run: 05:00 IST (Source Ingestion)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today's AI Spend</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-between">
              ₹3.85
              <span className="text-xs font-normal text-muted-foreground">Cap: ₹84/day</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            ~4.5% of daily safety quota consumed
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="manifests">Test Manifests</TabsTrigger>
          <TabsTrigger value="retraction">Erratum & Retraction</TabsTrigger>
        </TabsList>

        {/* Review Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Pending Draft MCQs</h2>
            <span className="text-sm text-muted-foreground">
              Grounding, ambiguity, and bilingual parity pre-screened by independent verification engine.
            </span>
          </div>

          {queue.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.id}</Badge>
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge variant="outline">Event: {item.eventDate}</Badge>
                    <Badge className="bg-emerald-600">Verification: {item.verificationScore}%</Badge>
                  </div>
                  <Badge variant={item.status === 'APPROVED' ? 'default' : item.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Bilingual Question Presentation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">English Question</span>
                    <p className="font-medium text-foreground mt-1">{item.question_en}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">தமிழ் வினா</span>
                    <p className="font-medium text-foreground mt-1">{item.question_ta}</p>
                  </div>
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {item.options.map((opt, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-md text-sm border flex items-start justify-between ${
                        idx === item.correctOptionIndex
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-semibold'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <span>
                        <strong className="mr-2">{String.fromCharCode(65 + idx)}.</strong>
                        {opt.en} / {opt.ta}
                      </span>
                      {idx === item.correctOptionIndex && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Source Provenance Citation */}
                <div className="bg-muted/20 p-3 rounded-md text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-foreground">Official Citation: </span>
                    <span className="text-muted-foreground">{item.sourcePublisher}</span>
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    View Primary Government Source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Editorial Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(item.id)}
                    disabled={item.status === 'REJECTED'}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject Draft
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(item.id)}
                    disabled={item.status === 'APPROVED'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve for Manifest
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Test Manifests Tab */}
        <TabsContent value="manifests" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Current Affairs Test</CardTitle>
                <CardDescription>10-15 Questions • Free Tier (7 Days)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Automated release assembled at 08:00 IST every morning from eligible approved drafts.
                </p>
                <Button className="w-full" size="sm">Compile Today's Test</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sunday Weekly Round-up</CardTitle>
                <CardDescription>50 Questions • ₹99 Premium Tier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Consolidated 50-question timed exam assembled from canonical approved IDs.
                </p>
                <Button variant="secondary" className="w-full" size="sm">View Current Week Manifest</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Six-Month Grand Mock</CardTitle>
                <CardDescription>100 Questions • April–October 2026</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Proportionately sampled across all 6 partitions and 9 TNPSC syllabus domains.
                </p>
                <Button variant="outline" className="w-full" size="sm">Inspect Grand Mock (100 Qs)</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Retraction Tab */}
        <TabsContent value="retraction" className="space-y-4">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Non-Destructive Question Erratum & Retraction
              </CardTitle>
              <CardDescription>
                Corrects officially revised keys or retracts defective questions. Completed student attempts are updated with full bonus marks without silent record deletion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Question ID (e.g., ca26_0b71ff519391)"
                  value={retractId}
                  onChange={(e) => setRetractId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                />
                <Button variant="destructive" onClick={handleRetract} disabled={!retractId}>
                  Execute Erratum
                </Button>
              </div>

              {retractNotice && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{retractNotice}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
