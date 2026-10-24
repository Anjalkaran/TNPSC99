/**
 * TNPSC99 — Mandatory 2026-Only Current Affairs Policy Test Suite
 * 
 * Verifies all 7 Mandatory Validation Scenarios:
 * 1. Genuine 2026 event -> Eligible
 * 2. Pre-2026 event -> Rejected
 * 3. Older scheme with verified 2026 amendment -> Eligible for amendment-specific question
 * 4. 2026 article describing 2024 event -> Rejected
 * 5. Missing or ambiguous event date -> Held as REVIEW_REQUIRED
 * 6. No approved 2026 records -> Tier 3 Editorial Fallback (Exact strings)
 * 7. Previous 2026 verified edition -> Tier 2 Revision Fallback (Original date + Revision notice)
 * + Six-month historical bank window check (23-04-2026 to 23-10-2026)
 * + Preservation in General Studies / Historical Knowledge without relabeling
 */

import { TemporalEligibilityValidator } from '../src/lib/accuracy/temporal-validator';
import { DailyCaAccuracyGuard, DailyCaCandidateEdition } from '../src/lib/accuracy/daily-ca-accuracy-guard';
import { QuestionAccuracyCandidate } from '../src/lib/accuracy/types';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function recordTest(id: string, name: string, passed: boolean, details: string) {
  testResults.push({ id, name, passed, details });
  const mark = passed ? '[✓ PASS]' : '[✗ FAIL]';
  console.log(`${mark} (${id}) -> ${name}`);
  console.log(`       Details: ${details}`);
}

async function runTemporalSuite() {
  console.log('========================================================================');
  console.log('TNPSC99 — MANDATORY 2026-ONLY CURRENT AFFAIRS POLICY TEST SUITE');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  const baselineValid2026Candidate: QuestionAccuracyCandidate = {
    id: 'ca_test_2026_01',
    category: 'Current Affairs',
    category_ta: 'நடப்பு நிகழ்வுகள்',
    question_en: 'Which district of Tamil Nadu hosted the state bio-diversity summit on 12 June 2026?',
    question_ta: '12 ஜூன் 2026 அன்று தமிழ்நாடு மாநில பல்லுயிர் உச்சி மாநாட்டை நடத்திய மாவட்டம் எது?',
    options_en: ['Coimbatore', 'Chennai', 'Madurai', 'Salem'],
    options_ta: ['கோயம்புத்தூர்', 'சென்னை', 'மதுரை', 'சேலம்'],
    correctOptionIndex: 0,
    explanation_en: 'The Tamil Nadu State Biodiversity Board hosted the annual summit in Coimbatore on 12 June 2026.',
    explanation_ta: 'தமிழ்நாடு மாநில பல்லுயிர் வாரியம் தனது வருடாந்திர உச்சி மாநாட்டை 12 ஜூன் 2026 அன்று கோயம்புத்தூரில் நடத்தியது.',
    sourceUrl: 'https://www.tn.gov.in/pressrelease/2026/06/coimbatore-biodiversity-summit',
    sourcePublisher: 'Tamil Nadu DIPR',
    sourceExcerpt: 'Coimbatore hosted the state bio-diversity summit on 12 June 2026 with over 500 delegates.',
    eventDate: '2026-06-12',
    publicationDate: '2026-06-13',
    isCurrentAffairs: true,
    editorialApproval: {
      approvedBy: 'admin_reviewer_uid_101',
      approvedAt: '2026-06-14T10:00:00Z',
      notes: 'Verified against DIPR Release 842',
    },
    isRetracted: false,
    isQuarantined: false,
    status: 'PUBLISHED',
  };

  // -------------------------------------------------------------------------
  // TEST 1: Genuine 2026 Event -> Eligible
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Genuine 2026 Event ---');
  const res1 = TemporalEligibilityValidator.validate(baselineValid2026Candidate);
  const t1Passed = res1.eligible === true && res1.targetStatus === 'SOURCE_VERIFIED' && res1.isWithin2026Cycle === true;
  recordTest('TC-TEMP-01', 'Genuine 2026 event is eligible', t1Passed,
    `Eligible: ${res1.eligible}, TargetStatus: ${res1.targetStatus}, Details: ${res1.details}`);

  // -------------------------------------------------------------------------
  // TEST 2: Pre-2026 Event -> Rejected
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Pre-2026 Event ---');
  const pre2026Candidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_pre2026',
    eventDate: '2023-08-25',
    publicationDate: '2023-08-26',
  };
  const res2 = TemporalEligibilityValidator.validate(pre2026Candidate);
  const t2Passed = res2.eligible === false && res2.targetStatus === 'REJECTED' && res2.defectCode === 'PRE_2026_EVENT';
  recordTest('TC-TEMP-02', 'Pre-2026 event is rejected', t2Passed,
    `Eligible: ${res2.eligible}, TargetStatus: ${res2.targetStatus}, DefectCode: ${res2.defectCode}`);

  // -------------------------------------------------------------------------
  // TEST 3: Older Scheme with Verified 2026 Amendment -> Eligible for Amendment-Specific Question
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Older Scheme with Verified 2026 Amendment ---');
  // Sub-case A: Explicitly tests the 2026 amendment/milestone
  const olderSchemeWith2026Amendment: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_scheme_amended_2026',
    question_en: 'Under the May 2026 budgetary amendment to the Chief Ministers Breakfast Scheme, which new nutritional items were sanctioned?',
    question_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டத்திற்கான மே 2026 பட்ஜெட் திருத்தத்தின் கீழ் அனுமதிக்கப்பட்ட புதிய ஊட்டச்சத்து உணவுகள் எவை?',
    eventDate: '2026-05-18',
    publicationDate: '2026-05-19',
    olderSchemeContext: {
      schemeOriginYear: 2022, // Originated in 2022
      has2026Amendment: true,
      amendmentDate: '2026-05-18',
      tests2026DevelopmentExplicitly: true,
      amendmentDetails: 'May 2026 expansion sanctioned millet-based nutritional supplement.',
    },
  };
  const res3A = TemporalEligibilityValidator.validate(olderSchemeWith2026Amendment);
  const t3APassed = res3A.eligible === true && res3A.isOlderSchemeWith2026Amendment === true;

  // Sub-case B: Older scheme question merely tests pre-2026 historical fact -> REJECTED
  const olderSchemeHistoricalOnly: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_scheme_historical_fact',
    question_en: 'In which year was the Chief Ministers Breakfast Scheme first piloted in Madurai?',
    question_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டம் முதன்முதலில் மதுரையில் எந்த ஆண்டு தொடங்கப்பட்டது?',
    eventDate: '2022-09-15',
    publicationDate: '2026-05-19',
    olderSchemeContext: {
      schemeOriginYear: 2022,
      has2026Amendment: true,
      tests2026DevelopmentExplicitly: false, // Does NOT test 2026 development
    },
  };
  const res3B = TemporalEligibilityValidator.validate(olderSchemeHistoricalOnly);
  const t3BPassed = res3B.eligible === false && res3B.targetStatus === 'REJECTED' && res3B.defectCode === 'OLDER_SCHEME_TESTS_PRE_2026_FACT';

  recordTest('TC-TEMP-03', 'Older scheme with 2026 amendment eligibility & historical fact rejection',
    t3APassed && t3BPassed,
    `Amendment-Specific Eligible: ${t3APassed}, Pre-2026 Fact Rejected: ${t3BPassed} (DefectCode: ${res3B.defectCode})`);

  // -------------------------------------------------------------------------
  // TEST 4: 2026 Article Describing 2024 Event -> Rejected
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: 2026 Article Describing 2024 Event ---');
  const recentArticleHistoricalEvent: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_article_2026_event_2024',
    eventDate: '2024-08-09', // Real launch in August 2024
    publicationDate: '2026-05-10', // Synthesized or retrospective 2026 article
  };
  const res4 = TemporalEligibilityValidator.validate(recentArticleHistoricalEvent);
  const t4Passed = res4.eligible === false && res4.targetStatus === 'REJECTED' && res4.defectCode === 'PRE_2026_EVENT_IN_2026_PUBLICATION';
  recordTest('TC-TEMP-04', '2026 article describing 2024 event is rejected', t4Passed,
    `Eligible: ${res4.eligible}, TargetStatus: ${res4.targetStatus}, DefectCode: ${res4.defectCode}`);

  // -------------------------------------------------------------------------
  // TEST 5: Missing or Ambiguous Event Date -> Held (REVIEW_REQUIRED)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Missing or Ambiguous Event Date ---');
  // Sub-case A: Missing event date
  const missingDateCandidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_missing_date',
    eventDate: undefined,
  };
  const res5A = TemporalEligibilityValidator.validate(missingDateCandidate);
  const t5APassed = res5A.eligible === false && res5A.targetStatus === 'REVIEW_REQUIRED' && res5A.defectCode === 'MISSING_OR_AMBIGUOUS_EVENT_DATE';

  // Sub-case B: Ambiguous non-ISO date string
  const ambiguousDateCandidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_ambiguous_date',
    eventDate: 'sometime in early 2026',
  };
  const res5B = TemporalEligibilityValidator.validate(ambiguousDateCandidate);
  const t5BPassed = res5B.eligible === false && res5B.targetStatus === 'REVIEW_REQUIRED' && res5B.defectCode === 'MISSING_OR_AMBIGUOUS_EVENT_DATE';

  recordTest('TC-TEMP-05', 'Missing or ambiguous event date held for review',
    t5APassed && t5BPassed,
    `Missing Date Held: ${t5APassed}, Ambiguous Date Held: ${t5BPassed}`);

  // -------------------------------------------------------------------------
  // TEST 6: No Approved 2026 Records -> Tier 3 Editorial Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: No Approved 2026 Records (Tier 3 Fallback) ---');
  const emptyEditions: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [], // Today has 0 approved questions
    },
    {
      editionDate: '2026-10-23',
      questions: [pre2026Candidate], // Previous edition had only pre-2026 ungrounded questions
    },
  ];

  const fallbackResult = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', emptyEditions);
  const t6Passed =
    fallbackResult.hasApprovedEdition === false &&
    fallbackResult.status === 'EDITORIAL_REVIEW_IN_PROGRESS' &&
    fallbackResult.tier === 'EDITORIAL_VERIFICATION_IN_PROGRESS' &&
    fallbackResult.message === '2026 Current Affairs — Editorial Verification in Progress.' &&
    fallbackResult.message_ta === '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.' &&
    fallbackResult.package === null &&
    fallbackResult.verifiedCount === 0;

  recordTest('TC-TEMP-06', 'No approved 2026 records triggers Tier 3 Editorial Fallback', t6Passed,
    `HasApproved: ${fallbackResult.hasApprovedEdition}, Tier: ${fallbackResult.tier}, Message EN: "${fallbackResult.message}", Message TA: "${fallbackResult.message_ta}"`);

  // -------------------------------------------------------------------------
  // TEST 7: Previous 2026 Verified Edition -> Tier 2 Revision Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Previous 2026 Verified Edition (Tier 2 Revision Fallback) ---');
  const editionsWithPreviousApproved: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [], // Today has 0 approved questions
    },
    {
      editionDate: '2026-10-23',
      questions: [baselineValid2026Candidate], // Yesterday has 1 authentic verified 2026 question
      title_en: 'Daily Current Affairs — 23 October 2026 Edition',
      title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — 23 அக்டோபர் 2026 பதிப்பு',
    },
  ];

  const revisionResult = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', editionsWithPreviousApproved);
  const t7Passed =
    revisionResult.hasApprovedEdition === true &&
    revisionResult.status === 'PUBLISHED' &&
    revisionResult.tier === 'REVISION_FALLBACK' &&
    revisionResult.isRevision === true &&
    revisionResult.editionDate === '2026-10-23' &&
    revisionResult.originalEditionDate === '2026-10-23' &&
    revisionResult.revisionNotice_en === 'Revision Practice — 2026-10-23 Edition' &&
    revisionResult.revisionNotice_ta === 'மீள்பார்வைப் பயிற்சி — 2026-10-23 பதிப்பு' &&
    revisionResult.package !== null &&
    revisionResult.package.title_en.includes('Revision Practice');

  recordTest('TC-TEMP-07', 'Previous 2026 verified edition triggers Tier 2 Revision Fallback with original date', t7Passed,
    `HasApproved: ${revisionResult.hasApprovedEdition}, Tier: ${revisionResult.tier}, Original Date: ${revisionResult.originalEditionDate}, Revision Notice: "${revisionResult.revisionNotice_en}"`);

  // -------------------------------------------------------------------------
  // TEST 8: Six-Month Historical Bank Window Check (23-04-2026 to 23-10-2026)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Six-Month Historical Bank Window Check ---');
  // Event from 15 Feb 2026 (Valid for 2026 full cycle, but outside 6-month window 23-04-2026)
  const feb2026Candidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_feb_2026',
    eventDate: '2026-02-15',
  };

  const cycleRes = TemporalEligibilityValidator.validate(feb2026Candidate, { enforceSixMonthWindow: false });
  const sixMonthRes = TemporalEligibilityValidator.validate(feb2026Candidate, { enforceSixMonthWindow: true });
  const t8Passed =
    cycleRes.eligible === true &&
    sixMonthRes.eligible === false &&
    sixMonthRes.defectCode === 'OUTSIDE_SIX_MONTH_WINDOW';

  recordTest('TC-TEMP-08', 'Six-month historical bank window enforcement', t8Passed,
    `Full Cycle Eligible: ${cycleRes.eligible}, Six-Month Bank Enforced: ${sixMonthRes.eligible} (DefectCode: ${sixMonthRes.defectCode})`);

  // -------------------------------------------------------------------------
  // TEST 9: Preservation in General Studies / Historical Knowledge (Rule 8)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Preservation in General Studies (Anti-Relabeling Rule 8) ---');
  const reclassified = TemporalEligibilityValidator.reclassifyToGeneralStudies(pre2026Candidate);
  const t9Passed =
    reclassified.isCurrentAffairs === false &&
    reclassified.category === 'General Studies — Historical Knowledge' &&
    reclassified.category_ta === 'பொது அறிவு — வரலாற்றுப் பாடப்பிரிவு' &&
    reclassified.eventDate === '2023-08-25'; // Original historical date strictly preserved

  recordTest('TC-TEMP-09', 'Preservation in General Studies without relabeling', t9Passed,
    `isCurrentAffairs: ${reclassified.isCurrentAffairs}, Category: "${reclassified.category}", EventDate Preserved: ${reclassified.eventDate}`);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEMPORAL POLICY TEST SUMMARY');
  console.log('========================================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;
  console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('STATUS: MANDATORY 2026-ONLY CURRENT AFFAIRS POLICY FULLY CERTIFIED!\n');
    process.exit(0);
  } else {
    console.log('STATUS: SOME TEMPORAL INVARIANT CHECKS FAILED!\n');
    process.exit(1);
  }
}

runTemporalSuite();
