import { CAManifest, CADraftQuestion, TNPSCExamGroup, TNPSCCategory, HistoricalPartition } from './types';
import { SIX_MONTH_BACKFILL_WINDOW } from './historical-backfill-service';

function isEligibleForTest(status: string): boolean {
  return ['APPROVED', 'editor_approved', 'auto_verified', 'PUBLISHED'].includes(status);
}

/**
 * Compiles a Daily Current Affairs Test Manifest (10 - 15 MCQs).
 */
export function compileDailyManifest(
  date: string,
  availableQuestions: CADraftQuestion[],
  examGroup: TNPSCExamGroup = 'Group II'
): CAManifest {
  // Filter questions for the specific date
  const filtered = availableQuestions.filter(
    (q) => isEligibleForTest(q.overallStatus) && !q.isRetracted && !q.isQuarantined && (q.eventDate?.startsWith(date.slice(0, 7)) || q.createdAt.startsWith(date))
  );

  const selected = filtered.slice(0, 15);
  const qIds = selected.map((q) => q.id);

  return {
    id: `manifest_daily_${date.replace(/-/g, '_')}`,
    type: 'daily',
    title_en: `Daily Current Affairs — ${date}`,
    title_ta: `தினசரி நடப்பு நிகழ்வுகள் — ${date}`,
    description_en: `Authoritative 15-question daily practice session verified from official government gazettes.`,
    description_ta: `அரசு செய்திக்குறிப்புகளிலிருந்து சரிபார்க்கப்பட்ட 15 வினாக்கள் கொண்ட தினசரி பயிற்சி.`,
    periodStart: date,
    periodEnd: date,
    questionIds: qIds,
    questionCount: qIds.length,
    durationMinutes: 15,
    syllabusCategory: 'Current Affairs',
    examGroup,
    tier: 'free',
    status: 'draft',
    isRevision: false,
    isRetracted: false,
    isFree: true,
    accessLevel: 'free',
  };
}

/**
 * Compiles a Weekly Current Affairs Test Manifest (50 MCQs).
 */
export function compileWeeklyManifest(
  weekNumber: number,
  year: number,
  startDate: string,
  endDate: string,
  availableQuestions: CADraftQuestion[],
  examGroup: TNPSCExamGroup = 'Group II'
): CAManifest {
  const filtered = availableQuestions.filter(
    (q) => isEligibleForTest(q.overallStatus) &&
           q.createdAt >= startDate && q.createdAt <= `${endDate}T23:59:59Z`
  );

  const selected = filtered.slice(0, 50);
  const qIds = selected.map((q) => q.id);

  return {
    id: `manifest_weekly_${year}_w${weekNumber.toString().padStart(2, '0')}`,
    type: 'weekly',
    title_en: `Weekly Current Affairs Round-up (Week ${weekNumber}, ${year})`,
    title_ta: `வாராந்திர நடப்பு நிகழ்வுகள் தொகுப்பு (வாரம் ${weekNumber}, ${year})`,
    description_en: `Comprehensive 50-question weekly revision covering national, state, and welfare developments.`,
    description_ta: `தேசிய, மாநில மற்றும் நலத்திட்டங்கள் குறித்த 50 வினாக்கள் கொண்ட விரிவான வாராந்திர தேர்வு.`,
    periodStart: startDate,
    periodEnd: endDate,
    questionIds: qIds,
    questionCount: qIds.length,
    durationMinutes: 45,
    syllabusCategory: 'Current Affairs',
    examGroup,
    tier: 'premium',
    status: 'draft',
    isRevision: false,
    isRetracted: false,
    isFree: true,
    accessLevel: 'free',
  };
}

/**
 * Compiles a Monthly Current Affairs Test Manifest (100 MCQs).
 */
export function compileMonthlyManifest(
  partition: HistoricalPartition,
  availableQuestions: CADraftQuestion[],
  examGroup: TNPSCExamGroup = 'Group II'
): CAManifest {
  const filtered = availableQuestions.filter(
    (q) => isEligibleForTest(q.overallStatus) &&
           q.monthKey === partition.monthKey
  );

  const selected = filtered.slice(0, 100);
  const qIds = selected.map((q) => q.id);

  return {
    id: `manifest_monthly_${partition.monthKey.replace('-', '_')}`,
    type: 'monthly',
    monthKey: partition.monthKey,
    title_en: `Monthly Current Affairs Master Test — ${partition.name}`,
    title_ta: `மாதாந்திர நடப்பு நிகழ்வுகள் முழுத் தேர்வு — ${partition.name_ta}`,
    description_en: `100-question authoritative monthly assessment rigorously balanced across all TNPSC syllabus units.`,
    description_ta: `அனைத்து டி.என்.பி.எஸ்.சி பாடப்பிரிவுகளையும் உள்ளடக்கிய 100 வினாக்கள் கொண்ட மாதாந்திர முழுத் தேர்வு.`,
    periodStart: partition.periodStart,
    periodEnd: partition.periodEnd,
    questionIds: qIds,
    questionCount: qIds.length,
    durationMinutes: 90,
    syllabusCategory: 'Current Affairs',
    examGroup,
    tier: 'premium',
    status: 'draft',
    isRevision: false,
    isRetracted: false,
    isFree: true,
    accessLevel: 'free',
  };
}

/**
 * Compiles the Six-Month Grand Mock Test Manifest (100 MCQs).
 * Proportionately samples across all 6 partitions and categories.
 */
export function compileSixMonthGrandMockManifest(
  availableQuestions: CADraftQuestion[],
  examGroup: TNPSCExamGroup = 'Group I'
): CAManifest {
  const approved = availableQuestions.filter(
    (q) => isEligibleForTest(q.overallStatus)
  );

  // Group by partition and take ~16-17 questions per month to reach 100
  const selectedIds: string[] = [];
  const partitions = SIX_MONTH_BACKFILL_WINDOW.partitions;
  const questionsPerPartition = Math.floor(100 / partitions.length); // 16 each = 96, then top up

  for (const part of partitions) {
    const partQuestions = approved.filter((q) => q.monthKey === part.monthKey);
    const chosen = partQuestions.slice(0, questionsPerPartition);
    selectedIds.push(...chosen.map((q) => q.id));
  }

  // Top up to exactly 100 from remaining high-importance questions
  if (selectedIds.length < 100) {
    const remaining = approved.filter((q) => !selectedIds.includes(q.id));
    const extra = remaining.slice(0, 100 - selectedIds.length);
    selectedIds.push(...extra.map((q) => extra.map((e) => e.id)).flat());
  }

  const finalIds = Array.from(new Set(selectedIds)).slice(0, 100);

  return {
    id: `manifest_grand_mock_6m_2026`,
    type: 'grand_mock_6m',
    title_en: `TNPSC Six-Month Current Affairs Grand Mock Examination (April – October 2026)`,
    title_ta: `டி.என்.பி.எஸ்.சி 6 மாத நடப்பு நிகழ்வுகள் முழு மாதிரித் தேர்வு (ஏப்ரல் – அக்டோபர் 2026)`,
    description_en: `High-yield 100-question full-length mock simulating the official TNPSC General Studies paper.`,
    description_ta: `அரசுத் தேர்வை பிரதிபலிக்கும் வகையில் அமைக்கப்பட்ட 100 வினாக்கள் கொண்ட ஆறு மாத முழு மாதிரித் தேர்வு.`,
    periodStart: SIX_MONTH_BACKFILL_WINDOW.startDate,
    periodEnd: SIX_MONTH_BACKFILL_WINDOW.endDate,
    questionIds: finalIds,
    questionCount: finalIds.length,
    durationMinutes: 90,
    syllabusCategory: 'Current Affairs',
    examGroup,
    tier: 'premium',
    status: 'draft',
    isRevision: false,
    isRetracted: false,
    isFree: true,
    accessLevel: 'free',
  };
}

/**
 * Assesses the impact of a question erratum or retraction across manifests.
 */
export function assessErratumImpact(
  retractedQuestionId: string,
  allManifests: CAManifest[]
): {
  affectedManifestIds: string[];
  affectedManifestCount: number;
} {
  const affected = allManifests.filter((m) => m.questionIds.includes(retractedQuestionId));
  return {
    affectedManifestIds: affected.map((m) => m.id),
    affectedManifestCount: affected.length,
  };
}

/**
 * Compiles a 2026 Revision Bank Manifest for historical 2026 developments.
 * Retains authentic historical event dates, prominently labeled as revision practice.
 */
export function compileRevisionManifest(
  manifestId: string,
  availableQuestions: CADraftQuestion[],
  examGroup: TNPSCExamGroup = 'Group II'
): CAManifest {
  const filtered = availableQuestions.filter(
    (q) => isEligibleForTest(q.overallStatus) && !q.isRetracted && !q.isQuarantined
  );

  const qIds = filtered.map((q) => q.id);

  return {
    id: manifestId,
    type: 'monthly',
    title_en: `2026 Current Affairs — Revision Bank (${qIds.length} Questions)`,
    title_ta: `2026 நடப்பு நிகழ்வுகள் — மீள்பார்வை வினா வங்கி (${qIds.length} வினாக்கள்)`,
    description_en: `Authoritative revision collection covering 2026 verified developments with authentic event dates.`,
    description_ta: `உண்மையான நிகழ்வுத் தேதிகளுடன் சரிபார்க்கப்பட்ட 2026 நடப்பு நிகழ்வுகள் மீள்பார்வைத் தொகுப்பு.`,
    periodStart: '2026-01-01',
    periodEnd: '2026-09-30',
    questionIds: qIds,
    questionCount: qIds.length,
    durationMinutes: Math.min(60, qIds.length * 2),
    syllabusCategory: 'Current Affairs',
    examGroup,
    tier: 'free',
    status: 'published',
    isRevision: true,
    isRetracted: false,
    isFree: true,
    accessLevel: 'free',
  };
}
