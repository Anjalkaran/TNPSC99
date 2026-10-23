/**
 * TNPSC99 Current Affairs Intelligence Engine Types
 * Phase CA-1, Six-Month Backfill, and Fully Automated Publishing Specification
 */

export type SourceReliabilityTier = 1 | 2 | 3 | 4;

export type SourceCollectionMethod = 'rss' | 'scrape_html' | 'pdf_parse';

export type TNPSCCategory =
  | 'tamil_nadu'
  | 'welfare_schemes'
  | 'polity_governance'
  | 'economy'
  | 'science_tech'
  | 'environment_geography'
  | 'national'
  | 'international'
  | 'sports_awards_appointments';

export type TNPSCExamGroup = 'Group I' | 'Group II' | 'Group IV';

export type QuestionRiskLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';

export type QuestionEditorialStatus = 
  | 'DRAFT' 
  | 'REVIEW_REQUIRED' 
  | 'AUTO_VERIFIED' 
  | 'APPROVED' 
  | 'PUBLISHED' 
  | 'REJECTED' 
  | 'RETRACTED';

export interface CASource {
  id: string;
  name: string;
  name_ta: string;
  baseUrl: string;
  feedUrl?: string;
  reliabilityTier: SourceReliabilityTier;
  language: 'ta' | 'en' | 'bilingual';
  collectionMethod: SourceCollectionMethod;
  pollIntervalMinutes: number;
  lastPolledAt?: string;
  status: 'active' | 'paused' | 'error';
  lastError?: string;
  licensingNotice: string;
}

export interface CARawDocument {
  id: string; // SHA-256 hash of (sourceId + canonicalUrl)
  sourceId: string;
  canonicalUrl: string;
  title: string;
  title_ta?: string;
  publicationDate: string; // YYYY-MM-DD
  eventDate?: string; // YYYY-MM-DD
  ingestedAt: string; // ISO 8601 UTC
  contentRaw: string;
  contentText: string; // Sanitized, text-only
  contentChecksum: string; // SHA-256 of normalized text
  contentType: 'text/html' | 'application/pdf' | 'application/xml';
  pdfGcsUri?: string;
  language: 'en' | 'ta' | 'bilingual';
  processingStatus: 'pending' | 'processed' | 'skipped' | 'failed';
  skipReason?: string;
  retryCount: number;
  lastError?: string;
}

export interface CAEvent {
  id: string;
  rawDocumentId: string;
  sourceId: string;
  title_en: string;
  title_ta: string;
  summary_en: string;
  summary_ta: string;
  eventDate: string; // YYYY-MM-DD
  publicationDate: string; // YYYY-MM-DD
  category: TNPSCCategory;
  examGroups: TNPSCExamGroup[];
  importanceScore: number; // 1 to 5
  keywords: string[];
  keywords_ta: string[];
  extractedFactIds: string[];
  createdAt: string;
  status: 'draft' | 'verified' | 'archived';
}

export type FactClaimStatus = 'source_supported' | 'conflicting' | 'review_required' | 'unsupported';

export interface CAFact {
  id: string;
  eventId: string;
  rawDocumentId: string;
  statement_en: string;
  statement_ta: string;
  entities: {
    persons?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    numericalValues?: { label: string; value: number | string; unit?: string }[];
    schemes?: string[];
    awards?: string[];
    appointments?: string[];
  };
  sourceExcerpt: string;
  pageOrParagraphRef?: string;
  verificationStatus: 'unverified' | 'corroborated' | 'contradicted' | 'source_supported' | 'conflicting' | 'review_required' | 'unsupported';
  claimStatus?: FactClaimStatus;
  conflictReason?: string;
  reviewNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface CACorrectionRecord {
  correctedAt: string;
  previousCorrectOptionIndex: number;
  newCorrectOptionIndex: number;
  reason: string;
  adminUid: string;
}

export interface CAVerificationReport {
  timestamp: string;
  factualConsistency: boolean;
  unambiguousCorrectAnswer: boolean;
  distractorQualityPassed: boolean;
  tamilEnglishSemanticallyIdentical: boolean;
  hasAuthoritativeCitation: boolean;
  blindSolverResult?: {
    independentlySolved: boolean;
    predictedOptionIndex: number;
    solverConfidence: number;
  };
  riskLevel: QuestionRiskLevel;
  overallScore: number; // 0 to 100
  canAutoPublish: boolean;
  rejectionReasons: string[];
}

export interface CADraftQuestion {
  id: string; // e.g. ca26_xxxxxxxxxxxx
  factIds: string[];
  eventId: string;
  rawDocumentId: string;
  sourceUrl: string;
  monthKey: string; // e.g., '2026-05', '2026-06'
  
  // English MCQ
  question_en: string;
  options_en: string[]; // exactly 4
  correctOptionIndex: number;
  explanation_en: string;

  // Tamil MCQ
  question_ta: string;
  options_ta: string[]; // exactly 4
  explanation_ta: string;

  category: TNPSCCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  examType: TNPSCExamGroup;
  questionType: 'direct' | 'statement_matching' | 'assertion_reason' | 'chronological';

  verificationReport: CAVerificationReport;
  overallStatus: QuestionEditorialStatus;
  rejectionReason?: string;
  editorialApproval?: {
    approvedBy: string; // Admin UID or 'AUTO_PIPELINE'
    approvedAt: string;
    notes?: string;
  } | null;
  correctionHistory?: CACorrectionRecord[];
  createdAt: string;
  publishedAt?: string;
}

export type ManifestType = 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'grand_mock_6m' 
  | 'topic_special';

export interface CAManifest {
  id: string;
  type: ManifestType;
  title_en: string;
  title_ta: string;
  description_en: string;
  description_ta: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  monthKey?: string; // e.g., '2026-05' for monthly
  questionIds: string[]; // Canonical IDs
  questionCount: number;
  durationMinutes: number;
  syllabusCategory: 'Current Affairs';
  examGroup: TNPSCExamGroup;
  tier: 'free' | 'premium';
  publishedTestId?: string;
  publishedAt?: string;
  publishedBy?: string;
  status: 'draft' | 'ready_for_review' | 'approved' | 'published';
}

export interface HistoricalPartition {
  monthKey: string;
  name: string;
  name_ta: string;
  periodStart: string;
  periodEnd: string;
  targetMCQCount: number;
}

export interface HistoricalBackfillWindow {
  startDate: string;
  endDate: string;
  cutoffDate?: string;
  partitions: HistoricalPartition[];
}

export interface CAAuditLog {
  id: string;
  timestamp: string;
  eventType: 
    | 'SOURCE_INGESTION' 
    | 'EVENT_EXTRACTED' 
    | 'QUESTION_DRAFTED' 
    | 'AUTO_VERIFIED' 
    | 'AUTO_REJECTED' 
    | 'EDITOR_APPROVED' 
    | 'TEST_PUBLISHED' 
    | 'QUESTION_RETRACTED'
    | 'PIPELINE_RUN';
  entityId: string;
  entityCollection: string;
  actor: 'SYSTEM_BOT' | 'AI_ENGINE' | string;
  metadata: Record<string, any>;
  ipAddress?: string;
}

export interface CAPipelineRun {
  id: string; // e.g., 'run_2026_10_23_daily'
  runDate: string; // YYYY-MM-DD
  startedAt: string;
  completedAt?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CIRCUIT_BREAKER_TRIGGERED';
  stageTimings: {
    sourceIngestionMs?: number;
    eventDeduplicationMs?: number;
    factExtractionMs?: number;
    mcqGenerationMs?: number;
    independentVerificationMs?: number;
    publicationGateMs?: number;
    dailyTestAssemblyMs?: number;
  };
  metrics: {
    sourcesMonitored: number;
    sourcesFailed: number;
    rawDocumentsIngested: number;
    duplicatesSkipped: number;
    eventsExtracted: number;
    draftsGenerated: number;
    verifiedCount: number;
    rejectedCount: number;
    routedToReviewCount: number;
    autoPublishedCount: number;
    inputTokensConsumed: number;
    outputTokensConsumed: number;
    estimatedCostUSD: number;
    estimatedCostINR: number;
  };
  errors: string[];
  autoPublishEnabled: boolean;
  createdManifestId?: string;
}

export interface PipelineConfig {
  autoPublishEnabled: boolean; // default: false
  dailyAiSpendingCapUSD: number; // default: $1.00 (~₹84)
  retryLimit: number; // default: 3
  minVerificationScoreForAutoPublish: number; // default: 95
  dailyTestTargetCount: number; // default: 15
  weeklyTestTargetCount: number; // default: 50
  timezone: string; // 'Asia/Kolkata'
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  autoPublishEnabled: false, // Strict default: REVIEW_REQUIRED
  dailyAiSpendingCapUSD: 1.00, // $1.00 / day hard limit
  retryLimit: 3,
  minVerificationScoreForAutoPublish: 95,
  dailyTestTargetCount: 15,
  weeklyTestTargetCount: 50,
  timezone: 'Asia/Kolkata',
};
