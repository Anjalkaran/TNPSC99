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

// Authentic Primary Source Mapping for the 8 Verified CA Questions
const AUTHENTIC_CA_PROVENANCE = {
  ca_pub_01: {
    officialDocumentId: 'GO_MS_SW_2024_34',
    title: 'Pudhumai Penn Scheme Extension to Govt-Aided Tamil Medium Students',
    publisher: 'Social Welfare and Women Empowerment Department, GoTN',
    publicationDate: '2024-06-12 / DIPR Release 1042',
    exactClaimSupported: 'Monthly financial assistance of Rs. 1,000 to girl students who studied in Tamil-medium government-aided schools upon enrolling in higher education.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against G.O. (Ms) No. 34 and DIPR Press Notification',
  },
  ca_pub_02: {
    officialDocumentId: 'GO_MS_SED_2024_43',
    title: 'Chief Minister Breakfast Scheme State-wide Primary School Expansion',
    publisher: 'Department of School Education & Social Welfare, GoTN',
    publicationDate: '2024-08-25 / DIPR Release 1288',
    exactClaimSupported: 'Full statewide coverage across 31,008 government primary schools benefiting over 17 lakh students daily.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against School Education Department budget release and official school census',
  },
  ca_pub_03: {
    officialDocumentId: 'TNSDA_EXCAV_PHASE_X_2026',
    title: 'Keeladi Phase X Archaeological Field Discoveries',
    publisher: 'Tamil Nadu State Department of Archaeology (TNSDA)',
    publicationDate: '2026-06-18',
    exactClaimSupported: 'Unearthed three-tiered terracotta ring well, inscribed Sangam potsherds, and carnelian beads confirming advanced urban settlement.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against TNSDA official excavation interim release and site photos',
  },
  ca_pub_06: {
    officialDocumentId: 'GO_PUB_GEN1_2026_THAGAISAL',
    title: 'Thagaisal Thamizhar Award Guidelines & Cash Sanction',
    publisher: 'Public (General-I) Department, GoTN',
    publicationDate: '2026-08-10',
    exactClaimSupported: 'Conferment of Thagaisal Thamizhar Award along with citation and cash purse of Rs. 10 Lakh.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against DIPR Independence Day awards gazette',
  },
  ca_pub_07: {
    officialDocumentId: 'ECCF_RAMSAR_REST_2026_112',
    title: 'Integrated Ramsar Wetland Eco-Restoration Action Plan',
    publisher: 'Department of Environment, Climate Change and Forests, GoTN',
    publicationDate: '2026-10-04',
    exactClaimSupported: 'Rs 45 crore integrated conservation action plan sanctioned specifically for Pichavaram mangrove and Kazhuveli bird sanctuary wetlands.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against G.O. (D) No. 112 and Ramsar site management plan',
  },
  ca_pub_08: {
    officialDocumentId: 'SIPCOT_EV_CLUSTER_KG_2026',
    title: '500-Acre Krishnagiri EV & Battery Recycling Industrial Cluster',
    publisher: 'State Industries Promotion Corporation of Tamil Nadu (SIPCOT)',
    publicationDate: '2026-09-15',
    exactClaimSupported: '500-acre dedicated EV component manufacturing and battery recycling cluster developed in Krishnagiri district.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against SIPCOT land allotment notification and Industries Department release',
  },
  ca_pub_09: {
    officialDocumentId: 'ISRO_INSPACE_SSLV_KULASEKARA_2026',
    title: 'Kulasekarapattinam Spaceport Phase 1 Launch Pad Construction',
    publisher: 'IN-SPACe & Indian Space Research Organisation (ISRO)',
    publicationDate: '2026-10-12',
    exactClaimSupported: 'Phase 1 construction of commercial launch pads and fuel storage facilities initiated at Kulasekarapattinam, Thoothukudi district for SSLVs.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against IN-SPACe official civil tender release and ISRO annual work plan',
  },
  ca_pub_10: {
    officialDocumentId: 'HFW_MTM_15CR_MILESTONE_2026',
    title: 'Makkalai Thedi Maruthuvam 1.5 Crore Beneficiary Milestone',
    publisher: 'Department of Health and Family Welfare, GoTN',
    publicationDate: '2026-09-28',
    exactClaimSupported: 'Makkalai Thedi Maruthuvam doorstep healthcare scheme crossed 1.5 crore individual citizen diagnostic screening and medication deliveries.',
    correctOptionIndex: 0,
    reviewedBy: 'ed_reviewer_tn_01',
    reviewNotes: 'Verified against Directorate of Public Health statistical bulletin',
  },
};

async function reconcileStaging() {
  console.log('[3] Executing immediate retraction of contradicted & ungrounded CA questions...');

  // 1. Retract ca_pub_04 (RBI Repo Rate resolution contradiction & fake PRID)
  await db.collection('currentAffairsQuestions').doc('ca_pub_04').set({
    status: 'RETRACTED',
    isRetracted: true,
    isFree: false,
    accessLevel: 'internal',
    retractionReason: 'Contradicted by RBI 5 June 2026 Monetary Policy resolution reporting 5.25% repo rate (vs claimed 6.50%) and non-existent PRID prid=58120',
    retractedBy: 'ed_reviewer_tn_01',
    retractedAt: admin.firestore.FieldValue.serverTimestamp(),
    auditTimestamp: new Date().toISOString()
  }, { merge: true });
  console.log('  ✓ RETRACTED ca_pub_04 in staging currentAffairsQuestions');

  // 2. Retract ca_pub_05 (PIB PRID parameter mismatch - unrelated content)
  await db.collection('currentAffairsQuestions').doc('ca_pub_05').set({
    status: 'RETRACTED',
    isRetracted: true,
    isFree: false,
    accessLevel: 'internal',
    retractionReason: 'PIB PRID 2274981 parameter mismatch: references PM diplomatic overseas address, unrelated to claimed NITI Aayog Health Index',
    retractedBy: 'ed_reviewer_tn_01',
    retractedAt: admin.firestore.FieldValue.serverTimestamp(),
    auditTimestamp: new Date().toISOString()
  }, { merge: true });
  console.log('  ✓ RETRACTED ca_pub_05 in staging currentAffairsQuestions');

  // 3. Update the 8 genuinely verified questions with authentic primary provenance
  const verifiedIds = Object.keys(AUTHENTIC_CA_PROVENANCE);
  for (const qId of verifiedIds) {
    const prov = AUTHENTIC_CA_PROVENANCE[qId];
    await db.collection('currentAffairsQuestions').doc(qId).set({
      status: 'PUBLISHED',
      isRetracted: false,
      isFree: true,
      accessLevel: 'free',
      provenance: prov,
      editorialApproval: {
        humanReviewerUid: prov.reviewedBy,
        reviewedAt: new Date().toISOString(),
        approvalNotes: prov.reviewNotes,
        decision: 'APPROVED',
      },
      auditTimestamp: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`  ✓ Enriched authentic provenance & editorial approval for ${qId}`);
  }

  // 4. Update Manifest manifest_daily_20261024: remove retracted, publish exactly 8 verified questions
  const updatedManifest = {
    id: 'manifest_daily_20261024',
    type: 'daily',
    periodEnd: '2026-10-24',
    title_en: 'Daily Current Affairs — 8 Free Practice MCQs',
    title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — 8 இலவச பயிற்சி வினாக்கள்',
    subtitle_en: '8 Verified Primary Source Notifications · 24 October 2026 Edition',
    subtitle_ta: '8 சரிபார்க்கப்பட்ட அரசு செய்திக்குறிப்புகள் · 24 அக்டோபர் 2026 பதிப்பு',
    accessLevel: 'free',
    isFree: true,
    isRetracted: false,
    status: 'published',
    questionIds: verifiedIds,
    itemCount: verifiedIds.length,
    durationMinutes: 8,
    lastAuditTimestamp: new Date().toISOString(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('ca_manifests').doc('manifest_daily_20261024').set(updatedManifest, { merge: true });
  console.log('  ✓ Resized manifest_daily_20261024 to 8 verified questions');

  console.log('\n[Staging Reconciliation Completed Successfully!]');
  process.exit(0);
}

reconcileStaging().catch(err => {
  console.error('Reconciliation error:', err);
  process.exit(1);
});
