const admin = require('firebase-admin');
const { execSync } = require('child_process');

console.log('[1] Fetching staging key from secret manager...');
const privateKey = execSync('gcloud.cmd secrets versions access latest --secret=FIREBASE_PRIVATE_KEY --project=tnpsc99-staging', { encoding: 'utf8' }).trim();
console.log('[2] Initializing Firebase Admin for tnpsc99-staging...');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'tnpsc99-staging',
      clientEmail: 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com',
      privateKey,
    })
  });
}

const db = admin.firestore();

// Exact primary-source audit records & quarantine reasons
const QUARANTINED_CA_ITEMS = {
  ca_pub_01: {
    officialDocumentId: 'GO_MS_SW_2024_34',
    title: 'Pudhumai Penn Scheme Extension to Govt-Aided Tamil Medium Students',
    publisher: 'Social Welfare and Women Empowerment Department, GoTN',
    publicationDate: '2024-07-31 / DIPR Launch 2024-08-09',
    historicalDiscrepancy: 'Extension occurred in 2024–25 academic year (G.O. Ms No. 34 dated 31.07.2024, launched Aug 9, 2024). No genuine May 2026 event exists; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: 2024 event misrepresented as May 2026 announcement; synthetic URL.',
  },
  ca_pub_02: {
    officialDocumentId: 'GO_MS_SED_2023_43',
    title: 'Chief Minister Breakfast Scheme State-wide Primary School Expansion',
    publisher: 'Department of School Education & Social Welfare, GoTN',
    publicationDate: '2023-08-25',
    historicalDiscrepancy: 'Full statewide expansion to 31,008 primary schools occurred on August 25, 2023 at Thirukkuvalai. Not a July 2026 event; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: 2023 event misrepresented as July 2026 announcement; synthetic URL.',
  },
  ca_pub_03: {
    officialDocumentId: 'TNSDA_KEELADI_PHASE_X_2024',
    title: 'Keeladi Phase X Excavation Launch & Historical Terracotta Wells',
    publisher: 'Tamil Nadu State Department of Archaeology (TNSDA)',
    publicationDate: '2024-06-18',
    historicalDiscrepancy: 'Phase X was inaugurated on June 18, 2024. Terracotta ring wells were excavated in earlier phases (Phases VI–VIII 2020–2022). Not a June 2026 event; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: 2020–2024 discoveries misrepresented as June 2026 event; synthetic URL.',
  },
  ca_pub_06: {
    officialDocumentId: 'GO_MS_PUB_GEN1_2021_658',
    title: 'Thagaisal Thamizhar Award Creation & Rs 10 Lakh Purse',
    publisher: 'Public (General-I) Department, GoTN',
    publicationDate: '2021-07-28',
    historicalDiscrepancy: 'Award instituted on July 28, 2021 with Rs 10 Lakh prize. No new prize alteration or event in August 2026; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: 2021 statutory award scheme presented as August 2026 Current Affairs; synthetic URL.',
  },
  ca_pub_07: {
    officialDocumentId: 'UNVERIFIED_ECCF_2026',
    title: 'Pichavaram & Kazhuveli Ramsar Wetland Eco-Restoration Plan',
    publisher: 'Department of Environment, Climate Change and Forests, GoTN',
    publicationDate: 'Unverified / Synthetic',
    historicalDiscrepancy: 'No verifiable archived Government Order or canonical DIPR PDF for joint Rs 45 Cr plan at cited URL.',
    quarantineReason: 'Unverified primary source: cited URL is synthetic and lacks canonical archived G.O. PDF.',
  },
  ca_pub_08: {
    officialDocumentId: 'UNVERIFIED_SIPCOT_2026',
    title: 'SIPCOT 500-Acre Krishnagiri EV Industrial Park',
    publisher: 'State Industries Promotion Corporation of Tamil Nadu',
    publicationDate: 'Unverified / Synthetic',
    historicalDiscrepancy: 'Press release URL lacks verifiable Government Order document number and archived PDF link.',
    quarantineReason: 'Unverified primary source: lacks canonical G.O. document number or verified SIPCOT board order.',
  },
  ca_pub_09: {
    officialDocumentId: 'ISRO_INSPACE_SSLV_2024',
    title: 'Kulasekarapattinam Spaceport Foundation Stone & Land Handover',
    publisher: 'IN-SPACe & ISRO',
    publicationDate: '2024-02-28',
    historicalDiscrepancy: 'Foundation stone laid by Prime Minister Narendra Modi on February 28, 2024. Not an October 2026 event; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: February 2024 event misrepresented as October 2026 milestone; synthetic URL.',
  },
  ca_pub_10: {
    officialDocumentId: 'HFW_MTM_MILESTONES_2023',
    title: 'Makkalai Thedi Maruthuvam 1.5 Crore Milestone History',
    publisher: 'Department of Health and Family Welfare, GoTN',
    publicationDate: '2023/2024',
    historicalDiscrepancy: '1.0 crore milestone was reached in Dec 2022; 1.5 crore reached in 2023/2024. Not late 2026; cited URL is synthetic.',
    quarantineReason: 'Historical temporal discrepancy: 2023/2024 milestone presented as late 2026 achievement; synthetic URL.',
  },
};

async function reconcileStaging() {
  console.log('[3] Executing Final Primary-Source Evidence Lock on tnpsc99-staging...');

  // 1. Maintain RETRACTED status for ca_pub_04
  await db.collection('currentAffairsQuestions').doc('ca_pub_04').set({
    status: 'RETRACTED',
    isRetracted: true,
    isQuarantined: true,
    isFree: false,
    accessLevel: 'internal',
    retractionReason: 'Contradicted by RBI 5 June 2026 Monetary Policy resolution reporting 5.25% repo rate (vs claimed 6.50%) and non-existent PRID prid=58120',
    retractedBy: 'ed_reviewer_tn_01',
    retractedAt: admin.firestore.FieldValue.serverTimestamp(),
    auditTimestamp: new Date().toISOString()
  }, { merge: true });
  console.log('  ✓ RETRACTED ca_pub_04 (RBI Repo Rate resolution contradiction)');

  // 2. Maintain RETRACTED status for ca_pub_05
  await db.collection('currentAffairsQuestions').doc('ca_pub_05').set({
    status: 'RETRACTED',
    isRetracted: true,
    isQuarantined: true,
    isFree: false,
    accessLevel: 'internal',
    retractionReason: 'PIB PRID 2274981 parameter mismatch: references PM diplomatic overseas address, unrelated to claimed NITI Aayog Health Index',
    retractedBy: 'ed_reviewer_tn_01',
    retractedAt: admin.firestore.FieldValue.serverTimestamp(),
    auditTimestamp: new Date().toISOString()
  }, { merge: true });
  console.log('  ✓ RETRACTED ca_pub_05 (PIB PRID parameter mismatch)');

  // 3. Quarantine the remaining 8 CA questions due to historical temporal discrepancies or unverified URLs
  const quarantinedIds = Object.keys(QUARANTINED_CA_ITEMS);
  for (const qId of quarantinedIds) {
    const item = QUARANTINED_CA_ITEMS[qId];
    await db.collection('currentAffairsQuestions').doc(qId).set({
      status: 'REJECTED',
      isRetracted: false,
      isQuarantined: true,
      isFree: false,
      accessLevel: 'internal',
      quarantineReason: item.quarantineReason,
      historicalDiscrepancy: item.historicalDiscrepancy,
      evidenceAudit: {
        officialDocumentId: item.officialDocumentId,
        title: item.title,
        publisher: item.publisher,
        publicationDate: item.publicationDate,
        auditedBy: 'ed_reviewer_tn_01',
        auditedAt: new Date().toISOString(),
        decision: 'QUARANTINED_NON_ELIGIBLE_FOR_2026_EDITION',
      },
      auditTimestamp: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`  ✓ QUARANTINED ${qId} -> ${item.quarantineReason}`);
  }

  // 4. Update Daily Manifest: Exactly 0 questions approved; report review in progress
  const updatedManifest = {
    id: 'manifest_daily_20261024',
    type: 'daily',
    periodEnd: '2026-10-24',
    title_en: 'Daily Current Affairs — Editorial Review in Progress',
    title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — ஆசிரியர் குழு சரிபார்ப்பு',
    subtitle_en: 'Undergoing Verification Against Tamil Nadu Government Gazettes · 24 October 2026',
    subtitle_ta: 'அரசு அரசிதழ் சரிபார்ப்பு நிலையில் உள்ளது · 24 அக்டோபர் 2026',
    accessLevel: 'free',
    isFree: true,
    isRetracted: false,
    status: 'published',
    questionIds: [], // Fail-closed: 0 verified questions
    itemCount: 0,
    durationMinutes: 0,
    editorialNotes: 'All 10 preliminary items quarantined/retracted due to temporal discrepancies (events from 2021-2024) or lacking canonical G.O. PDFs. Zero filler questions fabricated under Zero-Compromise Accuracy Policy.',
    lastAuditTimestamp: new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('ca_manifests').doc('manifest_daily_20261024').set(updatedManifest, { merge: true });
  console.log('  ✓ Set manifest_daily_20261024 to 0 questions (Fail-closed Editorial Review in Progress)');

  console.log('\n[Staging Primary-Source Evidence Lock Reconciled Successfully!]');
  process.exit(0);
}

reconcileStaging().catch(err => {
  console.error('Reconciliation error:', err);
  process.exit(1);
});
