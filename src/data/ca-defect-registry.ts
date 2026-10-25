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
  historicalAliases?: string[];
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
  // ---------------------------------------------------------------------------
  // Defect 1: Wetlands workshop in Ayodhya (PIB PRID 2098813)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_02',
    historicalAliases: ['ca_2026_draft_02', 'ca_2026_v2_02'],
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

  // ---------------------------------------------------------------------------
  // Defect 2: RBI Repo Rate 5.50% (PRID 62121)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_03',
    historicalAliases: ['ca_2026_draft_03', 'ca_2026_v2_03'],
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

  // ---------------------------------------------------------------------------
  // Defect 3: Pudhumai Penn Phase Expansion (G.O. Ms No. 34 / 2024)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_04',
    historicalAliases: ['ca_2026_draft_04_proto'],
    officialDocumentId: 'G.O. (Ms) No. 34 (SW&WE)',
    sourceUrl: 'https://www.tn.gov.in/pressrelease/2026/05/pudhumai-penn-phase-expansion',
    claimedEventDate: '2026-05-08',
    actualEventDate: '2024-08-09',
    claimedFact: 'Pudhumai Penn scheme expanded to government-aided school girls in May 2026.',
    actualFactFromPrimarySource: 'The expansion of Pudhumai Penn monthly financial assistance of ₹1,000 to girl students in government-aided Tamil-medium schools was sanctioned under G.O. (Ms) No. 34 dated 31.07.2024 and launched on 09 August 2024. No new 2026 event exists; cited URL is synthetic.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Historical 2024 welfare expansion (09 August 2024) falsely backdated or postdated to 2026 Current Affairs.',
    quarantinedAt: '2026-10-24T18:10:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },

  // ---------------------------------------------------------------------------
  // Defect 4: EMC 2.0 Electronics Manufacturing Clusters (Manallur & Pillapaikkam)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_07',
    historicalAliases: ['ca_2026_draft_07', 'ca_2026_v2_07'],
    officialDocumentId: 'PIB PRID 2287658 / PIB PRID 2205046',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2287658',
    claimedEventDate: '2026-07-22',
    actualEventDate: '2025-12-17',
    claimedFact: 'MeitY formally approved two Electronics Manufacturing Clusters (EMC 2.0) in Tamil Nadu at Manallur and Pillapaikkam in July 2026.',
    actualFactFromPrimarySource: 'PIB PRID 2205046 issued on 17 December 2025 confirms MeitY approved Manallur (₹587.47 Cr) and Pillapaikkam (₹424.55 Cr) clusters under EMC 2.0. PIB PRID 2287658 (22 July 2026) was merely a retrospective Lok Sabha tabulation of previously approved clusters. The question portrays a 2025 approval as a 2026 event.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: Substantive approval occurred on 17 December 2025 (PIB PRID 2205046). Retrospectively tabled in Parliament on 22 July 2026 (PIB PRID 2287658). Question stem portrays 2025 approval as a July 2026 event.',
    quarantinedAt: '2026-10-25T05:30:00.000Z',
    reinstatementBlocked: true,
    immutableAuditLock: true,
  },

  // ---------------------------------------------------------------------------
  // Defect 5: ISRO SSLV-D3 / EOS-08 launch (16 August 2024)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_08',
    historicalAliases: ['ca_2026_draft_08_proto'],
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

  // ---------------------------------------------------------------------------
  // Defect 6: NITI Aayog Health Index Mismatch (PIB PRID 2274981)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_14',
    historicalAliases: ['ca_2026_draft_14_proto'],
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

  // ---------------------------------------------------------------------------
  // Defect 7: PM-KISAN 17th instalment (18 June 2024)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_17',
    historicalAliases: ['ca_2026_draft_17_proto'],
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

  // ---------------------------------------------------------------------------
  // Defect 8: Maratha Military Landscapes UNESCO Inscription (2024-2025)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_proto_19',
    historicalAliases: ['ca_2026_draft_19_proto'],
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

  // ---------------------------------------------------------------------------
  // Defect 9: Ramanathapuram Mundu Chilli GI Tag (Claimed October 2026; Actual Feb 2023)
  // ---------------------------------------------------------------------------
  {
    questionId: 'ca_2026_defect_ramnad_chilli',
    historicalAliases: ['PIB_2329410_ramnad_chilli'],
    officialDocumentId: 'PIB PRID 2329410 / GI Application 720',
    sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2329410',
    claimedEventDate: '2026-10-24',
    actualEventDate: '2023-02-22',
    claimedFact: 'Geographical Indications Registry accorded GI tag to Ramanathapuram Mundu Chilli on 24 October 2026.',
    actualFactFromPrimarySource: 'The Geographical Indications (GI) certificate for Ramanathapuram Mundu Chilli (Application No. 720) was officially granted in February 2023 (Certificate issued 22 February 2023). It is not an October 2026 development.',
    defectClassification: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
    quarantineReason: 'Historical GI recognition from February 2023 falsely presented as an October 2026 development.',
    quarantinedAt: '2026-10-25T13:50:00.000Z',
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
 * Checks if a candidate question, ID, document identifier, or claim text matches known quarantined misinformation.
 */
export function checkPersistentDefectRegistry(candidate: {
  id?: string;
  officialDocumentId?: string;
  sourceUrl?: string;
  question_en?: string;
  sourceExcerpt?: string;
}): DefectCheckResult {
  const normText = ((candidate.question_en || '') + ' ' + (candidate.sourceExcerpt || '')).toLowerCase();

  // 1. Check exact question ID or historical alias
  if (candidate.id) {
    const matchedById = PERMANENT_DEFECT_REGISTRY.find(
      (d) => d.questionId === candidate.id || (d.historicalAliases && d.historicalAliases.includes(candidate.id))
    );
    if (matchedById) {
      // Safety check: If candidate.id is one of the ambiguous legacy aliases (like ca_2026_draft_08, 14, 17, 19),
      // only trigger ID match if the question text or document actually relates to the defect subject!
      const isAmbiguousLegacyId = ['ca_2026_draft_04', 'ca_2026_draft_08', 'ca_2026_draft_14', 'ca_2026_draft_17', 'ca_2026_draft_19'].includes(candidate.id);
      
      if (!isAmbiguousLegacyId) {
        return {
          isDefect: true,
          record: matchedById,
          failureCode: 'KNOWN_DEFECT_RECYCLING_PROHIBITED',
          details: `Question ID ${candidate.id} is permanently quarantined: ${matchedById.quarantineReason}`,
        };
      }
    }
  }

  // 2. Check document number or URL match against defects
  for (const d of PERMANENT_DEFECT_REGISTRY) {
    if (candidate.officialDocumentId && candidate.officialDocumentId.includes(d.officialDocumentId)) {
      return {
        isDefect: true,
        record: d,
        failureCode: 'KNOWN_DEFECT_RECYCLING_PROHIBITED',
        details: `Official document identifier "${candidate.officialDocumentId}" matches quarantined defect: ${d.quarantineReason}`,
      };
    }

    if (candidate.sourceUrl && d.sourceUrl && candidate.sourceUrl === d.sourceUrl) {
      // Check if URL matches defect URL
      if (d.officialDocumentId === 'PIB PRID 2098813' || d.officialDocumentId === 'G.O. (Ms) No. 34 (SW&WE)') {
        return {
          isDefect: true,
          record: d,
          failureCode: 'KNOWN_DEFECT_RECYCLING_PROHIBITED',
          details: `Source URL "${candidate.sourceUrl}" points to quarantined defective publication: ${d.quarantineReason}`,
        };
      }
    }
  }

  // 3. Check for specific known factual misinformation strings in question or excerpt:
  
  // Trap A: Repo rate 5.50% claim in 2026
  if (normText.includes('repo rate') && normText.includes('5.50')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_03'),
      failureCode: 'FACTUAL_NUMERICAL_DISCREPANCY',
      details: 'Hallucinated claim: June 2026 RBI repo rate was 5.25%, not 5.50%.',
    };
  }

  // Trap B: ISRO SSLV-D3 launch in 2026 (actual launch was 16 August 2024)
  if (normText.includes('sslv-d3') && (normText.includes('eos-08') || normText.includes('launch'))) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_08'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Hallucinated claim: ISRO SSLV-D3/EOS-08 launch occurred on 16 August 2024, not in 2026.',
    };
  }

  // Trap C: Pudhumai Penn expansion to aided school students in 2026 (actual was G.O. Ms 34 31.07.2024)
  if (normText.includes('pudhumai penn') && (normText.includes('government-aided') || normText.includes('aided school'))) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_04'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Pre-2026 defect: Pudhumai Penn extension to aided school students was ordered in G.O. Ms 34 dated 31.07.2024 and launched August 2024.',
    };
  }

  // Trap D: EMC 2.0 Manallur and Pillapaikkam approval claimed as July 2026 (actual was 17 Dec 2025 PIB 2205046)
  if ((normText.includes('manallur') || normText.includes('pillapaikkam')) && (normText.includes('emc 2.0') || normText.includes('electronics manufacturing cluster')) && normText.includes('july 2026')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_07'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Temporal defect: Manallur and Pillapaikkam clusters approved 17 Dec 2025 (PIB PRID 2205046). July 2026 was only a retrospective Lok Sabha tabulation.',
    };
  }

  // Trap E: PM-KISAN 17th installment in 2026 (actual was 18 June 2024)
  if (normText.includes('pm-kisan') && (normText.includes('17th') || normText.includes('17 th'))) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_17'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Hallucinated claim: PM-KISAN 17th instalment was disbursed on 18 June 2024, not in 2026.',
    };
  }

  // Trap F: Maratha Military Landscapes in August 2026 (actual was 2024-2025)
  if (normText.includes('maratha military') && normText.includes('2026')) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_proto_19'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Pre-2026 defect: Maratha Military Landscapes was inscribed in 2024–2025, not August 2026.',
    };
  }

  // Trap G: Ramanathapuram Mundu Chilli GI registration claimed in 2026 (actual was February 2023)
  if ((normText.includes('ramanathapuram') || normText.includes('ramnad')) && (normText.includes('mundu') || normText.includes('chilli') || normText.includes('chili')) && (normText.includes('gi tag') || normText.includes('geographical indication'))) {
    return {
      isDefect: true,
      record: PERMANENT_DEFECT_REGISTRY.find((d) => d.questionId === 'ca_2026_defect_ramnad_chilli'),
      failureCode: 'PRE_2026_EVENT_IN_2026_PUBLICATION',
      details: 'Historical defect: Ramanathapuram Mundu Chilli received GI recognition in February 2023 (Application No. 720). Falsely presented as a 2026 development.',
    };
  }

  return { isDefect: false };
}
