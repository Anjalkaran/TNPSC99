/**
 * TNPSC99 — Daily Current Affairs Accuracy Guard & Edition Sizing
 * Enforces dynamic edition sizing and prevents fabrication of synthetic filler questions.
 */

import { QuestionAccuracyCandidate } from './types';
import { evaluatePublicationGate } from './accuracy-engine';
import { PublicSampleTestPackage } from '@/data/public-sample-questions';

export interface DailyCaGuardResult {
  hasApprovedEdition: boolean;
  status: 'PUBLISHED' | 'EDITORIAL_REVIEW_IN_PROGRESS';
  editionDate: string | null;
  message: string;
  package: PublicSampleTestPackage | null;
  verifiedCount: number;
  unverifiedFilteredCount: number;
}

export class DailyCaAccuracyGuard {
  /**
   * Sanitizes and verifies a candidate daily edition.
   * If only 6 of 10 pass, returns at most those 6 with an accurate count label.
   * If 0 pass, returns hasApprovedEdition: false with status EDITORIAL_REVIEW_IN_PROGRESS.
   * Never fabricates unverified questions to meet quotas.
   */
  public static processDailyEdition(
    editionDate: string,
    candidateQuestions: QuestionAccuracyCandidate[],
    manifestTitle_en = 'Daily Current Affairs — Approved Edition',
    manifestTitle_ta = 'தினசரி நடப்பு நிகழ்வுகள் — அங்கீகரிக்கப்பட்ட பதிப்பு'
  ): DailyCaGuardResult {
    // Audit each candidate question against the 9 fail-closed gates
    const approvedQuestions = candidateQuestions.filter((q) => {
      const evaluation = evaluatePublicationGate(q);
      return evaluation.allGatesPassed && !q.isRetracted && !q.isQuarantined;
    });

    const unverifiedFilteredCount = candidateQuestions.length - approvedQuestions.length;

    // Zero-verified questions condition
    if (approvedQuestions.length === 0) {
      return {
        hasApprovedEdition: false,
        status: 'EDITORIAL_REVIEW_IN_PROGRESS',
        editionDate: null,
        message: 'Upcoming Current Affairs edition is undergoing official verification by the editorial desk against Tamil Nadu Government Gazettes.',
        package: null,
        verifiedCount: 0,
        unverifiedFilteredCount,
      };
    }

    // Dynamic sizing: Publish exactly the verified questions (e.g. 6 questions if only 6 verified)
    const dynamicPackage: PublicSampleTestPackage = {
      id: `ca_edition_${editionDate.replace(/-/g, '')}`,
      title_en: `${manifestTitle_en} (${approvedQuestions.length} Questions)`,
      title_ta: `${manifestTitle_ta} (${approvedQuestions.length} வினாக்கள்)`,
      subtitle_en: `Officially Verified · ${editionDate} Edition`,
      subtitle_ta: `அரசிதழ் சரிபார்க்கப்பட்ட பதிப்பு · ${editionDate}`,
      editionDate,
      questionCount: approvedQuestions.length,
      durationMinutes: Math.max(5, approvedQuestions.length), // 1 min per question
      questions: approvedQuestions.map((q) => ({
        id: q.id,
        category: 'Current Affairs',
        category_ta: 'நடப்பு நிகழ்வுகள்',
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
      editionDate,
      message: `Edition published with ${approvedQuestions.length} authentic verified questions.`,
      package: dynamicPackage,
      verifiedCount: approvedQuestions.length,
      unverifiedFilteredCount,
    };
  }
}
