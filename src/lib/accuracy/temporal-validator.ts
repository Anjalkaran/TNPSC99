/**
 * TNPSC99 — Mandatory 2026-Only Current Affairs Temporal Policy Validator
 * 
 * Rules:
 * 1. For current cycle: genuine events occurring 01-01-2026 to verified cutoff date.
 * 2. For 6-month historical bank: window 23-04-2026 to 23-10-2026 (extending forward).
 * 3. Validate actual event date independently from publication date, ingestion date, last-modified.
 * 4. Older schemes eligible only where genuine new 2026 expansion, amendment, or allocation milestone is authenticated.
 * 5. Questions must explicitly test that 2026 development, not merely a pre-2026 historical fact.
 * 6. Never relabel older questions as 2026 by changing their metadata.
 * 7. Never use pre-2026 current-affairs questions as fallback fillers.
 * 8. Preserve older questions separately in General Studies / Historical Knowledge only when appropriate.
 */

import { QuestionAccuracyCandidate, AccuracyLifecycleStatus } from './types';

export const CURRENT_VERIFIED_CUTOFF_DATE = '2026-10-24';
export const CYCLE_2026_START_DATE = '2026-01-01';
export const SIX_MONTH_BANK_START_DATE = '2026-04-23';

export type TemporalDefectCode =
  | 'NONE'
  | 'MISSING_OR_AMBIGUOUS_EVENT_DATE'
  | 'PRE_2026_EVENT'
  | 'PRE_2026_EVENT_IN_2026_PUBLICATION'
  | 'OLDER_SCHEME_TESTS_PRE_2026_FACT'
  | 'FUTURE_EVENT_DATE'
  | 'OUTSIDE_SIX_MONTH_WINDOW';

export interface TemporalValidationOptions {
  cutoffDate?: string;
  cycleStartDate?: string;
  sixMonthWindowStart?: string;
  enforceSixMonthWindow?: boolean;
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
}

/**
 * Validates ISO date format YYYY-MM-DD.
 * Rejects ambiguous representations such as "early 2026", "2026-??", "circa 2026".
 */
function isValidIsoDate(dateStr?: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = new Date(trimmed);
  return !isNaN(parsed.getTime());
}

export class TemporalEligibilityValidator {
  /**
   * Evaluates a question candidate against the Mandatory 2026-Only Current Affairs Policy.
   */
  public static validate(
    candidate: QuestionAccuracyCandidate,
    options: TemporalValidationOptions = {}
  ): TemporalValidationResult {
    const cutoffDate = options.cutoffDate || CURRENT_VERIFIED_CUTOFF_DATE;
    const cycleStart = options.cycleStartDate || CYCLE_2026_START_DATE;
    const sixMonthStart = options.sixMonthWindowStart || SIX_MONTH_BANK_START_DATE;
    const enforceSixMonth = options.enforceSixMonthWindow === true;

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
      };
    }

    const eventDate = candidate.eventDate ? candidate.eventDate.trim() : undefined;
    const publicationDate = candidate.publicationDate ? candidate.publicationDate.trim() : undefined;

    // -------------------------------------------------------------------------
    // RULE 3 & CHECK 1: Missing or ambiguous event date -> Held as REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    if (!eventDate || !isValidIsoDate(eventDate)) {
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
      };
    }

    // -------------------------------------------------------------------------
    // RULE 4 & 5: Older Schemes with Authenticated 2026 Amendments
    // -------------------------------------------------------------------------
    const olderScheme = candidate.olderSchemeContext;
    if (olderScheme && olderScheme.schemeOriginYear && olderScheme.schemeOriginYear < 2026) {
      if (olderScheme.has2026Amendment && olderScheme.tests2026DevelopmentExplicitly) {
        const amendmentDate = olderScheme.amendmentDate || eventDate;
        if (amendmentDate >= cycleStart && amendmentDate <= cutoffDate) {
          return {
            eligible: true,
            targetStatus: 'SOURCE_VERIFIED',
            defectCode: 'NONE',
            details: `Older scheme (${olderScheme.schemeOriginYear}) is eligible: question explicitly tests verified 2026 amendment/milestone (${amendmentDate}): ${olderScheme.amendmentDetails || ''}`,
            eventDate,
            publicationDate,
            isWithin2026Cycle: true,
            isWithinSixMonthBank: amendmentDate >= sixMonthStart && amendmentDate <= cutoffDate,
            isOlderSchemeWith2026Amendment: true,
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
      };
    }

    // -------------------------------------------------------------------------
    // RULE 1: Pre-2026 Event Date -> REJECTED
    // -------------------------------------------------------------------------
    if (eventDate < cycleStart) {
      const reason = `Event occurred on ${eventDate}, which is prior to the 2026 exam cycle boundary (01-01-2026). Pre-2026 events are disqualified from 2026 Current Affairs.`;
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
      };
    }

    // -------------------------------------------------------------------------
    // RULE 2: Six-Month Historical Bank Window (23-04-2026 to 23-10-2026)
    // -------------------------------------------------------------------------
    const isWithinSixMonth = eventDate >= sixMonthStart && eventDate <= cutoffDate;
    if (enforceSixMonth && !isWithinSixMonth) {
      const reason = `Event date ${eventDate} is outside the active six-month historical bank window (${sixMonthStart} to ${cutoffDate}).`;
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
      };
    }

    // -------------------------------------------------------------------------
    // Genuine 2026 Event -> ELIGIBLE
    // -------------------------------------------------------------------------
    return {
      eligible: true,
      targetStatus: 'SOURCE_VERIFIED',
      defectCode: 'NONE',
      details: `Genuine 2026 event verified on ${eventDate} (within preparation cycle 01-01-2026 to ${cutoffDate}).`,
      eventDate,
      publicationDate,
      isWithin2026Cycle: true,
      isWithinSixMonthBank: isWithinSixMonth,
      isOlderSchemeWith2026Amendment: false,
    };
  }

  /**
   * Rule 8: Preserves an independently verified older pre-2026 question
   * in General Studies / Historical Knowledge, preventing it from being relabeled
   * or published as a 2026 Current Affairs item.
   */
  public static reclassifyToGeneralStudies(
    candidate: QuestionAccuracyCandidate
  ): QuestionAccuracyCandidate {
    return {
      ...candidate,
      category: 'General Studies — Historical Knowledge',
      category_ta: 'பொது அறிவு — வரலாற்றுப் பாடப்பிரிவு',
      isCurrentAffairs: false,
      quarantineNotes: `Preserved in General Studies / Historical Knowledge. Event date: ${candidate.eventDate || 'Pre-2026'}. Excluded from 2026 Current Affairs bank under Policy Rule 8.`,
    };
  }
}
