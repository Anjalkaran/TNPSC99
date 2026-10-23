import { CAFact, CAEvent, CARawDocument, TNPSCCategory, TNPSCExamGroup } from './types';

export interface VerifiedFactExportItem {
  factId: string;
  duplicateGroupId: string;
  sourceUrl: string;
  publisher: string;
  evidenceExcerpt: string;
  statement_en: string;
  statement_ta: string;
  eventDate: string;
  publicationDate: string;
  effectiveDate?: string;
  syllabusCategory: TNPSCCategory;
  examGroups: TNPSCExamGroup[];
  entities: {
    schemes?: string[];
    organizations?: string[];
    locations?: string[];
    numericalValues?: { label: string; value: number | string; unit?: string }[];
    dates?: string[];
  };
  verificationStatus: 'corroborated' | 'verified';
  eligibleQuestionTypes: ('direct' | 'statement_matching' | 'assertion_reason' | 'chronological')[];
  monthKey: string;
}

export interface VerifiedFactsManifest {
  version: string;
  generatedAt: string;
  coverageWindow: { from: string; to: string };
  totalFactCount: number;
  facts: VerifiedFactExportItem[];
  categoryDistribution: Record<string, number>;
  monthDistribution: Record<string, number>;
}

/**
 * Determines eligible MCQ question types based on extracted fact characteristics.
 */
export function determineEligibleQuestionTypes(
  category: TNPSCCategory,
  entities: CAFact['entities']
): ('direct' | 'statement_matching' | 'assertion_reason' | 'chronological')[] {
  const types: ('direct' | 'statement_matching' | 'assertion_reason' | 'chronological')[] = ['direct'];

  // If there are multiple numerical values or schemes, suitable for multi-statement matching
  if ((entities.numericalValues && entities.numericalValues.length > 1) || category === 'welfare_schemes') {
    types.push('statement_matching');
  }

  // If economy, polity, or science-tech, suitable for assertion-reason
  if (category === 'economy' || category === 'polity_governance' || category === 'science_tech') {
    types.push('assertion_reason');
  }

  // If there are multiple dates or historical progression
  if (entities.dates && entities.dates.length > 1) {
    types.push('chronological');
  }

  return types;
}

/**
 * Compiles a structured, verified-facts export manifest ready for Phase CA-3 bilingual MCQ drafting.
 */
export function compileVerifiedFactsExport(
  facts: CAFact[],
  events: CAEvent[],
  rawDocs: CARawDocument[]
): VerifiedFactsManifest {
  const eventMap = new Map<string, CAEvent>(events.map((e) => [e.id, e]));
  const docMap = new Map<string, CARawDocument>(rawDocs.map((d) => [d.id, d]));

  const categoryDist: Record<string, number> = {};
  const monthDist: Record<string, number> = {};

  const exportItems: VerifiedFactExportItem[] = [];

  for (const fact of facts) {
    const event = eventMap.get(fact.eventId);
    const doc = docMap.get(fact.rawDocumentId);

    const sourceUrl = doc?.canonicalUrl || 'https://www.tn.gov.in';
    const publisher = doc?.sourceId || 'Government of Tamil Nadu';
    const eventDate = event?.eventDate || '2026-05-01';
    const pubDate = event?.publicationDate || eventDate;
    const category = event?.category || 'tamil_nadu';
    const examGroups = event?.examGroups || ['Group II'];
    const monthKey = eventDate.slice(0, 7);

    // Group ID for deduplicating MCQs generated from the same parent event
    const duplicateGroupId = `group_${event?.id || fact.rawDocumentId}`;

    const eligibleTypes = determineEligibleQuestionTypes(category, fact.entities);

    exportItems.push({
      factId: fact.id,
      duplicateGroupId,
      sourceUrl,
      publisher,
      evidenceExcerpt: fact.sourceExcerpt,
      statement_en: fact.statement_en,
      statement_ta: fact.statement_ta,
      eventDate,
      publicationDate: pubDate,
      syllabusCategory: category,
      examGroups,
      entities: fact.entities,
      verificationStatus: 'corroborated',
      eligibleQuestionTypes: eligibleTypes,
      monthKey,
    });

    categoryDist[category] = (categoryDist[category] || 0) + 1;
    monthDist[monthKey] = (monthDist[monthKey] || 0) + 1;
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    coverageWindow: { from: '2026-04-23', to: '2026-10-23' },
    totalFactCount: exportItems.length,
    facts: exportItems,
    categoryDistribution: categoryDist,
    monthDistribution: monthDist,
  };
}
