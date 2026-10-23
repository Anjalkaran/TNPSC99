import { Question } from '../types';

export interface CADraftPackageQuestion {
  id: string;
  coverageWindow: { from: string; to: string };
  eventDate: string;
  publicationDate: string;
  category: string;
  question: { en: string; ta: string };
  options: { en: string; ta: string }[];
  correctOptionIndex: number;
  explanation: { en: string; ta: string };
  sources: { publisher: string; url: string; type: string; verifiedVia: string; evidenceText: string }[];
  status: 'REVIEW_REQUIRED' | 'DRAFT' | 'APPROVED' | 'REJECTED';
  editorialApproval: string | null;
  verification: {
    automatedStructuralChecksPassed: boolean;
    primarySourceLocated: boolean;
    publicationAllowed: boolean;
    verifiedAt: string;
  };
}

export interface StagingValidationReport {
  totalRecordsInPackage: number;
  recordsValid: number;
  recordsRejected: number;
  recordsReadyForStaging: number;
  recordsApprovedForProduction: number; // Always 0 before human editorial review
  validationErrors: { id: string; error: string }[];
  categoryBreakdown: Record<string, number>;
  monthBreakdown: Record<string, number>;
}

/**
 * Validates a batch of Current Affairs questions against the strict TNPSC99 schema.
 */
export function validateDraftPackage(
  questions: CADraftPackageQuestion[],
  allowedDateRange: { min: string; max: string } = { min: '2026-04-23', max: '2026-10-23' }
): StagingValidationReport {
  const seenIds = new Set<string>();
  const validationErrors: { id: string; error: string }[] = [];
  const categoryBreakdown: Record<string, number> = {};
  const monthBreakdown: Record<string, number> = {};

  let validCount = 0;
  let rejectedCount = 0;

  for (const q of questions) {
    let hasError = false;

    // 1. Unique ID regex
    if (!/^ca26_[a-f0-9]{12}$/.test(q.id)) {
      validationErrors.push({ id: q.id, error: 'Invalid ID format; must match /^ca26_[a-f0-9]{12}$/' });
      hasError = true;
    } else if (seenIds.has(q.id)) {
      validationErrors.push({ id: q.id, error: `Duplicate ID detected: ${q.id}` });
      hasError = true;
    }
    seenIds.add(q.id);

    // 2. Date window
    if (!q.eventDate || q.eventDate < allowedDateRange.min || q.eventDate > allowedDateRange.max) {
      validationErrors.push({ id: q.id, error: `Event date ${q.eventDate} outside allowed range ${allowedDateRange.min} - ${allowedDateRange.max}` });
      hasError = true;
    }

    // 3. Editorial safety status
    if (q.status !== 'REVIEW_REQUIRED' && q.status !== 'DRAFT') {
      validationErrors.push({ id: q.id, error: `Invalid status ${q.status}; only REVIEW_REQUIRED or DRAFT permitted for unreviewed import` });
      hasError = true;
    }
    if (q.verification?.publicationAllowed !== false) {
      validationErrors.push({ id: q.id, error: 'Unreviewed draft must have verification.publicationAllowed = false' });
      hasError = true;
    }
    if (q.editorialApproval !== null) {
      validationErrors.push({ id: q.id, error: 'Unreviewed draft cannot have editorialApproval pre-populated' });
      hasError = true;
    }

    // 4. Options & Answer Keys
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      validationErrors.push({ id: q.id, error: 'Question must have exactly 4 options' });
      hasError = true;
    }
    if (q.correctOptionIndex < 0 || q.correctOptionIndex > 3) {
      validationErrors.push({ id: q.id, error: 'correctOptionIndex must be 0, 1, 2, or 3' });
      hasError = true;
    }

    // 5. Bilingual Completeness
    if (!q.question?.en || !q.question?.ta || !q.explanation?.en || !q.explanation?.ta) {
      validationErrors.push({ id: q.id, error: 'Missing English or Tamil question text or explanation' });
      hasError = true;
    }
    if (Array.isArray(q.options)) {
      for (let i = 0; i < q.options.length; i++) {
        if (!q.options[i]?.en || !q.options[i]?.ta) {
          validationErrors.push({ id: q.id, error: `Option ${i} missing English or Tamil text` });
          hasError = true;
        }
      }
    }

    // 6. Official Sources
    if (!Array.isArray(q.sources) || q.sources.length === 0 || !q.sources[0]?.url) {
      validationErrors.push({ id: q.id, error: 'Must contain at least one official source URL' });
      hasError = true;
    }

    if (hasError) {
      rejectedCount++;
    } else {
      validCount++;
      // Increment category count
      const cat = q.category || 'Uncategorized';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      // Increment month count
      const month = q.eventDate.slice(0, 7); // YYYY-MM
      monthBreakdown[month] = (monthBreakdown[month] || 0) + 1;
    }
  }

  return {
    totalRecordsInPackage: questions.length,
    recordsValid: validCount,
    recordsRejected: rejectedCount,
    recordsReadyForStaging: validCount,
    recordsApprovedForProduction: 0, // Zero published without human editorial review
    validationErrors,
    categoryBreakdown,
    monthBreakdown,
  };
}

/**
 * Transforms an approved draft question into the production Question format.
 * (Used only after human editorial approval action).
 */
export function transformDraftToProductionQuestion(
  draft: CADraftPackageQuestion,
  language: 'ta' | 'en' = 'ta'
): Question {
  return {
    id: draft.id,
    text: draft.question[language],
    correctAnswer: draft.options[draft.correctOptionIndex][language],
    answerOptions: draft.options.map((o) => o[language]),
    explanation: draft.explanation[language],
    reference: draft.sources[0]?.publisher || 'Government Gazette',
    referenceUrl: draft.sources[0]?.url,
    category: draft.category,
    difficulty: 'medium',
    examType: 'Group II',
  };
}
