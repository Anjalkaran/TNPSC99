/**
 * TNPSC99 — Mandatory 2026-Only Current Affairs Policy Test Suite
 * 
 * Verifies all Mandatory Requirements and Safeguards:
 * 1. Genuine 2026 event -> Eligible
 * 2. Pre-2026 event -> Rejected (PRE_2026_EVENT)
 * 3. Older scheme with verified 2026 amendment -> Eligible for amendment-specific question
 * 4. 2026 article describing 2024 event -> Rejected (PRE_2026_EVENT_IN_2026_PUBLICATION)
 * 5. Missing or ambiguous event date -> Held as REVIEW_REQUIRED
 * 6. Dynamic Rolling 6-month window with day-of-month clamping & 2026-01-01 bounding
 * 7. Calendar legitimacy & Leap Year parsing (e.g. 2026-02-29 rejected, 2024-02-29 parsed)
 * 8. Asia/Kolkata timezone calendar-day transitions (UTC+05:30)
 * 9. December 2026 boundary and 2027 cycle rollover archiving
 * 10. Strict prohibition of automatic reclassification & blocking retracted items
 * 11. Three-tier fallback engine:
 *     - Tier 1: Today's approved edition
 *     - Tier 2: Previous approved 2026 edition (Revision practice badge & original date)
 *     - Tier 3: Editorial verification fallback (Exact EN/TA strings)
 * 12. Retraction invariant: Retracted/disputed questions strictly excluded from fallback
 */

import {
  TemporalEligibilityValidator,
  calculateRollingSixMonthWindow,
  isValidCalendarDate,
  isLeapYear,
  getAsiaKolkataDateString,
  IndependentReclassificationReview,
} from '../src/lib/accuracy/temporal-validator';
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
  console.log('TNPSC99 — MANDATORY 2026-ONLY CURRENT AFFAIRS POLICY COMPREHENSIVE TEST SUITE');
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
    actualRetrievedEvidence: {
      sourceUrl: 'https://www.tn.gov.in/pressrelease/2026/06/coimbatore-biodiversity-summit',
      officialDocumentId: 'DIPR Release 842',
      documentTitle: 'State Bio-diversity Summit at Coimbatore',
      issuingAuthority: 'Tamil Nadu DIPR',
      publicationDate: '2026-06-13',
      eventDate: '2026-06-12',
      httpStatus: 200,
      retrievalStatus: 'RETRIEVED_HTTP_200',
      retrievedAt: '2026-06-13T12:00:00.000Z',
      contentHashSha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      evidenceLocation: {
        startChar: 0,
        endChar: 88,
        matchedText: 'coimbatore hosted the state bio-diversity summit on 12 june 2026 with over 500 delegates',
      },
    },
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
  const olderSchemeWith2026Amendment: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_scheme_amended_2026',
    question_en: 'Under the May 2026 budgetary amendment to the Chief Ministers Breakfast Scheme, which new nutritional items were sanctioned?',
    question_ta: 'முதலமைச்சரின் காலை உணவுத் திட்டத்திற்கான மே 2026 பட்ஜெட் திருத்தத்தின் கீழ் அனுமதிக்கப்பட்ட புதிய ஊட்டச்சத்து உணவுகள் எவை?',
    eventDate: '2026-05-18',
    publicationDate: '2026-05-19',
    olderSchemeContext: {
      schemeOriginYear: 2022,
      has2026Amendment: true,
      amendmentDate: '2026-05-18',
      tests2026DevelopmentExplicitly: true,
      amendmentDetails: 'May 2026 expansion sanctioned millet-based nutritional supplement.',
    },
  };
  const res3A = TemporalEligibilityValidator.validate(olderSchemeWith2026Amendment);
  const t3APassed = res3A.eligible === true && res3A.isOlderSchemeWith2026Amendment === true;

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
      tests2026DevelopmentExplicitly: false,
    },
  };
  const res3B = TemporalEligibilityValidator.validate(olderSchemeHistoricalOnly);
  const t3BPassed = res3B.eligible === false && res3B.targetStatus === 'REJECTED' && res3B.defectCode === 'OLDER_SCHEME_TESTS_PRE_2026_FACT';

  recordTest('TC-TEMP-03', 'Older scheme with 2026 amendment eligibility & historical fact rejection',
    t3APassed && t3BPassed,
    `Amendment-Specific Eligible: ${t3APassed}, Pre-2026 Fact Rejected: ${t3BPassed} (DefectCode: ${res3B.defectCode})`);

  // -------------------------------------------------------------------------
  // TEST 4: 2026 Article Describing Pre-2026 Event -> Rejected
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: 2026 Article Describing Pre-2026 Event ---');
  const recentArticleHistoricalEvent: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_article_2026_event_2024',
    eventDate: '2024-08-09',
    publicationDate: '2026-05-10',
  };
  const res4 = TemporalEligibilityValidator.validate(recentArticleHistoricalEvent);
  const t4Passed = res4.eligible === false && res4.targetStatus === 'REJECTED' && res4.defectCode === 'PRE_2026_EVENT_IN_2026_PUBLICATION';
  recordTest('TC-TEMP-04', '2026 article describing pre-2026 event is rejected', t4Passed,
    `Eligible: ${res4.eligible}, TargetStatus: ${res4.targetStatus}, DefectCode: ${res4.defectCode}`);

  // -------------------------------------------------------------------------
  // TEST 5: Missing or Ambiguous Event Date -> Held (REVIEW_REQUIRED)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Missing or Ambiguous Event Date ---');
  const missingDateCandidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_missing_date',
    eventDate: undefined,
  };
  const res5A = TemporalEligibilityValidator.validate(missingDateCandidate);
  const t5APassed = res5A.eligible === false && res5A.targetStatus === 'REVIEW_REQUIRED' && res5A.defectCode === 'MISSING_OR_AMBIGUOUS_EVENT_DATE';

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
  // TEST 6: Dynamic Rolling 6-Month Window Calculation & Bounding
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Dynamic Rolling 6-Month Window Calculation & Bounding ---');
  // Sub-case A: 2026-10-24 -> rolling 6 months is 2026-04-24 to 2026-10-24
  const w1 = calculateRollingSixMonthWindow('2026-10-24');
  const w1Passed = w1.windowStart === '2026-04-24' && w1.windowEnd === '2026-10-24';

  // Sub-case B: Day-of-month clamping (2026-10-31 -> April has 30 days -> 2026-04-30)
  const w2 = calculateRollingSixMonthWindow('2026-10-31');
  const w2Passed = w2.windowStart === '2026-04-30' && w2.windowEnd === '2026-10-31';

  // Sub-case C: Early 2026 (2026-03-15) -> rolling calculation would be 2025-09-15, but MUST clamp to 2026-01-01
  const w3 = calculateRollingSixMonthWindow('2026-03-15');
  const w3Passed = w3.windowStart === '2026-01-01' && w3.windowEnd === '2026-03-15';

  recordTest('TC-TEMP-06', 'Dynamic rolling 6-month window calculation and bounding',
    w1Passed && w2Passed && w3Passed,
    `Standard (2026-10-24): [${w1.windowStart} to ${w1.windowEnd}], Clamped Month-End (2026-10-31): [${w2.windowStart} to ${w2.windowEnd}], Cycle Clamped (2026-03-15): [${w3.windowStart} to ${w3.windowEnd}]`);

  // -------------------------------------------------------------------------
  // TEST 7: Calendar Legitimacy & Leap Year Parsing
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Calendar Legitimacy & Leap Year Parsing ---');
  // 2026 is NOT a leap year: 2026-02-29 must be rejected as invalid calendar date
  const is2026Leap = isLeapYear(2026);
  const isValid2026Feb29 = isValidCalendarDate('2026-02-29');
  const invalidDateCandidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_invalid_leap_2026',
    eventDate: '2026-02-29',
  };
  const res7A = TemporalEligibilityValidator.validate(invalidDateCandidate);
  const t7APassed = !is2026Leap && !isValid2026Feb29 && res7A.defectCode === 'INVALID_CALENDAR_DATE';

  // 2024 IS a leap year: 2024-02-29 is a valid calendar date, but must fail 2026-only check as PRE_2026_EVENT
  const is2024Leap = isLeapYear(2024);
  const isValid2024Feb29 = isValidCalendarDate('2024-02-29');
  const leap2024Candidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_leap_2024',
    eventDate: '2024-02-29',
    publicationDate: '2024-03-01',
  };
  const res7B = TemporalEligibilityValidator.validate(leap2024Candidate);
  const t7BPassed = is2024Leap && isValid2024Feb29 && res7B.defectCode === 'PRE_2026_EVENT';

  // Invalid month-day length: April 31
  const isValidApril31 = isValidCalendarDate('2026-04-31');
  const t7CPassed = !isValidApril31;

  recordTest('TC-TEMP-07', 'Calendar legitimacy and leap-year date validation',
    t7APassed && t7BPassed && t7CPassed,
    `2026-02-29 Invalid (Leap=false): ${t7APassed}, 2024-02-29 Pre-2026 (Leap=true): ${t7BPassed}, 2026-04-31 Rejected: ${t7CPassed}`);

  // -------------------------------------------------------------------------
  // TEST 8: Asia/Kolkata Timezone Transitions
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Asia/Kolkata Timezone Transitions ---');
  // UTC 2026-10-24 18:29:59Z -> IST 2026-10-24 23:59:59 (+5:30) -> Date is 2026-10-24
  const dateBeforeMidnightUtc = new Date('2026-10-24T18:29:59.000Z');
  const istDate1 = getAsiaKolkataDateString(dateBeforeMidnightUtc);

  // UTC 2026-10-24 18:30:00Z -> IST 2026-10-25 00:00:00 (+5:30) -> Date is 2026-10-25
  const dateAfterMidnightUtc = new Date('2026-10-24T18:30:00.000Z');
  const istDate2 = getAsiaKolkataDateString(dateAfterMidnightUtc);

  const t8Passed = istDate1 === '2026-10-24' && istDate2 === '2026-10-25';
  recordTest('TC-TEMP-08', 'Asia/Kolkata (UTC+05:30) calendar-day transitions', t8Passed,
    `18:29:59 UTC -> IST: ${istDate1} (Expected: 2026-10-24) | 18:30:00 UTC -> IST: ${istDate2} (Expected: 2026-10-25)`);

  // -------------------------------------------------------------------------
  // TEST 9: December 2026 Boundary & 2027 Cycle Rollover Archiving
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: December 2026 Boundary & 2027 Cycle Rollover ---');
  // Sub-case A: 2026-12-31 is eligible during 2026 cycle
  const dec31Candidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_test_dec31_2026',
    eventDate: '2026-12-31',
  };
  const res9A = TemporalEligibilityValidator.validate(dec31Candidate, {
    cutoffDate: '2026-12-31',
    cycleConfig: {
      activeCycleYear: 2026,
      cycleStartDate: '2026-01-01',
      cycleEndDate: '2026-12-31',
    },
  });
  const t9APassed = res9A.eligible === true && res9A.cycleStatus === 'ACTIVE_CURRENT';

  // Sub-case B: At start of 2027 (activeCycleYear: 2027), 2026 content is ARCHIVED, not active current
  const res9B = TemporalEligibilityValidator.validate(dec31Candidate, {
    cutoffDate: '2027-01-15',
    cycleConfig: {
      activeCycleYear: 2027,
      cycleStartDate: '2027-01-01',
      cycleEndDate: '2027-12-31',
      allowArchivedCycleAsCurrent: false,
    },
  });
  const t9BPassed =
    res9B.eligible === false &&
    res9B.defectCode === 'EXPIRED_CYCLE_ARCHIVED' &&
    res9B.cycleStatus === 'ARCHIVED_HISTORICAL_REVISION';

  recordTest('TC-TEMP-09', 'December 2026 boundary and 2027 cycle rollover archiving',
    t9APassed && t9BPassed,
    `2026-12-31 in 2026 Cycle: Eligible=${res9A.eligible} (${res9A.cycleStatus}) | In 2027 Cycle: Archived=${!res9B.eligible} (${res9B.defectCode}, ${res9B.cycleStatus})`);

  // -------------------------------------------------------------------------
  // TEST 10: Strict Prohibition of Automatic Reclassification & Blocking Retracted
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: Prohibition of Automatic Reclassification & Blocking Retracted ---');
  // Sub-case A: Automatic reclassification attempt without review throws Error
  let autoReclassBlocked = false;
  try {
    TemporalEligibilityValidator.reclassifyToGeneralStudies(pre2026Candidate);
  } catch (err: any) {
    autoReclassBlocked = err.message.includes('Automatic Reclassification Forbidden');
  }

  // Sub-case B: Reclassifying a retracted question (e.g. ca_pub_04 / ca_pub_05) throws Error even if review submitted
  const retractedCandidate: QuestionAccuracyCandidate = {
    ...baselineValid2026Candidate,
    id: 'ca_pub_04',
    isRetracted: true,
    status: 'RETRACTED',
  };
  const mockReview: IndependentReclassificationReview = {
    reviewerUid: 'admin_subject_expert_109',
    reviewedAt: '2026-10-24T12:00:00Z',
    isIndependentlyVerified: true,
    syllabusAlignment: 'Economy of India',
    printedTextbookSourceRef: 'Std 11 Economics, Chapter 8, Page 172',
    justificationNotes: 'Static monetary policy definition verified in printed textbook.',
  };
  let retractedReclassBlocked = false;
  try {
    TemporalEligibilityValidator.reclassifyToGeneralStudies(retractedCandidate, mockReview);
  } catch (err: any) {
    retractedReclassBlocked = err.message.includes('Reclassification Forbidden: Question ca_pub_04 is RETRACTED');
  }

  // Sub-case C: Legitimate older question with independent review succeeds
  const validOlderCandidate: QuestionAccuracyCandidate = {
    ...pre2026Candidate,
    isRetracted: false,
    status: 'REVIEW_REQUIRED',
  };
  const reclassifiedSuccess = TemporalEligibilityValidator.reclassifyToGeneralStudies(validOlderCandidate, mockReview);
  const legitimateReclassPassed =
    reclassifiedSuccess.isCurrentAffairs === false &&
    reclassifiedSuccess.category === 'General Studies — Economy of India' &&
    reclassifiedSuccess.editorialApproval?.approvedBy === 'admin_subject_expert_109';

  recordTest('TC-TEMP-10', 'Prohibition of automatic reclassification & blocking retracted items',
    autoReclassBlocked && retractedReclassBlocked && legitimateReclassPassed,
    `Auto Reclass Blocked: ${autoReclassBlocked}, Retracted Blocked: ${retractedReclassBlocked}, Review-Backed Passed: ${legitimateReclassPassed}`);

  // -------------------------------------------------------------------------
  // TEST 11: Three-Tier Fallback Engine Resolution
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Three-Tier Fallback Engine Resolution ---');
  // Tier 1: Today's Approved Edition
  const todayApprovedEdition: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [baselineValid2026Candidate],
      title_en: 'Daily Current Affairs — 24 October 2026',
      title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — 24 அக்டோபர் 2026',
    },
  ];
  const tier1Res = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', todayApprovedEdition);
  const tier1Passed =
    tier1Res.hasApprovedEdition === true &&
    tier1Res.tier === 'TODAY_APPROVED' &&
    tier1Res.isRevision === false &&
    tier1Res.verifiedCount === 1;

  // Tier 2: Previous Approved 2026 Edition (Revision notice & original edition date)
  const tier2Editions: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [], // Today has 0
    },
    {
      editionDate: '2026-10-23',
      questions: [baselineValid2026Candidate], // Yesterday has approved
      title_en: 'Daily Current Affairs — 23 October 2026 Edition',
      title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — 23 அக்டோபர் 2026 பதிப்பு',
    },
  ];
  const tier2Res = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', tier2Editions);
  const tier2Passed =
    tier2Res.hasApprovedEdition === true &&
    tier2Res.tier === 'REVISION_FALLBACK' &&
    tier2Res.isRevision === true &&
    tier2Res.originalEditionDate === '2026-10-23' &&
    tier2Res.revisionNotice_en === 'Revision Practice — 2026-10-23 Edition' &&
    tier2Res.revisionNotice_ta === 'மீள்பார்வைப் பயிற்சி — 2026-10-23 பதிப்பு';

  // Tier 3: No approved 2026 records -> Editorial Verification In Progress (Exact Strings)
  const tier3Editions: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [],
    },
  ];
  const tier3Res = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', tier3Editions);
  const tier3Passed =
    tier3Res.hasApprovedEdition === false &&
    tier3Res.tier === 'EDITORIAL_VERIFICATION_IN_PROGRESS' &&
    tier3Res.status === 'EDITORIAL_REVIEW_IN_PROGRESS' &&
    tier3Res.message === '2026 Current Affairs — Editorial Verification in Progress.' &&
    tier3Res.message_ta === '2026 நடப்பு நிகழ்வுகள் — உண்மைச் சரிபார்ப்பு நடைபெற்று வருகிறது.' &&
    tier3Res.package === null &&
    tier3Res.verifiedCount === 0;

  recordTest('TC-TEMP-11', 'Three-tier fallback resolution (Tier 1 -> Tier 2 -> Tier 3)',
    tier1Passed && tier2Passed && tier3Passed,
    `Tier 1 Passed: ${tier1Passed}, Tier 2 Passed: ${tier2Passed} (Notice: "${tier2Res.revisionNotice_en}"), Tier 3 Passed: ${tier3Passed} (EN: "${tier3Res.message}")`);

  // -------------------------------------------------------------------------
  // TEST 12: Retraction Invariant: Retracted / Disputed Questions Strictly Excluded from Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 12: Retraction Invariant in Fallback ---');
  // If an edition contains only retracted items (e.g. ca_pub_04, ca_pub_05) or pre-2026 items,
  // it MUST NOT be selected as a valid Tier 1 or Tier 2 fallback. It must drop down to Tier 3!
  const editionsWithDefectsOnly: DailyCaCandidateEdition[] = [
    {
      editionDate: '2026-10-24',
      questions: [
        {
          ...baselineValid2026Candidate,
          id: 'ca_pub_04',
          isRetracted: true,
          status: 'RETRACTED',
          retractionReason: 'Contradicted by RBI 5 June 2026 resolution',
        },
        {
          ...baselineValid2026Candidate,
          id: 'ca_pub_05',
          isRetracted: true,
          status: 'RETRACTED',
          retractionReason: 'PIB release 2274981 does not contain Health Index',
        },
      ],
    },
    {
      editionDate: '2026-10-23',
      questions: [
        pre2026Candidate, // Pre-2026 event
      ],
    },
  ];
  const defectFallbackRes = DailyCaAccuracyGuard.resolveDailyCaEdition('2026-10-24', editionsWithDefectsOnly);
  const t12Passed =
    defectFallbackRes.hasApprovedEdition === false &&
    defectFallbackRes.tier === 'EDITORIAL_VERIFICATION_IN_PROGRESS' &&
    defectFallbackRes.verifiedCount === 0 &&
    defectFallbackRes.package === null;

  recordTest('TC-TEMP-12', 'Retracted and ineligible questions strictly excluded from fallback',
    t12Passed,
    `Defect Edition Dropped to Tier 3: ${t12Passed}, Verified Count: ${defectFallbackRes.verifiedCount}, Tier: ${defectFallbackRes.tier}`);

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
    console.log('STATUS: ALL 12 MANDATORY 2026 CURRENT AFFAIRS SAFEGUARDS FULLY CERTIFIED!\n');
    process.exit(0);
  } else {
    console.log('STATUS: SOME TEMPORAL INVARIANT CHECKS FAILED!\n');
    process.exit(1);
  }
}

runTemporalSuite();
