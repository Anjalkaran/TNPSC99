/**
 * TNPSC99 — Persistent Current Affairs Defect & Quarantined Misinformation Registry
 * 
 * Enforces a permanent, immutable registry of confirmed defective questions, mismatched document IDs,
 * pre-2026 events masquerading as 2026 current affairs, and incorrect factual claims.
 * 
 * MANDATORY POLICY:
 * Any candidate question matching a quarantined question ID, document identifier, or known defect claim
 * must be permanently blocked from AUTO_VERIFIED publication and routed to QUARANTINED status.
 * Reinstatement requires independent human editorial review with primary source certification.
 */

export interface QuarantinedDefectRecord {
  questionId: string;
  officialDocumentId: string;
  sourceUrl: string;
  claimedEventDate: string;
  actualEventDate: string;
  claimedFact: string;
  actualFactFromPrimarySource: string;
  defectClassification: 
    | 'PRE_2026_EVENT_IN_2026_PUBLICATION'
    | 'FACTUAL_NUMERICAL_DISCREPANCY'
    | 'DOCUMENT_CONTENT_MISMATCH'
    | 'FABRICATED_METADATA_EVENT_DATE'
    | 'OLDER_SCHEME_TESTS_PRE_2026_FACT';
  quarantineReason: string;
  quarantinedAt: string;
  reinstatementBlocked: boolean;
  immutableAuditLock: boolean;
}

export const PERMANENT_DEFECT_REGISTRY: QuarantinedDefectRecord[] = [
  // Defect 1: ca_2026_draft_02 (PIB PRID 2098813)
  {
    questionId: 'ca_2026_draft_02',
    officialDocumentId: 'PIB PRID 2098813',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2098813',
    claimedEventDate: '2026-02-01',
    actualEventDate: '2025-02-01',
    claimedFact: 'Ramsar wetland sites count in Tamil Nadu claimed as 2026 event.',
    actualFactFromPrimarySource: 'PIB PRID 2098813 was published on 01 February 2025 covering a North India regional workshop in Ayodhya, UP. Event took place in 2025, not 2026.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Pre-2026 event (01 February 2025) published in 2025 and falsely represented as 2026 current affairs.',
    quarantinedAt: '2026-10-24T14:00:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
  // Defect 2: ca_2026_draft_03 (RBI repo rate)
  {
    questionId: 'ca_2026_draft_03',
    officialDocumentId: 'RBI Press Release PRID 62121',
    sourceUrl: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=62121',
    claimedEventDate: '2026-10-07',
    actualEventDate: '2026-06-05',
    claimedFact: 'RBI Monetary Policy Committee set policy repo rate to 5.50% after a 25 bps hike.',
    actualFactFromPrimarySource: 'The actual RBI policy repo rate in the June/October 2026 monetary policy cycle was 5.25%, not 5.50%. Claimed 5.50% is a factual numerical hallucination.',
    defectClassification: 'FACTUAL_NUMERICAL_DISCREPANCY',
    quarantineReason: 'Factual numerical error: June 2026 RBI repo rate was 5.25%, not 5.50%.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
  // Defect 3: ca_2026_draft_08 (ISRO SSLV-D3 / EOS-08)
  {
    questionId: 'ca_2026_draft_08',
    officialDocumentId: 'PIB PRID 2261045',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2261045',
    claimedEventDate: '2026-07-28',
    actualEventDate: '2024-08-16',
    claimedFact: 'ISRO SSLV-D3 launched EOS-08 satellite in July 2026.',
    actualFactFromPrimarySource: 'ISRO launched the SSLV-D3 / EOS-08 mission on 16 August 2024 at 09:17 hrs IST from SDSC SHAR, Sriharikota. The event occurred in 2024, not 2026.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Historical 2024 space launch (16 August 2024) falsely backdated or postdated to 2026 Current Affairs.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
  // Defect 4: ca_2026_draft_14 (PIB PRID 2274981)
  {
    questionId: 'ca_2026_draft_14',
    officialDocumentId: 'PIB PRID 2274981',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2274981',
    claimedEventDate: '2026-10-21',
    actualEventDate: '2026-06-18',
    claimedFact: 'PIB PRID 2274981 reports NITI Aayog State Health and Nutrition Index 2026 ranking Tamil Nadu second.',
    actualFactFromPrimarySource: 'PIB PRID 2274981 is titled "English Translation of Prime Minister’s Address during the Indian Community Event" in France on 18 June 2026. It has zero relation to NITI Aayog or health index rankings.',
    defectClassification: 'DOCUMENT_CONTENT_MISMATCH',
    quarantineReason: 'Severe document content mismatch: PIB PRID 2274981 is PM address in France, not NITI Aayog Health Index.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
  // Defect 5: ca_2026_draft_17 (PM-KISAN 17th instalment)
  {
    questionId: 'ca_2026_draft_17',
    officialDocumentId: 'PIB PRID 2245671',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2245671',
    claimedEventDate: '2026-04-18',
    actualEventDate: '2024-06-18',
    claimedFact: 'PM-KISAN 17th installment was released in April 2026 to 9.26 crore farmers.',
    actualFactFromPrimarySource: 'The 17th instalment of PM-KISAN was released by PM Narendra Modi on 18 June 2024 at Varanasi, Uttar Pradesh. It is a 2024 event, not a 2026 current affair.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Historical 2024 welfare disbursement (18 June 2024) falsely presented as 2026 event.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
  // Defect 6: ca_2026_draft_19 (Maratha Military Landscapes)
  {
    questionId: 'ca_2026_draft_19',
    officialDocumentId: 'PIB PRID 2267890',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2267890',
    claimedEventDate: '2026-08-10',
    actualEventDate: '2024-07-26',
    claimedFact: 'UNESCO inscribed Maratha Military Landscapes in August 2026 as India’s 44th World Heritage Property.',
    actualFactFromPrimarySource: 'The Maratha Military Landscapes of India was nominated for the 2024–25 cycle and inscribed in 2024/2025. It was not inscribed in August 2026.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Pre-2026 UNESCO world heritage inscription (2024–2025) falsely represented as August 2026 milestone.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },
];

export interface DefectCheckResult {
  isDefect: boolean;
  record?: QuarantinedDefectRecord;
  failureCode?: string;
  details?: string;
}

/**
 * Checks if a candidate question or document identifier matches known quarantined misinformation.
 */
export function checkPersistentDefectRegistry(candidate: {
  id?: string;
  officialDocumentId?: string;
  sourceUrl?: string;
  question_en?: string;
  sourceExcerpt?: string;
}): DefectCheckResult {
  const normText = (candidate.question_en || '') + ' ' + (candidate.sourceExcerpt || '');

  // 1. Check exact question ID
  if (candidate.id) {
    const matchedById = PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === candidate.id);
    if (matchedById) {
      return {
        isDefect: true,
        record: matchedById,
        failureCode: 'KNOWN_DEFECT_RECYCLING_PROHIBITED',
        details: `Question ID ${candidate.id} is permanently quarantined: ${matchedById.quarantineReason}`,
      };
    }
  }

  // 2. Check document number or URL
  for (const d of PERMANENT_DEFECT_REGISTRY) {
    if (candidate.officialDocumentId && candidate.officialDocumentId.includes(d.officialDocumentId)) {
      return {
        isDefect: true,
        record: d,
        failureCode: 'QUARANTINED_DOCUMENT_IDENTIFIER',
        details: `Document ID ${candidate.officialDocumentId} is associated with quarantined defect: ${d.quarantineReason}`,
      };
    }
    if (candidate.sourceUrl && d.sourceUrl && candidate.sourceUrl.toLowerCase() === d.sourceUrl.toLowerCase()) {
      return {
        isDefect: true,
        record: d,
        failureCode: 'QUARANTINED_SOURCE_URL',
        details: `Source URL ${candidate.sourceUrl} is associated with quarantined defect: ${d.quarantineReason}`,
      };
    }
  }

  // 3. Check specific known false claims in text
  // Repo rate 5.50% hallucination
  if (normText.includes('5.50') && normText.toLowerCase().includes('repo rate')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_draft_03'),
      failureCode: 'FACTUAL_NUMERICAL_DISCREPANCY',
      details: 'Known factual error: June 2026 RBI repo rate was 5.25%, not 5.50%.',
    };
  }

  // SSLV-D3 2026 backdating
  if (normText.includes('SSLV-D3') || normText.includes('EOS-08')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_draft_08'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Known pre-2026 event: ISRO SSLV-D3 / EOS-08 launched on 16 August 2024, not in 2026.',
    };
  }

  // PM-KISAN 17th instalment 2026 backdating
  if (normText.toLowerCase().includes('pm-kisan') && (normText.includes('17th') || normText.includes('17 th'))) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_draft_17'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Known pre-2026 event: PM-KISAN 17th instalment was released on 18 June 2024, not in 2026.',
    };
  }

  // Maratha Military Landscapes UNESCO 2026 backdating
  if (normText.toLowerCase().includes('maratha military') && normText.toLowerCase().includes('unesco')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_draft_19'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Known pre-2026 event: Maratha Military Landscapes inscribed by UNESCO in 2024–2025, not August 2026.',
    };
  }

  return { isDefect: false };
}
