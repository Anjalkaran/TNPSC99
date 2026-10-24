/**
 * TNPSC99 — Permanent Zero-Compromise MCQ Accuracy Engine Types
 * Governs all question bank verification, fail-closed gates, audits, and incident response.
 */

export type AccuracyLifecycleStatus =
  | 'DRAFT'
  | 'SOURCE_VERIFIED'
  | 'HUMAN_APPROVED'
  | 'PUBLISHED'
  | 'REVIEW_REQUIRED'
  | 'REJECTED'
  | 'RETRACTED';

export type AccuracyGateCheckId =
  | 'SOURCE_AUTHENTICATED'
  | 'FACTUAL_VERIFICATION'
  | 'SINGLE_CORRECT_ANSWER'
  | 'TAMIL_VERIFICATION'
  | 'ENGLISH_VERIFICATION'
  | 'DISTRACTOR_VERIFICATION'
  | 'DUPLICATE_CHECK'
  | 'EDITORIAL_APPROVAL'
  | 'CONFLICT_RETRACTION_CHECK';

export interface GateCheckResult {
  checkId: AccuracyGateCheckId;
  name: string;
  passed: boolean;
  score: number; // 0 to 100
  details: string;
  failureReason?: string;
}

export interface AccuracyGateEvaluation {
  questionId: string;
  allGatesPassed: boolean;
  targetStatus: AccuracyLifecycleStatus;
  gateResults: GateCheckResult[];
  rejectionReasons: string[];
  evaluatedAt: string;
  evaluatorVersion: string;
}

export interface QuestionAccuracyCandidate {
  id: string;
  question_en: string;
  question_ta: string;
  options_en: string[];
  options_ta: string[];
  correctOptionIndex: number;
  explanation_en: string;
  explanation_ta: string;
  
  // Provenance & Source Evidence
  sourceUrl?: string;
  sourcePublisher?: string;
  sourceExcerpt?: string;
  publicationDate?: string;
  eventDate?: string;

  // Textbook Citation (for syllabus questions)
  textbookCitation?: {
    standard: string; // e.g. "Class 6"
    subject: string;
    termOrVolume?: string;
    pageNumber?: number | string;
    lessonName?: string;
  };

  // Human Review & Metadata
  editorialApproval?: {
    approvedBy: string; // Admin UID
    approvedAt: string;
    notes?: string;
  } | null;

  isRetracted?: boolean;
  isQuarantined?: boolean;
  quarantineReason?: string;
  quarantineNotes?: string;
  status?: AccuracyLifecycleStatus;
}

export interface AccuracyAuditSummary {
  timestamp: string;
  totalAudited: number;
  counts: {
    draft: number;
    sourceVerified: number;
    humanApproved: number;
    published: number;
    reviewRequired: number;
    rejected: number;
    retracted: number;
  };
  quarantinedCount: number;
  complianceRate: number; // Percentage meeting zero-compromise criteria
  gateFailuresBreakdown: Record<AccuracyGateCheckId, number>;
}

export interface QuestionIncidentLog {
  incidentId: string;
  questionId: string;
  flaggedAt: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  adminUid: string;
  previousKeyIndex: number;
  revisedKeyIndex?: number;
  affectedAttemptsCount: number;
  affectedStudentsCount: number;
  erratumActionTaken: 'FULL_MARKS_AWARDED' | 'TOTAL_SCORE_NORMALIZED' | 'QUESTION_VOIDED';
  mistakeVaultNeutralizedCount: number;
  reapprovalRequired: boolean;
  status: 'ACTIVE_RETRACTION' | 'RESOLVED_REPUBLISHED' | 'PERMANENTLY_QUARANTINED';
}
