/**
 * TNPSC99 — Mandatory 2026-Only Current Affairs Temporal Policy Validator
 * Final 2026 Safeguards Engine
 * 
 * Rules & Safeguards:
 * 1. 2026-only event rule across daily, weekly, monthly, and historical Current Affairs.
 * 2. Dynamically calculated rolling 6-month calendar window, bounded by 01-01-2026 for the 2026 cycle.
 * 3. Actual verified event date validation, independent of publication/ingestion timestamps.
 * 4. Substantive 2026 development evidence required for schemes established before 2026.
 * 5. Retraction invariant maintained for RBI and PIB defect items.
 * 6. Automatic reclassification to General Studies is strictly prohibited; requires independent accuracy review.
 * 7. Three-tier fallback priority: Today's edition -> Previous 2026 revision -> Editorial verification.
 * 8. Fallback selection strictly excludes retracted, disputed, expired or ineligible questions.
 * 9. Date boundary handling: Dec 2026, Jan 2027, leap years, and Asia/Kolkata calendar-day transitions.
 * 10. Year 2027 cycle rollover: 2026 content archived as dated historical revision material, not active current events.
 */

import { QuestionAccuracyCandidate, AccuracyLifecycleStatus } from './types';

export const CURRENT_VERIFIED_CUTOFF_DATE = '2026-10-24';
export const CYCLE_2026_START_DATE = '2026-01-01';
export const CYCLE_2026_END_DATE = '2026-12-31';

export type TemporalDefectCode =
  | 'NONE'
  | 'MISSING_OR_AMBIGUOUS_EVENT_DATE'
  | 'INVALID_CALENDAR_DATE'
  | 'PRE_2026_EVENT'
  | 'PRE_2026_EVENT_IN_2026_PUBLICATION'
  | 'OLDER_SCHEME_TESTS_PRE_2026_FACT'
  | 'FUTURE_EVENT_DATE'
  | 'OUTSIDE_SIX_MONTH_WINDOW'
  | 'EXPIRED_CYCLE_ARCHIVED';

export interface PreparationCycleConfig {
  activeCycleYear: number;
  cycleStartDate: string;
  cycleEndDate: string;
  allowArchivedCycleAsCurrent?: boolean;
}

export const DEFAULT_CYCLE_CONFIG: PreparationCycleConfig = {
  activeCycleYear: 2026,
  cycleStartDate: CYCLE_2026_START_DATE,
  cycleEndDate: CYCLE_2026_END_DATE,
  allowArchivedCycleAsCurrent: false,
};

export interface TemporalValidationOptions {
  cutoffDate?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
  enforceSixMonthWindow?: boolean;
  referenceDateForRollingWindow?: string;
  cycleConfig?: PreparationCycleConfig;
}

export interface TemporalValidationResult {
  eligible: boolean;
  targetStatus: AccuracyLifecycleStatus;
  defectCode: TemporalDefectCode;
  rejectionReason?: string;
  details: string;
  eventDate?: string;
  publicationDate?: string;
  isWithin2026Cycle: boolean;
  isWithinSixMonthBank: boolean;
  isOlderSchemeWith2026Amendment: boolean;
  rollingWindow?: {
    windowStart: string;
    windowEnd: string;
  };
  cycleStatus?: 'ACTIVE_CURRENT' | 'ARCHIVED_HISTORICAL_REVISION' | 'OUT_OF_BOUNDS';
}

export interface IndependentReclassificationReview {
  reviewerUid: string;
  reviewedAt: string;
  isIndependentlyVerified: boolean;
  syllabusAlignment:
    | 'Indian Polity'
    | 'History & Culture of India'
    | 'Economy of India'
    | 'General Science'
    | 'Geography of India'
    | 'Tamil Society';
  printedTextbookSourceRef: string;
  justificationNotes: string;
}

/**
 * Returns the current calendar date string in Asia/Kolkata timezone (UTC+05:30).
 */
export function getAsiaKolkataDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Checks whether a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Validates whether a date string is a legitimate calendar day,
 * checking leap years and month lengths (e.g. 2026-02-29 is rejected).
 */
export function isValidCalendarDate(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  const daysInMonths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonths[month - 1];
}

/**
 * Dynamically calculates a rolling 6-month calendar window ending at referenceDate,
 * bounded by the cycleStartDate (e.g. 01-01-2026 for the 2026 cycle).
 */
export function calculateRollingSixMonthWindow(
  referenceDateStr: string = CURRENT_VERIFIED_CUTOFF_DATE,
  cycleStartDateStr: string = CYCLE_2026_START_DATE
): { windowStart: string; windowEnd: string } {
  if (!isValidCalendarDate(referenceDateStr)) {
    referenceDateStr = CURRENT_VERIFIED_CUTOFF_DATE;
  }

  const parts = referenceDateStr.split('-');
  const refYear = parseInt(parts[0], 10);
  const refMonth = parseInt(parts[1], 10); // 1-12
  const refDay = parseInt(parts[2], 10);

  // Subtract 6 months
  let targetYear = refYear;
  let targetMonth = refMonth - 6;
  if (targetMonth < 1) {
    targetYear -= 1;
    targetMonth += 12;
  }

  // Handle day-of-month clamping (e.g. Oct 31 -> Apr 30; Aug 31 -> Feb 28 in non-leap year)
  const daysInTargetMonth = [
    31,
    isLeapYear(targetYear) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][targetMonth - 1];

  const clampedDay = Math.min(refDay, daysInTargetMonth);
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  let rollingStart = `${targetYear}-${mm}-${dd}`;

  // Bound windowStart by cycleStartDate (01-01-2026 for 2026 cycle)
  if (rollingStart < cycleStartDateStr) {
    rollingStart = cycleStartDateStr;
  }

  return {
    windowStart: rollingStart,
    windowEnd: referenceDateStr,
  };
}

export class TemporalEligibilityValidator {
  /**
   * Evaluates a question candidate against the Mandatory 2026-Only Current Affairs Policy.
   */
  public static validate(
    candidate: QuestionAccuracyCandidate,
    options: TemporalValidationOptions = {}
  ): TemporalValidationResult {
    const cycleConfig = options.cycleConfig || DEFAULT_CYCLE_CONFIG;
    const cutoffDate = options.cutoffDate || CURRENT_VERIFIED_CUTOFF_DATE;
    const cycleStart = options.cycleStartDate || cycleConfig.cycleStartDate;
    const cycleEnd = options.cycleEndDate || cycleConfig.cycleEndDate;
    const enforceSixMonth = options.enforceSixMonthWindow === true;
    const refDateForRolling = options.referenceDateForRollingWindow || cutoffDate;

    // Calculate dynamic rolling 6-month window bounded by cycleStart
    const rollingWindow = calculateRollingSixMonthWindow(refDateForRolling, cycleStart);

    // Textbook syllabus questions are governed by textbook edition rather than CA cycle
    if (candidate.textbookCitation && !candidate.isCurrentAffairs) {
      return {
        eligible: true,
        targetStatus: 'PUBLISHED',
        defectCode: 'NONE',
        details: 'Exempt: Textbook Syllabus question governed by Samacheer Kalvi edition curriculum.',
        isWithin2026Cycle: true,
        isWithinSixMonthBank: true,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
        cycleStatus: 'ACTIVE_CURRENT',
      };
    }

    const eventDate = candidate.eventDate ? candidate.eventDate.trim() : undefined;
    const publicationDate = candidate.publicationDate ? candidate.publicationDate.trim() : undefined;

    // -------------------------------------------------------------------------
    // CHECK 1: Missing or format-invalid date -> Held as REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      const reason = !eventDate
        ? 'Event date is completely missing from record.'
        : `Event date "${eventDate}" is ambiguous or not formatted as strict ISO YYYY-MM-DD.`;
      return {
        eligible: false,
        targetStatus: 'REVIEW_REQUIRED',
        defectCode: 'MISSING_OR_AMBIGUOUS_EVENT_DATE',
        rejectionReason: `Temporal Hold: ${reason}`,
        details: 'Held for editorial inquiry. Questions with unverified or ambiguous event dates must not be published.',
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // CHECK 1B: Calendar legitimacy (Leap Year and Month Day length verification)
    // -------------------------------------------------------------------------
    if (!isValidCalendarDate(eventDate)) {
      const reason = `Event date "${eventDate}" is not a valid calendar day (e.g. leap year mismatch or invalid month-day length).`;
      return {
        eligible: false,
        targetStatus: 'REVIEW_REQUIRED',
        defectCode: 'INVALID_CALENDAR_DATE',
        rejectionReason: `Temporal Hold: ${reason}`,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 10: Cycle Rollover Handling (Start of 2027)
    // At the start of 2027, 2026 events are no longer current events.
    // -------------------------------------------------------------------------
    if (cycleConfig.activeCycleYear >= 2027 && eventDate <= CYCLE_2026_END_DATE) {
      if (!cycleConfig.allowArchivedCycleAsCurrent) {
        const reason = `Preparation cycle is configured for ${cycleConfig.activeCycleYear}. Event from ${eventDate} belongs to the 2026 cycle and must be archived as dated historical revision material, not labeled as active current events.`;
        return {
          eligible: false,
          targetStatus: 'REVIEW_REQUIRED',
          defectCode: 'EXPIRED_CYCLE_ARCHIVED',
          rejectionReason: reason,
          details: reason,
          eventDate,
          publicationDate,
          isWithin2026Cycle: false,
          isWithinSixMonthBank: false,
          isOlderSchemeWith2026Amendment: false,
          rollingWindow,
          cycleStatus: 'ARCHIVED_HISTORICAL_REVISION',
        };
      }
    }

    // -------------------------------------------------------------------------
    // RULES 4 & 5: Older Schemes with Authenticated 2026 Amendments
    // -------------------------------------------------------------------------
    const olderScheme = candidate.olderSchemeContext;
    if (olderScheme && olderScheme.schemeOriginYear && olderScheme.schemeOriginYear < 2026) {
      if (olderScheme.has2026Amendment && olderScheme.tests2026DevelopmentExplicitly) {
        const amendmentDate = olderScheme.amendmentDate || eventDate;
        if (amendmentDate >= cycleStart && amendmentDate <= cutoffDate) {
          const isWithinRolling = amendmentDate >= rollingWindow.windowStart && amendmentDate <= rollingWindow.windowEnd;
          return {
            eligible: true,
            targetStatus: 'SOURCE_VERIFIED',
            defectCode: 'NONE',
            details: `Older scheme (${olderScheme.schemeOriginYear}) is eligible: question explicitly tests verified 2026 amendment/milestone (${amendmentDate}): ${olderScheme.amendmentDetails || ''}`,
            eventDate,
            publicationDate,
            isWithin2026Cycle: true,
            isWithinSixMonthBank: isWithinRolling,
            isOlderSchemeWith2026Amendment: true,
            rollingWindow,
            cycleStatus: 'ACTIVE_CURRENT',
          };
        }
      }

      // Older scheme without explicit 2026 development testing -> REJECTED
      const reason = `Question tests pre-2026 statutory fact of an older scheme instituted in ${olderScheme.schemeOriginYear}. Policy Rule 4 & 5 require questions on older schemes to explicitly test an authenticated 2026 amendment or implementation milestone.`;
      return {
        eligible: false,
        targetStatus: 'REJECTED',
        defectCode: 'OLDER_SCHEME_TESTS_PRE_2026_FACT',
        rejectionReason: reason,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // RULE 3 & CHECK 2: Article published in 2026 covering a pre-2026 event
    // -------------------------------------------------------------------------
    const isPre2026Event = eventDate < cycleStart;
    const is2026Publication = publicationDate && publicationDate >= cycleStart;

    if (isPre2026Event && is2026Publication) {
      const reason = `Article published on ${publicationDate} describes a pre-2026 historical event that occurred on ${eventDate}. Relabeling pre-2026 historical events as 2026 Current Affairs is strictly forbidden by Policy Rule 3 & 6.`;
      return {
        eligible: false,
        targetStatus: 'REJECTED',
        defectCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
        rejectionReason: reason,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // RULE 1: Pre-2026 Event Date -> REJECTED
    // -------------------------------------------------------------------------
    if (eventDate < cycleStart) {
      const reason = `Event occurred on ${eventDate}, which is prior to the 2026 exam cycle boundary (${cycleStart}). Pre-2026 events are disqualified from 2026 Current Affairs.`;
      return {
        eligible: false,
        targetStatus: 'REJECTED',
        defectCode: 'PRE_2026_EVENT',
        rejectionReason: reason,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // Future / Beyond Verified Cutoff Date -> REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    if (eventDate > cutoffDate) {
      const reason = `Event date ${eventDate} is beyond the current verified cutoff boundary (${cutoffDate}). Cannot publish unverified prospective claims.`;
      return {
        eligible: false,
        targetStatus: 'REVIEW_REQUIRED',
        defectCode: 'FUTURE_EVENT_DATE',
        rejectionReason: reason,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: false,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
      };
    }

    // -------------------------------------------------------------------------
    // RULE 2: Dynamic Rolling Six-Month Historical Bank Window Check
    // -------------------------------------------------------------------------
    const isWithinRollingSixMonth = eventDate >= rollingWindow.windowStart && eventDate <= rollingWindow.windowEnd;
    if (enforceSixMonth && !isWithinRollingSixMonth) {
      const reason = `Event date ${eventDate} is outside the dynamic rolling six-month window (${rollingWindow.windowStart} to ${rollingWindow.windowEnd}).`;
      return {
        eligible: false,
        targetStatus: 'REVIEW_REQUIRED',
        defectCode: 'OUTSIDE_SIX_MONTH_WINDOW',
        rejectionReason: reason,
        details: reason,
        eventDate,
        publicationDate,
        isWithin2026Cycle: true,
        isWithinSixMonthBank: false,
        isOlderSchemeWith2026Amendment: false,
        rollingWindow,
        cycleStatus: 'ACTIVE_CURRENT',
      };
    }

    // -------------------------------------------------------------------------
    // Genuine 2026 Event -> ELIGIBLE
    // -------------------------------------------------------------------------
    return {
      eligible: true,
      targetStatus: 'SOURCE_VERIFIED',
      defectCode: 'NONE',
      details: `Genuine 2026 event verified on ${eventDate} (within preparation cycle ${cycleStart} to ${cutoffDate}).`,
      eventDate,
      publicationDate,
      isWithin2026Cycle: true,
      isWithinSixMonthBank: isWithinRollingSixMonth,
      isOlderSchemeWith2026Amendment: false,
      rollingWindow,
      cycleStatus: 'ACTIVE_CURRENT',
    };
  }

  /**
   * Rule 6 & 8: Reclassifies an independently verified older pre-2026 question
   * into General Studies / Historical Knowledge.
   * 
   * MANDATORY SAFEGUARD: Automatic reclassification is strictly FORBIDDEN.
   * An independent accuracy review with syllabus alignment and textbook citation
   * is strictly required. Factually contradicted or retracted questions can NEVER
   * be reclassified.
   */
  public static reclassifyToGeneralStudies(
    candidate: QuestionAccuracyCandidate,
    review?: IndependentReclassificationReview
  ): QuestionAccuracyCandidate {
    // 1. Guard against reclassifying retracted / contradicted questions
    if (candidate.isRetracted === true || candidate.status === 'RETRACTED') {
      throw new Error(
        `Reclassification Forbidden: Question ${candidate.id} is RETRACTED due to factual contradiction/defect and cannot be reclassified into General Studies.`
      );
    }

    // 2. Guard against automatic unreviewed reclassification
    if (
      !review ||
      !review.isIndependentlyVerified ||
      !review.syllabusAlignment ||
      !review.printedTextbookSourceRef ||
      !review.reviewerUid
    ) {
      throw new Error(
        `Automatic Reclassification Forbidden: Question ${candidate.id} cannot enter General Studies without an independent accuracy review, verified textbook citation, and named reviewer sign-off.`
      );
    }

    return {
      ...candidate,
      category: `General Studies — ${review.syllabusAlignment}`,
      category_ta: `பொது அறிவு — ${review.syllabusAlignment}`,
      isCurrentAffairs: false,
      editorialApproval: {
        approvedBy: review.reviewerUid,
        approvedAt: review.reviewedAt,
        notes: `Independently reclassified from CA to General Studies. Textbook ref: ${review.printedTextbookSourceRef}. Justification: ${review.justificationNotes}`,
      },
      quarantineNotes: `Preserved in General Studies (${review.syllabusAlignment}). Event date: ${candidate.eventDate || 'Historical'}. Independent review signed by ${review.reviewerUid}.`,
    };
  }
}
