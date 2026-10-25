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

export type AccuracyPublicationMode =
  | 'AUTO_VERIFIED'
  | 'MANUAL_APPROVED';

export type AccuracyGateCheckId =
  | 'SOURCE_AUTHENTICATED'
  | 'FACTUAL_VERIFICATION'
  | 'SINGLE_CORRECT_ANSWER'
  | 'TAMIL_VERIFICATION'
  | 'ENGLISH_VERIFICATION'
  | 'DISTRACTOR_VERIFICATION'
  | 'DUPLICATE_CHECK'
  | 'EDITORIAL_APPROVAL'
  | 'CONFLICT_RETRACTION_CHECK'
  | 'TEMPORAL_ELIGIBILITY_2026';

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
  publicationMode?: AccuracyPublicationMode;
  verificationPolicyVersion?: string;
  provenance?: {
    publicationMode: AccuracyPublicationMode;
    verificationPolicyVersion: string;
    publishedAt?: string;
    contentVersion: number;
    verifiedSourceIds?: string[];
    isAutoVerified: boolean;
  };
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
  officialDocumentId?: string;
  sourceUrl?: string;
  sourcePublisher?: string;
  sourceExcerpt?: string;
  publicationDate?: string;
  eventDate?: string;

  // Automated Publication & Versioning Provenance
  publicationMode?: AccuracyPublicationMode;
  verificationPolicyVersion?: string;
  verifiedSourceIds?: string[];
  automatedVerificationResults?: Record<string, any>;
  publishedAt?: string;
  contentVersion?: number;
  previousVersions?: Array<{
    version: number;
    question_en: string;
    question_ta: string;
    options_en: string[];
    options_ta: string[];
    correctOptionIndex: number;
    explanation_en: string;
    explanation_ta: string;
    modifiedAt: string;
    modifiedBy: string;
    changeReason: string;
  }>;
  hasRetractionHistory?: boolean;
  hasDefectHistory?: boolean;
  isDisputed?: boolean;

  // Textbook Citation (for syllabus questions)
  textbookCitation?: {
    standard: string; // e.g. "Class 6"
    subject: string;
    termOrVolume?: string;
    pageNumber?: number | string;
    lessonName?: string;
  };

  // 2026-Only Current Affairs Temporal Context
  category?: string;
  category_ta?: string;
  isCurrentAffairs?: boolean;
  olderSchemeContext?: {
    schemeOriginYear?: number;
    has2026Amendment?: boolean;
    amendmentDate?: string;
    tests2026DevelopmentExplicitly?: boolean;
    amendmentDetails?: string;
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
  totalDistinctQuestions: number;
  mutuallyExclusiveStatuses: {
    draft: number;
    sourceVerified: number;
    humanApproved: number;
    published: number;
    reviewRequired: number;
    rejected: number;
    retracted: number;
  };
  cumulativeMilestones: {
    passedSourceVerification: number;
    passedHumanEditorialApproval: number;
    activeStudentDeliverable: number;
  };
  quarantinedCount: number;
  automatedGatePassRate: string; // e.g., "100%"
  factualAccuracyVerificationStatus: string;
  gateFailuresBreakdown: Record<AccuracyGateCheckId, number>;
}

export type ErratumDefectClassification =
  | 'INCORRECT_ANSWER_KEY'
  | 'AMBIGUOUS_QUESTION'
  | 'INVALID_QUESTION'
  | 'TRANSLATION_DISCREPANCY'
  | 'INCORRECT_CITATION_ONLY';

export type ErratumRemedyType =
  | 'KEY_RESCORE'
  | 'ACCEPT_MULTIPLE_KEYS'
  | 'FULL_MARKS_AWARDED'
  | 'LANGUAGE_SPECIFIC_RESCORE'
  | 'METADATA_UPDATE_ONLY';

export interface ErratumRemedyApproval {
  approvedByUid: string;
  approvedAt: string;
  remedyDecision: ErratumRemedyType;
  rationale: string;
}

export interface ErratumScoreAdjustment {
  attemptId: string;
  userId: string;
  originalScore: number;
  adjustedScore: number;
  erratumDelta: number;
  incidentId: string;
  remedyApplied: ErratumRemedyType;
  appliedAt: string;
  doubleCompensationPrevented: boolean;
}

export interface QuestionIncidentLog {
  incidentId: string;
  questionId: string;
  flaggedAt: string;
  reason: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  defectClassification: ErratumDefectClassification;
  remedyType: ErratumRemedyType;
  adminUid: string;
  previousKeyIndex: number;
  revisedKeyIndex?: number;
  acceptedOptionIndexes?: number[];
  affectedAttemptsCount: number;
  affectedStudentsCount: number;
  erratumActionTaken: string;
  editorialApproval: ErratumRemedyApproval | null;
  mistakeVaultNeutralizedCount: number;
  reapprovalRequired: boolean;
  status: 'ACTIVE_RETRACTION' | 'RESOLVED_REPUBLISHED' | 'PERMANENTLY_QUARANTINED';
}
