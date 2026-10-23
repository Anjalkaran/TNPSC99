# TNPSC99 — Current Affairs Intelligence Engine Data Models
**Document Version:** 1.0.0  
**Phase:** CA-1 Architecture and Source Ingestion  
**Status:** Approved Schema Specification  
**Branch:** `feature/current-affairs-engine`

---

## 1. Syllabus Classification Taxonomy

Every event and question is tagged with standard TNPSC Current Affairs taxonomy:

### 1.1 Category Hierarchy
- `tamil_nadu`: State government initiatives, policies, cultural events, infrastructure projects, geographical indicators (GI tags) in TN.
- `welfare_schemes`: State schemes (e.g., Kalaignar Magalir Urimai Thittam, Pudhumai Penn, Makkalai Thedi Maruthuvam) & Central centrally sponsored schemes.
- `polity_governance`: Constitutional developments, acts, bills, High Court / Supreme Court orders, Election Commission updates, committee reports.
- `economy`: Union/State budgets, economic surveys, GST, inflation, RBI policy rates, export-import, industrial corridors.
- `science_tech`: ISRO space missions, DRDO defense trials, nuclear energy, biotechnology, AI/semiconductor missions.
- `environment_geography`: National parks, wildlife sanctuaries, Ramsar sites, climate summits, cyclones/disasters, biodiversity tags.
- `national`: Inter-state issues, national summits, national policies, infrastructure corridors.
- `international`: Bilateral summits, UN/G20/BRICS/SCO summits, global indices, international treaties.
- `sports_awards_appointments`: Padma awards, Tamil Nadu state awards (Thiruvalluvar award, Avvaiyar award, etc.), Olympic/Asian games, Sahitya Akademi, Chief Justices, Commission chairpersons.

### 1.2 Examination Relevance Tagging
- `Group I`: Analytical, multi-statement questions, policy implications, governance trade-offs.
- `Group II/IIA`: Comprehensive factual and conceptual questions, scheme objectives, statutory bodies.
- `Group IV`: Direct factual, date, place, personality, name of scheme, award recipient questions in clear bilingual format.

---

## 2. Versioned Firestore Staging Schemas

### 2.1 Collection: `ca_sources`
Tracks configured government publishers and syndication endpoints.
```typescript
export interface CASource {
  id: string; // e.g., 'SRC_TN_DIPR_PRESS'
  name: string; // 'Tamil Nadu DIPR Press Releases'
  name_ta: string; // 'தமிழ்நாடு செய்தி மக்கள் தொடர்புத் துறை'
  baseUrl: string;
  feedUrl?: string;
  reliabilityTier: 1 | 2 | 3 | 4;
  language: 'ta' | 'en' | 'bilingual';
  collectionMethod: 'rss' | 'scrape_html' | 'pdf_parse';
  pollIntervalMinutes: number;
  lastPolledAt?: string; // ISO 8601
  status: 'active' | 'paused' | 'error';
  lastError?: string;
  licensingNotice: string;
}
```

### 2.2 Collection: `ca_raw_documents`
Immutable raw payloads snapshotting the government release.
```typescript
export interface CARawDocument {
  id: string; // SHA-256 hash of (sourceId + canonicalUrl)
  sourceId: string;
  canonicalUrl: string;
  title: string;
  title_ta?: string;
  publicationDate: string; // YYYY-MM-DD printed on release
  ingestedAt: string; // ISO 8601 UTC
  contentRaw: string;
  contentText: string; // Stripped of HTML/markup
  contentChecksum: string; // SHA-256 of normalized text
  contentType: 'text/html' | 'application/pdf' | 'application/xml';
  pdfGcsUri?: string; // If document was a PDF attachment
  language: 'en' | 'ta' | 'bilingual';
  processingStatus: 'pending' | 'processed' | 'skipped' | 'failed';
  skipReason?: string; // e.g., 'duplicate', 'no_tnpsc_relevance'
  retryCount: number;
}
```

### 2.3 Collection: `ca_events`
Synthesized real-world news events extracted from raw documents.
```typescript
export interface CAEvent {
  id: string; // UUID v4
  rawDocumentId: string;
  sourceId: string;
  title_en: string;
  title_ta: string;
  summary_en: string;
  summary_ta: string;
  eventDate: string; // YYYY-MM-DD
  publicationDate: string; // YYYY-MM-DD
  category: 
    | 'tamil_nadu' 
    | 'welfare_schemes' 
    | 'polity_governance' 
    | 'economy' 
    | 'science_tech' 
    | 'environment_geography' 
    | 'national' 
    | 'international' 
    | 'sports_awards_appointments';
  examGroups: ('Group I' | 'Group II' | 'Group IV')[];
  importanceScore: number; // 1 to 5 scale (5 = highest TNPSC likelihood)
  keywords: string[];
  keywords_ta: string[];
  extractedFactIds: string[];
  createdAt: string;
  status: 'draft' | 'verified' | 'archived';
}
```

### 2.4 Collection: `ca_facts`
Atomic verifiable factual claims derived from events.
```typescript
export interface CAFact {
  id: string; // UUID v4
  eventId: string;
  rawDocumentId: string;
  statement_en: string; // Single atomic factual assertion
  statement_ta: string;
  entities: {
    persons?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
    numericalValues?: { label: string; value: number | string; unit?: string }[];
    schemes?: string[];
  };
  sourceExcerpt: string; // Exact sentence from raw document
  pageOrParagraphRef?: string;
  verificationStatus: 'unverified' | 'corroborated' | 'contradicted';
  verifiedBy?: string; // 'ai_fact_checker_v1' or 'human_editor_uid'
  verifiedAt?: string;
}
```

### 2.5 Collection: `ca_draft_questions`
Candidate bilingual MCQs drafted from verified facts.
```typescript
export interface CADraftQuestion {
  id: string; // UUID v4
  factIds: string[];
  eventId: string;
  rawDocumentId: string;
  sourceUrl: string;
  
  // English MCQ
  question_en: string;
  options_en: string[]; // Exactly 4 options
  correctOptionIndex: number; // 0, 1, 2, or 3
  explanation_en: string;

  // Tamil MCQ (Strictly synchronized)
  question_ta: string;
  options_ta: string[]; // Exactly 4 options aligned with English
  explanation_ta: string;

  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examType: 'Group I' | 'Group II' | 'Group IV';
  questionType: 'direct' | 'statement_matching' | 'assertion_reason' | 'chronological';

  // Automated Verification Checks
  verificationChecks: {
    factualConsistency: boolean; // Confirmed by adversarial check
    unambiguousCorrectAnswer: boolean; // Only 1 correct option
    distractorQualityPassed: boolean; // Distractors plausible and distinct
    tamilEnglishSemanticallyIdentical: boolean;
    hasAuthoritativeCitation: boolean;
  };
  overallStatus: 'draft' | 'auto_verified' | 'rejected' | 'editor_approved';
  rejectionReason?: string;
  createdAt: string;
}
```

### 2.6 Collection: `ca_manifests`
Packaged daily, weekly, and monthly tests ready for publishing.
```typescript
export interface CAManifest {
  id: string; // e.g., 'manifest_daily_2026_10_23' or 'manifest_weekly_2026_w42'
  type: 'daily' | 'weekly' | 'monthly' | 'scheme_special';
  title_en: string;
  title_ta: string;
  description_en: string;
  description_ta: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  questionIds: string[]; // IDs in ca_draft_questions (approved)
  questionCount: number;
  durationMinutes: number;
  syllabusCategory: 'Current Affairs';
  examGroup: 'Group I' | 'Group II' | 'Group IV';
  tier: 'free' | 'premium'; // e.g., daily test free for 7 days; weekly/monthly premium
  publishedTestId?: string; // References production 'tests' collection ID once promoted
  publishedAt?: string;
  publishedBy?: string; // Admin UID
  status: 'draft' | 'ready_for_review' | 'approved' | 'published';
}
```

### 2.7 Collection: `ca_audit_logs`
Immutable record of all lifecycle events.
```typescript
export interface CAAuditLog {
  id: string; // UUID v4
  timestamp: string; // ISO 8601 UTC
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
  actor: 'SYSTEM_BOT' | 'AI_ENGINE' | string; // UID if human
  metadata: Record<string, any>;
  ipAddress?: string;
}
```
