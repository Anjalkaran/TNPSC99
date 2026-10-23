import { HistoricalBackfillWindow, HistoricalPartition, CADraftQuestion, TNPSCCategory } from './types';

export const SIX_MONTH_BACKFILL_WINDOW: HistoricalBackfillWindow = {
  startDate: '2026-04-23',
  endDate: '2026-10-23',
  partitions: [
    {
      monthKey: '2026-05',
      name: 'April - May 2026',
      name_ta: 'ஏப்ரல் - மே 2026',
      periodStart: '2026-04-23',
      periodEnd: '2026-05-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-06',
      name: 'May - June 2026',
      name_ta: 'மே - ஜூன் 2026',
      periodStart: '2026-05-23',
      periodEnd: '2026-06-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-07',
      name: 'June - July 2026',
      name_ta: 'ஜூன் - ஜூலை 2026',
      periodStart: '2026-06-23',
      periodEnd: '2026-07-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-08',
      name: 'July - August 2026',
      name_ta: 'ஜூலை - ஆகஸ்ட் 2026',
      periodStart: '2026-07-23',
      periodEnd: '2026-08-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-09',
      name: 'August - September 2026',
      name_ta: 'ஆகஸ்ட் - செப்டம்பர் 2026',
      periodStart: '2026-08-23',
      periodEnd: '2026-09-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-10',
      name: 'September - October 2026',
      name_ta: 'செப்டம்பர் - அக்டோபர் 2026',
      periodStart: '2026-09-23',
      periodEnd: '2026-10-23',
      targetMCQCount: 85,
    },
  ],
};

/**
 * Determines which historical monthly partition a date belongs to.
 */
export function getPartitionForDate(
  dateStr: string,
  window: HistoricalBackfillWindow = SIX_MONTH_BACKFILL_WINDOW
): HistoricalPartition | null {
  for (const part of window.partitions) {
    if (dateStr >= part.periodStart && dateStr <= part.periodEnd) {
      return part;
    }
  }
  return null;
}

/**
 * Checks if a given event/document date is within the authorized backfill window,
 * strictly observing any exam cutoff date.
 */
export function isWithinBackfillWindow(
  dateStr: string,
  cutoffDate?: string,
  window: HistoricalBackfillWindow = SIX_MONTH_BACKFILL_WINDOW
): boolean {
  if (dateStr < window.startDate) return false;
  if (cutoffDate && dateStr > cutoffDate) return false;
  if (dateStr > window.endDate) return false;
  return true;
}

/**
 * Calculates current quota coverage across the 6-month partitions.
 */
export function calculateBackfillCoverage(
  questions: CADraftQuestion[],
  window: HistoricalBackfillWindow = SIX_MONTH_BACKFILL_WINDOW
): {
  totalTarget: number;
  totalApproved: number;
  overallCoveragePercentage: number;
  partitionCoverage: {
    monthKey: string;
    target: number;
    approved: number;
    coveragePercentage: number;
  }[];
} {
  const approved = questions.filter(
    (q) => q.overallStatus === 'editor_approved' || q.overallStatus === 'auto_verified'
  );

  const partitionCoverage = window.partitions.map((part) => {
    const count = approved.filter((q) => q.monthKey === part.monthKey).length;
    return {
      monthKey: part.monthKey,
      target: part.targetMCQCount,
      approved: count,
      coveragePercentage: Math.min(100, Math.round((count / part.targetMCQCount) * 100)),
    };
  });

  const totalTarget = window.partitions.reduce((acc, p) => acc + p.targetMCQCount, 0);
  const totalApproved = partitionCoverage.reduce((acc, p) => acc + p.approved, 0);
  const overallCoveragePercentage = Math.min(100, Math.round((totalApproved / totalTarget) * 100));

  return {
    totalTarget,
    totalApproved,
    overallCoveragePercentage,
    partitionCoverage,
  };
}
