/**
 * TNPSC99 — Daily Current Affairs Accuracy Guard & 2026-Only Fallback Engine
 * Enforces dynamic edition sizing, strict 2026 temporal eligibility,
 * and the 3-Tier Fallback Priority.
 */

import { QuestionAccuracyCandidate } from './types';
import { evaluatePublicationGate } from './accuracy-engine';
import { TemporalEligibilityValidator } from './temporal-validator';
import { PublicSampleTestPackage } from '@/data/public-sample-questions';

export type DailyCaFallbackTier =
  | 'TODAY_APPROVED'
  | 'REVISION_FALLBACK'
  | 'EDITORIAL_VERIFICATION_IN_PROGRESS';

export interface DailyCaCandidateEdition {
  editionDate: string; // ISO date YYYY-MM-DD
  questions: QuestionAccuracyCandidate[];
  title_en?: string;
  title_ta?: string;
  subtitle_en?: string;
  subtitle_ta?: string;
  durationMinutes?: number;
}

export interface DailyCaGuardResult {
  hasApprovedEdition: boolean;
  status: 'PUBLISHED' | 'EDITORIAL_REVIEW_IN_PROGRESS';
  tier: DailyCaFallbackTier;
  editionDate: string | null;
  originalEditionDate?: string | null;
  isRevision?: boolean;
  revisionNotice_en?: string | null;
  revisionNotice_ta?: string | null;
  message: string;
  message_ta?: string;
  package: PublicSampleTestPackage | null;
  verifiedCount: number;
  unverifiedFilteredCount: number;
}

export class DailyCaAccuracyGuard {
  /**
   * Filters candidate questions to retain only those that pass all 10 publication gates
   * AND strict 2026 temporal eligibility.
   */
  public static filterApprovedQuestions(
    candidates: QuestionAccuracyCandidate[]
  ): QuestionAccuracyCandidate[] {
    return candidates.filter((q) => {
      // 1. Accuracy Engine Gates
      const evaluation = evaluatePublicationGate(q);
      if (!evaluation.allGatesPassed || q.isRetracted || q.isQuarantined) {
        return false;
      }

      // 2. Temporal 2026 Validation Gate
      const temporal = TemporalEligibilityValidator.validate(q);
      return temporal.eligible;
    });
  }

  /**
   * Sanitizes and verifies a single daily edition candidate.
   * If 0 pass, returns Fallback Tier 3 with the exact approved strings.
   */
  public static processDailyEdition(
    editionDate: string,
    candidateQuestions: QuestionAccuracyCandidate[],
    manifestTitle_en = 'Daily Current Affairs — Approved Edition',
    manifestTitle_ta = 'தினசரி நடப்பு நிகழ்வுகள் — அங்கீகரிக்கப்பட்ட பதிப்பு'
  ): DailyCaGuardResult {
    const approvedQuestions = this.filterApprovedQuestions(candidateQuestions);
    const unverifiedFilteredCount = candidateQuestions.length - approvedQuestions.length;

    // Zero-verified questions condition -> Tier 3 Editorial Fallback
    if (approvedQuestions.length === 0) {
      return {
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        tier: 'EDITORIAL_VERIFICATION_IN_PROGRESS',
        editionDate: null,
        message: '2026 Current Affairs — Editorial Verification in Progress.',
        message_ta: '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.',
        package: null,
        verifiedCount: 0,
        unverifiedFilteredCount,
      };
    }

    // Dynamic sizing: Publish exactly verified questions
    const dynamicPackage: PublicSampleTestPackage = {
      id: `ca_edition_${editionDate.replace(/-/g, '')}`,
      title_en: `${manifestTitle_en} (${approvedQuestions.length} Questions)`,
      title_ta: `${manifestTitle_ta} (${approvedQuestions.length} வினாக்கள்)`,
      subtitle_en: `Officially Verified · ${editionDate} Edition`,
      subtitle_ta: `அரசிதழ் சரிபார்க்கப்பட்ட பதிப்பு · ${editionDate}`,
      editionDate,
      questionCount: approvedQuestions.length,
      durationMinutes: Math.max(5, approvedQuestions.length),
      isRevision: false,
      questions: approvedQuestions.map((q) => ({
        id: q.id,
        category: q.category || 'Current Affairs',
        category_ta: q.category_ta || 'நடப்பு நிகழ்வுகள்',
        examGroup: 'Group II',
        difficulty: 'medium',
        question_en: q.question_en,
        options_en: q.options_en,
        explanation_en: q.explanation_en,
        question_ta: q.question_ta,
        options_ta: q.options_ta,
        explanation_ta: q.explanation_ta,
        correctOptionIndex: q.correctOptionIndex,
        sourceRef: q.sourcePublisher || 'Official Gazette',
        sourceUrl: q.sourceUrl,
      })),
    };

    return {
      hasApprovedEdition: true,
      status: 'PUBLISHED',
      tier: 'TODAY_APPROVED',
      editionDate,
      isRevision: false,
      message: `Edition published with ${approvedQuestions.length} authentic verified questions.`,
      message_ta: `${approvedQuestions.length} சரிபார்க்கப்பட்ட வினாக்களுடன் பதிப்பு வெளியிடப்பட்டது.`,
      package: dynamicPackage,
      verifiedCount: approvedQuestions.length,
      unverifiedFilteredCount,
    };
  }

  /**
   * Enforces the 3-Tier Fallback Priority across available editions:
   * First: Today's fully approved 2026 Current Affairs edition.
   * Second: Most recent approved 2026 Current Affairs edition (clearly labelled as revision with original date).
   * Third: If no approved 2026 edition exists:
   *        English: "2026 Current Affairs — Editorial Verification in Progress."
   *        Tamil:   "2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது."
   */
  public static resolveDailyCaEdition(
    todayDate: string,
    availableEditions: DailyCaCandidateEdition[]
  ): DailyCaGuardResult {
    // -------------------------------------------------------------------------
    // TIER 1: Today's Approved Edition
    // -------------------------------------------------------------------------
    const todayEdition = availableEditions.find((e) => e.editionDate === todayDate);
    if (todayEdition) {
      const approvedToday = this.filterApprovedQuestions(todayEdition.questions);
      if (approvedToday.length > 0) {
        return this.processDailyEdition(
          todayDate,
          todayEdition.questions,
          todayEdition.title_en,
          todayEdition.title_ta
        );
      }
    }

    // -------------------------------------------------------------------------
    // TIER 2: Revision Fallback (Most Recent Approved 2026 Edition)
    // -------------------------------------------------------------------------
    // Sort candidate editions descending by date (excluding today)
    const priorEditions = availableEditions
      .filter((e) => e.editionDate < todayDate && e.editionDate >= '2026-01-01')
      .sort((a, b) => b.editionDate.localeCompare(a.editionDate));

    for (const prior of priorEditions) {
      const approvedPrior = this.filterApprovedQuestions(prior.questions);
      if (approvedPrior.length > 0) {
        const origDate = prior.editionDate;
        const revisionPackage: PublicSampleTestPackage = {
          id: `ca_edition_rev_${origDate.replace(/-/g, '')}`,
          title_en: `Daily Current Affairs — Revision Practice (${approvedPrior.length} Questions)`,
          title_ta: `தினசரி நடப்பு நிகழ்வுகள் — மீள்பார்வைப் பயிற்சி (${approvedPrior.length} வினாக்கள்)`,
          subtitle_en: `Revision Practice · ${origDate} Edition`,
          subtitle_ta: `மீள்பார்வைப் பயிற்சி · ${origDate} பதிப்பு`,
          editionDate: origDate,
          originalEditionDate: origDate,
          isRevision: true,
          revisionNotice_en: `Revision Practice — ${origDate} Edition`,
          revisionNotice_ta: `மீள்பார்வைப் பயிற்சி — ${origDate} பதிப்பு`,
          questionCount: approvedPrior.length,
          durationMinutes: Math.max(5, approvedPrior.length),
          questions: approvedPrior.map((q) => ({
            id: q.id,
            category: q.category || 'Current Affairs',
            category_ta: q.category_ta || 'நடப்பு நிகழ்வுகள்',
            examGroup: 'Group II',
            difficulty: 'medium',
            question_en: q.question_en,
            options_en: q.options_en,
            explanation_en: q.explanation_en,
            question_ta: q.question_ta,
            options_ta: q.options_ta,
            explanation_ta: q.explanation_ta,
            correctOptionIndex: q.correctOptionIndex,
            sourceRef: q.sourcePublisher || 'Official Gazette',
            sourceUrl: q.sourceUrl,
          })),
        };

        return {
          hasApprovedEdition: true,
          status: 'PUBLISHED',
          tier: 'REVISION_FALLBACK',
          editionDate: origDate,
          originalEditionDate: origDate,
          isRevision: true,
          revisionNotice_en: `Revision Practice — ${origDate} Edition`,
          revisionNotice_ta: `மீள்பார்வைப் பயிற்சி — ${origDate} பதிப்பு`,
          message: `Today's edition is under verification. Serving Revision Practice from ${origDate}.`,
          message_ta: `இன்றைய பதிப்பு சரிபார்ப்பில் உள்ளது. ${origDate} தேதியிட்ட மீள்பார்வைப் பயிற்சி வழங்கப்படுகிறது.`,
          package: revisionPackage,
          verifiedCount: approvedPrior.length,
          unverifiedFilteredCount: prior.questions.length - approvedPrior.length,
        };
      }
    }

    // -------------------------------------------------------------------------
    // TIER 3: No Approved 2026 Edition Exists -> Editorial Fallback
    // -------------------------------------------------------------------------
    return {
      hasApprovedEdition: false,
      status: 'EDITORIAL_REVIEW_IN_PROGRESS',
      tier: 'EDITORIAL_VERIFICATION_IN_PROGRESS',
      editionDate: null,
      isRevision: false,
      message: '2026 Current Affairs — Editorial Verification in Progress.',
      message_ta: '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.',
      package: null,
      verifiedCount: 0,
      unverifiedFilteredCount: 0,
    };
  }
}
