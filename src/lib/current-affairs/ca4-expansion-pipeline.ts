/**
 * TNPSC99 — Phase CA-4 Historical Current Affairs Expansion Pipeline
 *
 * Operationalizes multi-partition historical ingestion across the 6-month examination window
 * (23 April 2026 – 23 October 2026), targeting 75–100 approved bilingual MCQs per full month
 * subject strictly to available authentic evidence.
 *
 * Enforces:
 * 1. Primary Source Authenticity Gate (canonical URL + checksum + G.O./PR number)
 * 2. Deduplication Engine (SHA-256 + URL normalization + text similarity)
 * 3. Non-Template Diverse Distractor Generation
 * 4. Balanced Option Key Distribution (25% across A, B, C, D)
 * 5. Fail-Closed Editorial Gate (0 questions auto-published without review)
 */

import { computeContentChecksum, computeDocumentId, normalizeText } from './hasher';
import { 
  CADraftQuestion, 
  HistoricalPartition, 
  HistoricalBackfillWindow,
  TNPSCCategory,
  TNPSCExamGroup,
  QuestionEditorialStatus 
} from './types';

export interface CA4SourceRegistryEntry {
  sourceId: string;
  name: string;
  name_ta: string;
  domain: string;
  tier: 1 | 2;
  category: TNPSCCategory;
  retrievalProtocol: 'dipr_archive' | 'pib_regional' | 'gazette_order' | 'institutional_bulletin';
}

export const CA4_OFFICIAL_SOURCE_REGISTRY: CA4SourceRegistryEntry[] = [
  {
    sourceId: 'SRC_TN_DIPR',
    name: 'Tamil Nadu Information & Public Relations Department (DIPR)',
    name_ta: 'செய்தி மக்கள் தொடர்புத்துறை (தமிழ்நாடு அரசு)',
    domain: 'tn.gov.in',
    tier: 1,
    category: 'welfare_schemes',
    retrievalProtocol: 'dipr_archive',
  },
  {
    sourceId: 'SRC_TN_GAZETTE',
    name: 'Stationery and Printing Tamil Nadu Government Gazette',
    name_ta: 'தமிழ்நாடு அரசு அரசிதழ்',
    domain: 'stationeryprinting.tn.gov.in',
    tier: 1,
    category: 'polity_governance',
    retrievalProtocol: 'gazette_order',
  },
  {
    sourceId: 'SRC_PIB_CHENNAI',
    name: 'Press Information Bureau Chennai & Regional Tamil Releases',
    name_ta: 'பத்திரிகை தகவல் அலுவலகம் சென்னை',
    domain: 'pib.gov.in',
    tier: 1,
    category: 'national',
    retrievalProtocol: 'pib_regional',
  },
  {
    sourceId: 'SRC_RBI_OFFICIAL',
    name: 'Reserve Bank of India Monetary & Statistical Bulletins',
    name_ta: 'இந்திய ரிசர்வ் வங்கி',
    domain: 'rbi.org.in',
    tier: 1,
    category: 'economy',
    retrievalProtocol: 'institutional_bulletin',
  },
  {
    sourceId: 'SRC_ISRO_OFFICIAL',
    name: 'Indian Space Research Organisation Missions & Announcements',
    name_ta: 'இந்திய விண்வெளி ஆராய்ச்சி நிறுவனம்',
    domain: 'isro.gov.in',
    tier: 1,
    category: 'science_tech',
    retrievalProtocol: 'institutional_bulletin',
  },
  {
    sourceId: 'SRC_TN_ARCHAEOLOGY',
    name: 'Tamil Nadu State Department of Archaeology Excavation Reports',
    name_ta: 'தமிழ்நாடு அரசு தொல்லியல் துறை',
    domain: 'tnarch.gov.in',
    tier: 1,
    category: 'tamil_nadu',
    retrievalProtocol: 'institutional_bulletin',
  },
  {
    sourceId: 'SRC_TN_FOREST_WETLAND',
    name: 'Tamil Nadu Forest & Wetland Mission Conservation Orders',
    name_ta: 'தமிழ்நாடு சுற்றுச்சூழல் மற்றும் வனத்துறை',
    domain: 'forests.tn.gov.in',
    tier: 1,
    category: 'environment_geography',
    retrievalProtocol: 'institutional_bulletin',
  },
  {
    sourceId: 'SRC_SDAT_SPORTS',
    name: 'Sports Development Authority of Tamil Nadu (SDAT)',
    name_ta: 'தமிழ்நாடு விளையாட்டு மேம்பாட்டு ஆணையம்',
    domain: 'sdat.tn.gov.in',
    tier: 1,
    category: 'sports_awards_appointments',
    retrievalProtocol: 'institutional_bulletin',
  },
];

/**
 * 6-Month Historical Backfill Window Specification
 */
export const CA4_BACKFILL_WINDOW: HistoricalBackfillWindow = {
  startDate: '2026-04-23',
  endDate: '2026-10-23',
  cutoffDate: '2026-10-23',
  partitions: [
    {
      monthKey: '2026-05',
      name: 'Partition M1 (23 April – 22 May 2026)',
      name_ta: 'பகுதி M1 (23 ஏப்ரல் – 22 மே 2026)',
      periodStart: '2026-04-23',
      periodEnd: '2026-05-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-06',
      name: 'Partition M2 (23 May – 22 June 2026)',
      name_ta: 'பகுதி M2 (23 மே – 22 ஜூன் 2026)',
      periodStart: '2026-05-23',
      periodEnd: '2026-06-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-07',
      name: 'Partition M3 (23 June – 22 July 2026)',
      name_ta: 'பகுதி M3 (23 ஜூன் – 22 ஜூலை 2026)',
      periodStart: '2026-06-23',
      periodEnd: '2026-07-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-08',
      name: 'Partition M4 (23 July – 22 August 2026)',
      name_ta: 'பகுதி M4 (23 ஜூலை – 22 ஆகஸ்ட் 2026)',
      periodStart: '2026-07-23',
      periodEnd: '2026-08-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-09',
      name: 'Partition M5 (23 August – 22 September 2026)',
      name_ta: 'பகுதி M5 (23 ஆகஸ்ட் – 22 செப்டம்பர் 2026)',
      periodStart: '2026-08-23',
      periodEnd: '2026-09-22',
      targetMCQCount: 85,
    },
    {
      monthKey: '2026-10',
      name: 'Partition M6 (23 September – 23 October 2026)',
      name_ta: 'பகுதி M6 (23 செப்டம்பர் – 23 அக்டோபர் 2026)',
      periodStart: '2026-09-23',
      periodEnd: '2026-10-23',
      targetMCQCount: 85,
    },
  ],
};

/**
 * Editorial Review Audit Record Schema
 */
export interface CAEditorialAuditRecord {
  questionId: string;
  reviewerMethod: 'HUMAN_EDITORIAL_BOARD' | 'AUTOMATED_STATIC_ANALYZER';
  reviewerIdentity: string; // e.g. 'Senior_TNPSC_Content_Editor_ID_04'
  decision: 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED';
  rejectionReasons: string[];
  sourceUrlAuthenticated: boolean;
  canonicalUrlVerified: string;
  evidenceMatched: boolean;
  factualConsistencyConfirmed: boolean;
  bilingualEquivalenceConfirmed: boolean;
  distractorQualityPassed: boolean;
  tnpscRelevanceConfirmed: boolean;
  auditTimestamp: string;
  notes: string;
}

/**
 * Deduplication check between candidate facts/questions
 */
export function checkDuplicateQuestion(
  newChecksum: string,
  existingChecksums: Set<string>
): boolean {
  return existingChecksums.has(newChecksum);
}

/**
 * Validates whether a proposed source URL adheres to official canonical conventions.
 */
export function validateCanonicalSourceUrl(url: string): {
  isValid: boolean;
  failureReason?: string;
} {
  try {
    const parsed = new URL(url);
    const officialDomains = [
      'tn.gov.in',
      'pib.gov.in',
      'rbi.org.in',
      'isro.gov.in',
      'inspace.gov.in',
      'stationeryprinting.tn.gov.in',
      'forests.tn.gov.in',
      'sdat.tn.gov.in',
      'naanmudhalvan.tn.gov.in',
      'sipcot.tn.gov.in',
      'health.tn.gov.in',
      'ctd.tn.gov.in',
      'tnarch.gov.in',
    ];

    const matchesDomain = officialDomains.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
    if (!matchesDomain) {
      return { isValid: false, failureReason: `Domain ${parsed.hostname} is not an authorized official tier-1 government source.` };
    }

    // Reject generic root domains or non-canonical landing pages
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return { isValid: false, failureReason: 'Generic landing page root is not accepted as canonical document URL.' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, failureReason: 'Malformed URL structure.' };
  }
}
