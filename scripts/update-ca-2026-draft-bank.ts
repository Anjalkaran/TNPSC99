import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../src/data/ca-2026-draft-bank.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update Question 7: ca_2026_draft_07
const q7Old = `    editorialApproval: null,
    isRetracted: false,
    isQuarantined: false,
    status: 'SOURCE_VERIFIED',
  },

  // ---------------------------------------------------------------------------
  // Question 8: GI Tag for Thooyamalli Rice`;

const q7New = `    editorialApproval: null,
    isRetracted: true,
    isQuarantined: true,
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: Substantive approval occurred on 17 December 2025 (PIB PRID 2205046). Retrospectively tabled in Parliament on 22 July 2026 (PIB PRID 2287658). Question stem portrays 2025 approval as a July 2026 event.',
    status: 'REJECTED',
  },

  // ---------------------------------------------------------------------------
  // Question 8: GI Tag for Thooyamalli Rice`;

content = content.replace(q7Old.replace(/\r?\n/g, '\r\n'), q7New.replace(/\r?\n/g, '\r\n'));

// 2. Update Question 8: Thooyamalli Rice (restore clean SOURCE_VERIFIED status)
const q8Old = `    editorialApproval: null,
    isRetracted: true,
    isQuarantined: true,
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: ISRO SSLV-D3/EOS-08 launched on 16 August 2024, not July 2026.',
    status: 'REJECTED',
    publicationMode: 'MANUAL_APPROVED' as any,
  },

  // ---------------------------------------------------------------------------
  // Question 9: Organic Palmyra Jaggery Export`;

const q8New = `    editorialApproval: null,
    isRetracted: false,
    isQuarantined: false,
    status: 'SOURCE_VERIFIED',
  },

  // ---------------------------------------------------------------------------
  // Question 9: Organic Palmyra Jaggery Export`;

content = content.replace(q8Old.replace(/\r?\n/g, '\r\n'), q8New.replace(/\r?\n/g, '\r\n'));

// 3. Update Question 14: 29th NTCA Meeting CASFOS Coimbatore (restore clean SOURCE_VERIFIED status)
const q14Old = `    editorialApproval: null,
    isRetracted: true,
    isQuarantined: true,
    quarantineReason: 'DOCUMENT_CONTENT_MISMATCH: PIB PRID 2274981 concerns PM address in France, not NITI Aayog Health Index.',
    status: 'REJECTED',
    publicationMode: 'MANUAL_APPROVED' as any,
  },

  // ---------------------------------------------------------------------------
  // Question 15: GEF-UNDP Sathyamangalam Project`;

const q14New = `    editorialApproval: null,
    isRetracted: false,
    isQuarantined: false,
    status: 'SOURCE_VERIFIED',
  },

  // ---------------------------------------------------------------------------
  // Question 15: GEF-UNDP Sathyamangalam Project`;

content = content.replace(q14Old.replace(/\r?\n/g, '\r\n'), q14New.replace(/\r?\n/g, '\r\n'));

// 4. Update Question 17: NLCIL 70th Raising Day Postal Cover (restore clean SOURCE_VERIFIED status)
const q17Old = `    editorialApproval: null,
    isRetracted: true,
    isQuarantined: true,
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: PM-KISAN 17th instalment was released on 18 June 2024, not April 2026.',
    status: 'REJECTED',
    publicationMode: 'MANUAL_APPROVED' as any,
  },

  // ---------------------------------------------------------------------------
  // Question 18: Wind Power Capacity Ranking`;

const q17New = `    editorialApproval: null,
    isRetracted: false,
    isQuarantined: false,
    status: 'SOURCE_VERIFIED',
  },

  // ---------------------------------------------------------------------------
  // Question 18: Wind Power Capacity Ranking`;

content = content.replace(q17Old.replace(/\r?\n/g, '\r\n'), q17New.replace(/\r?\n/g, '\r\n'));

// 5. Update Question 19: Madurai Airport International Status (restore clean SOURCE_VERIFIED status)
const q19Old = `    editorialApproval: null,
    isRetracted: true,
    isQuarantined: true,
    quarantineReason: 'PRE_2026_EVENT_IN_2026_PUBLICATION: UNESCO inscribed Maratha Military Landscapes in 2025, not August 2026.',
    status: 'REJECTED',
    publicationMode: 'MANUAL_APPROVED' as any,
  },

  // ---------------------------------------------------------------------------
  // Question 20: RISE Conclave 2026 in Chennai`;

const q19New = `    editorialApproval: null,
    isRetracted: false,
    isQuarantined: false,
    status: 'SOURCE_VERIFIED',
  },

  // ---------------------------------------------------------------------------
  // Question 20: RISE Conclave 2026 in Chennai`;

content = content.replace(q19Old.replace(/\r?\n/g, '\r\n'), q19New.replace(/\r?\n/g, '\r\n'));

// 6. In getCa2026DraftCandidates, pass officialDocumentId
const mapOld = `  return CA_2026_DRAFT_MCQ_BANK.map((q) => ({
    id: q.id,`;
const mapNew = `  return CA_2026_DRAFT_MCQ_BANK.map((q) => ({
    id: q.id,
    officialDocumentId: q.officialDocumentId,`;

content = content.replace(mapOld.replace(/\r?\n/g, '\r\n'), mapNew.replace(/\r?\n/g, '\r\n'));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated ca-2026-draft-bank.ts!');
