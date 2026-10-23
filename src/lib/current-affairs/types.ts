/**
 * TNPSC99 Current Affairs Intelligence Engine Types
 * Phase CA-1 & Six-Month Backfill Specification
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
  eventDate?: string; // YYYY-MM-DD (extracted if different from pub date)
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
  };
  sourceExcerpt: string;
  pageOrParagraphRef?: string;
  verificationStatus: 'unverified' | 'corroborated' | 'contradicted';
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

export interface CADraftQuestion {
  id: string;
  factIds: string[];
  eventId: string;
  rawDocumentId: string;
  sourceUrl: string;
  monthKey: string; // e.g., '2026-05', '2026-06'
  
  // English MCQ
  question_en: string;
  options_en: string[];
  correctOptionIndex: number;
  explanation_en: string;

  // Tamil MCQ
  question_ta: string;
  options_ta: string[];
  explanation_ta: string;

  category: TNPSCCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  examType: TNPSCExamGroup;
  questionType: 'direct' | 'statement_matching' | 'assertion_reason' | 'chronological';

  verificationChecks: {
    factualConsistency: boolean;
    unambiguousCorrectAnswer: boolean;
    distractorQualityPassed: boolean;
    tamilEnglishSemanticallyIdentical: boolean;
    hasAuthoritativeCitation: boolean;
  };
  overallStatus: 'draft' | 'auto_verified' | 'rejected' | 'editor_approved' | 'retracted';
  rejectionReason?: string;
  correctionHistory?: CACorrectionRecord[];
  createdAt: string;
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
  monthKey: string; // '2026-05'
  name: string; // 'May 2026'
  name_ta: string; // 'மே 2026'
  periodStart: string; // '2026-04-23'
  periodEnd: string; // '2026-05-22'
  targetMCQCount: number; // 75 - 100
}

export interface HistoricalBackfillWindow {
  startDate: string; // '2026-04-23'
  endDate: string; // '2026-10-23'
  cutoffDate?: string; // Optional exam cutoff date
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
    | 'QUESTION_RETRACTED';
  entityId: string;
  entityCollection: string;
  actor: 'SYSTEM_BOT' | 'AI_ENGINE' | string;
  metadata: Record<string, any>;
  ipAddress?: string;
}
