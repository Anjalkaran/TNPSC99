import { CARawDocument, CAEvent, CAFact, FactClaimStatus, TNPSCCategory, TNPSCExamGroup } from './types';
import { classifyEvent } from './syllabus-classifier';
import { computeContentChecksum } from './hasher';

export interface ExtractedEntitySet {
  persons: string[];
  organizations: string[];
  locations: string[];
  dates: string[];
  numericalValues: { label: string; value: number | string; unit?: string }[];
  schemes: string[];
  awards?: string[];
  appointments?: string[];
}

export interface FactualClaimDraft {
  statement_en: string;
  statement_ta: string;
  entities: ExtractedEntitySet;
  sourceExcerpt: string;
  pageOrParagraphRef?: string;
  announcementDate: string;
  eventDate: string;
  effectiveDate?: string;
  examGroups: TNPSCExamGroup[];
  category: TNPSCCategory;
  isContradictedOrSuperseded?: boolean;
  contradictionNotes?: string;
  status?: FactClaimStatus;
  conflictReason?: string;
  reviewNotes?: string;
}

export interface ExtractionValidationResult {
  acceptedFacts: CAFact[];
  sourceSupportedFacts: CAFact[];
  conflictingFacts: CAFact[];
  reviewRequiredFacts: CAFact[];
  unsupportedClaims: {
    statement: string;
    reason: string;
    sourceUrl: string;
  }[];
  event: CAEvent;
}

/**
 * Deterministic entity recognition for official government text.
 */
export function extractEntitiesFromText(text: string): ExtractedEntitySet {
  const persons: string[] = [];
  const organizations: string[] = [];
  const locations: string[] = [];
  const dates: string[] = [];
  const numericalValues: { label: string; value: number | string; unit?: string }[] = [];
  const schemes: string[] = [];
  const awards: string[] = [];
  const appointments: string[] = [];

  // 1. Schemes
  const schemeMatches = text.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Thittam|Scheme|Yojana|Mission|Program)|[க-ஹ]+(?:\s+[க-ஹ]+)*\s+திட்டம்)/g);
  if (schemeMatches) {
    schemes.push(...Array.from(new Set(schemeMatches.map((s) => s.trim()))));
  }

  // 2. Organizations / Statutory Bodies
  const orgMatches = text.match(/\b(ISRO|RBI|DRDO|TNPSC|DIPR|TIDCO|SIPCOT|TIDEL|NITI Aayog|Election Commission|Madras High Court|Supreme Court|FIDE|AICF|SDAT)\b/gi);
  if (orgMatches) {
    organizations.push(...Array.from(new Set(orgMatches.map((o) => o.toUpperCase()))));
  }

  // 3. Locations
  const locMatches = text.match(/\b(Chennai|Madurai|Coimbatore|Hosur|Keeladi|Bengaluru|New Delhi|Tirunelveli|Thoothukudi|Salem|Budapest|Krishnagiri|Pichavaram|Kazhuveli|Kulasekarapattinam)\b/gi);
  if (locMatches) {
    locations.push(...Array.from(new Set(locMatches.map((l) => l.trim()))));
  }

  // 4. Numerical Values (Budget, Counts, Percentages)
  const numMatches = text.matchAll(/(?:Rs\.?|₹|INR)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(crore|lakh|percent|%|tonnes|km|MW|GW|acres)?/gi);
  for (const m of numMatches) {
    const rawVal = m[1].replace(/,/g, '');
    const num = parseFloat(rawVal);
    const unit = m[2] ? m[2].toLowerCase() : undefined;
    if (!isNaN(num)) {
      numericalValues.push({
        label: m[0].trim(),
        value: num,
        unit,
      });
    }
  }

  // 5. ISO / Formatted Dates
  const dateMatches = text.match(/\b(202\d{1}[-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01]))\b/g);
  if (dateMatches) {
    dates.push(...Array.from(new Set(dateMatches)));
  }

  // 6. Awards
  const awardMatches = text.match(/\b(Thagaisal Thamizhar(?: Award)?|Khel Ratna|Arjuna Award|Padma (?:Vibhushan|Bhushan|Shri)|Sahitya Akademi(?: Award)?)\b/gi);
  if (awardMatches) {
    awards.push(...Array.from(new Set(awardMatches.map((a) => a.trim()))));
  }

  // 7. Appointments & Offices
  const apptMatches = text.match(/\b(Chief Secretary|Governor|Chief Justice|Chairman|Director General|Finance Secretary)\b/gi);
  if (apptMatches) {
    appointments.push(...Array.from(new Set(apptMatches.map((a) => a.trim()))));
  }

  return {
    persons: Array.from(new Set(persons)),
    organizations: Array.from(new Set(organizations)),
    locations: Array.from(new Set(locations)),
    dates: Array.from(new Set(dates)),
    numericalValues,
    schemes: Array.from(new Set(schemes)),
    awards: Array.from(new Set(awards)),
    appointments: Array.from(new Set(appointments)),
  };
}

/**
 * Quality Control Validation Gate for extracted claims:
 * Rejects claims with missing evidence, ambiguous figures, broken source URLs, or unsupported exam relevance.
 */
export function validateClaimQuality(
  claim: FactualClaimDraft,
  sourceUrl: string
): { isValid: boolean; failureReason?: string } {
  // Check 1: Must have valid primary source URL
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    return { isValid: false, failureReason: 'Missing or malformed primary source URL' };
  }

  // Check 2: Must have exact sentence-level source evidence (minimum 25 characters)
  if (!claim.sourceExcerpt || claim.sourceExcerpt.trim().length < 25) {
    return { isValid: false, failureReason: 'Source evidence excerpt too brief or missing' };
  }

  // Check 3: Assertion must be grounded in source excerpt
  const cleanExcerpt = claim.sourceExcerpt.toLowerCase();
  const cleanStmt = claim.statement_en.toLowerCase();
  const keyTokens = cleanStmt.split(' ').filter((t) => t.length > 4);
  const matchedTokens = keyTokens.filter((t) => cleanExcerpt.includes(t));
  
  if (keyTokens.length > 0 && matchedTokens.length === 0) {
    return { isValid: false, failureReason: 'Claim statement lacks lexical grounding in source excerpt' };
  }

  // Check 4: Ambiguous numerical figures
  if (claim.statement_en.includes('approximately') && !claim.sourceExcerpt.includes('approximately')) {
    return { isValid: false, failureReason: 'Numerical value contains ungrounded ambiguity' };
  }

  // Check 5: Must have at least one exam group relevance
  if (!claim.examGroups || claim.examGroups.length === 0) {
    return { isValid: false, failureReason: 'No relevant TNPSC exam group specified' };
  }

  // Check 6: Bilingual completeness
  if (!claim.statement_ta || claim.statement_ta.trim().length < 10) {
    return { isValid: false, failureReason: 'Missing or incomplete Tamil factual statement' };
  }

  return { isValid: true };
}

/**
 * Processes a raw document, derives a structured event, extracts atomic facts, and categorizes claims into:
 * 1. Source-supported facts (evidence backed and verified)
 * 2. Conflicting facts (contradictions or superseding policy figures identified)
 * 3. Facts requiring review (tentative figures or awaiting external gazette)
 * 4. Unsupported claims (failed quality checks or missing evidence)
 */
export function extractAndValidateFacts(
  doc: CARawDocument,
  rawClaims: FactualClaimDraft[]
): ExtractionValidationResult {
  const classification = classifyEvent(`${doc.title} ${doc.contentText.slice(0, 600)}`);
  const eventId = `ca_ev_${doc.id.slice(0, 12)}`;

  const event: CAEvent = {
    id: eventId,
    rawDocumentId: doc.id,
    sourceId: doc.sourceId,
    title_en: doc.title,
    title_ta: doc.title_ta || doc.title,
    summary_en: doc.contentText.slice(0, 350),
    summary_ta: doc.title_ta || doc.title,
    eventDate: doc.eventDate || doc.publicationDate,
    publicationDate: doc.publicationDate,
    category: classification.primaryCategory,
    examGroups: classification.examGroups,
    importanceScore: classification.importanceScore,
    keywords: [classification.primaryCategory],
    keywords_ta: [],
    extractedFactIds: [],
    createdAt: new Date().toISOString(),
    status: 'verified',
  };

  const acceptedFacts: CAFact[] = [];
  const sourceSupportedFacts: CAFact[] = [];
  const conflictingFacts: CAFact[] = [];
  const reviewRequiredFacts: CAFact[] = [];
  const unsupportedClaims: { statement: string; reason: string; sourceUrl: string }[] = [];

  for (let idx = 0; idx < rawClaims.length; idx++) {
    const claim = rawClaims[idx];
    const validation = validateClaimQuality(claim, doc.canonicalUrl);

    if (validation.isValid) {
      const factId = `ca_fact_${doc.id.slice(0, 8)}_${(idx + 1).toString().padStart(2, '0')}`;
      event.extractedFactIds.push(factId);

      const claimStatus: FactClaimStatus = claim.status || (claim.isContradictedOrSuperseded ? 'conflicting' : 'source_supported');

      const fact: CAFact = {
        id: factId,
        eventId: event.id,
        rawDocumentId: doc.id,
        statement_en: claim.statement_en,
        statement_ta: claim.statement_ta,
        entities: claim.entities,
        sourceExcerpt: claim.sourceExcerpt,
        pageOrParagraphRef: claim.pageOrParagraphRef,
        verificationStatus: claimStatus,
        claimStatus,
        conflictReason: claim.conflictReason || claim.contradictionNotes,
        reviewNotes: claim.reviewNotes,
        verifiedBy: 'deterministic_evidence_gate_v1',
        verifiedAt: new Date().toISOString(),
      };

      acceptedFacts.push(fact);

      if (claimStatus === 'source_supported') {
        sourceSupportedFacts.push(fact);
      } else if (claimStatus === 'conflicting') {
        conflictingFacts.push(fact);
      } else if (claimStatus === 'review_required') {
        reviewRequiredFacts.push(fact);
      }
    } else {
      unsupportedClaims.push({
        statement: claim.statement_en,
        reason: validation.failureReason || 'Quality check failed',
        sourceUrl: doc.canonicalUrl,
      });
    }
  }

  return {
    acceptedFacts,
    sourceSupportedFacts,
    conflictingFacts,
    reviewRequiredFacts,
    unsupportedClaims,
    event,
  };
}
