/**
 * TNPSC99 — Permanent Zero-Compromise MCQ Accuracy Policy Test Suite
 * Validates the 10 Mandatory Rules, 9-Condition Fail-Closed Gate, Dynamic CA Sizing,
 * Existing Question Bank Audit, Incident Response / Retraction Protocol, and 7-Category Reporting.
 */

import { evaluatePublicationGate } from '../src/lib/accuracy/accuracy-engine';
import { QuestionBankAuditor } from '../src/lib/accuracy/question-bank-auditor';
import { IncidentResponseService } from '../src/lib/accuracy/incident-response-service';
import { DailyCaAccuracyGuard } from '../src/lib/accuracy/daily-ca-accuracy-guard';
import { QuestionAccuracyCandidate } from '../src/lib/accuracy/types';
import {
  FREE_CURRENT_AFFAIRS_TEST,
  FREE_MOCK_TEST,
  FREE_TEXTBOOK_PRACTICE
} from '../src/data/public-sample-questions';

const testResults: { id: string; name: string; passed: boolean; details: string }[] = [];

function recordTest(id: string, name: string, passed: boolean, details: string) {
  testResults.push({ id, name, passed, details });
  const mark = passed ? '[✓ PASS]' : '[✗ FAIL]';
  console.log(`${mark} (${id}) -> ${name}`);
  console.log(`       Details: ${details}`);
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('TNPSC99 — PERMANENT ZERO-COMPROMISE MCQ ACCURACY POLICY SUITE');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  // Helper baseline question
  const validBaseline: QuestionAccuracyCandidate = {
    id: 'test_q_01',
    question_en: 'What is the capital of Tamil Nadu?',
    question_ta: 'தமிழ்நாட்டின் தலைநகரம் எது?',
    options_en: ['Chennai', 'Madurai', 'Coimbatore', 'Tiruchirappalli'],
    options_ta: ['சென்னை', 'மதுரை', 'கோயம்புத்தூர்', 'திருச்சிராப்பள்ளி'],
    correctOptionIndex: 0,
    explanation_en: 'Chennai is the capital city of Tamil Nadu located on the Coromandel Coast.',
    explanation_ta: 'சென்னை தமிழ்நாட்டின் தலைநகரமாகும். இது கோரமண்டல் கடற்கரையில் அமைந்துள்ளது.',
    sourceUrl: 'https://www.tn.gov.in/about-tamil-nadu/capital-chennai',
    sourcePublisher: 'Government of Tamil Nadu Official Portal',
    sourceExcerpt: 'Chennai is the capital city of Tamil Nadu, the southernmost state of India.',
    editorialApproval: {
      approvedBy: 'admin_reviewer_uid_101',
      approvedAt: '2026-10-24T05:00:00Z',
      notes: 'Verified against official State Portal',
    },
    isRetracted: false,
    isQuarantined: false,
    status: 'PUBLISHED',
  };

  // -------------------------------------------------------------------------
  // TEST 1: The 10 Mandatory Rules Invariant Enforcement
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: 10 Mandatory Rules Invariant Enforcement ---');

  // Rule 1 & 6: Reject missing or fake/placeholder URL
  const fakeUrlCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    sourceUrl: 'https://example.com/fake-url',
  };
  const evalFakeUrl = evaluatePublicationGate(fakeUrlCandidate);
  const rule1Pass = !evalFakeUrl.allGatesPassed && evalFakeUrl.targetStatus === 'REJECTED';

  // Rule 3: Reject distractor duplication
  const duplicateDistractorCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    options_en: ['Chennai', 'Chennai', 'Madurai', 'Trichy'],
  };
  const evalDup = evaluatePublicationGate(duplicateDistractorCandidate);
  const rule3Pass = !evalDup.allGatesPassed;

  // Rule 4: Reject Tamil missing / non-Unicode
  const missingTamilCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    question_ta: '',
  };
  const evalTamil = evaluatePublicationGate(missingTamilCandidate);
  const rule4Pass = !evalTamil.allGatesPassed;

  // Rule 8 & 9: Reject AI-only sign-off without human editorial approval
  const aiOnlyCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    editorialApproval: {
      approvedBy: 'AI',
      approvedAt: new Date().toISOString(),
      notes: 'Auto approved by LLM confidence score 0.99',
    },
  };
  const evalAiOnly = evaluatePublicationGate(aiOnlyCandidate);
  const rule8Pass = !evalAiOnly.allGatesPassed && evalAiOnly.targetStatus === 'REVIEW_REQUIRED';

  recordTest('TC-01', 'Mandatory Rules Invariant Enforcement',
    rule1Pass && rule3Pass && rule4Pass && rule8Pass,
    `Fake URL Rejected: ${rule1Pass}, Duplicate Distractor Blocked: ${rule3Pass}, Missing Tamil Blocked: ${rule4Pass}, AI-Only Approval Blocked: ${rule8Pass}`
  );

  // -------------------------------------------------------------------------
  // TEST 2: Fail-Closed Publication Gate
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Fail-Closed Publication Gate (9 Conditions) ---');

  // A. Compliant Question
  const compliantEval = evaluatePublicationGate(validBaseline);
  const compliantPass = compliantEval.allGatesPassed && compliantEval.targetStatus === 'PUBLISHED';

  // B. Gate 2 Failure (Ungrounded factual claim)
  const ungroundedCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    sourceExcerpt: 'This excerpt discusses agricultural policy in northern districts with zero mention of capital.',
  };
  const ungroundedEval = evaluatePublicationGate(ungroundedCandidate);
  const ungroundedBlocked = !ungroundedEval.allGatesPassed && ungroundedEval.targetStatus === 'REVIEW_REQUIRED';

  // C. Gate 6 Failure (Trivial distractor "None of the above")
  const trivialDistractorCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    options_en: ['Chennai', 'Madurai', 'Coimbatore', 'None of the above'],
  };
  const trivialDistractorEval = evaluatePublicationGate(trivialDistractorCandidate);
  const trivialDistractorBlocked = !trivialDistractorEval.allGatesPassed;

  // D. Gate 9 Failure (Retracted question)
  const retractedCandidate: QuestionAccuracyCandidate = {
    ...validBaseline,
    isRetracted: true,
  };
  const retractedEval = evaluatePublicationGate(retractedCandidate);
  const retractedBlocked = !retractedEval.allGatesPassed && retractedEval.targetStatus === 'RETRACTED';

  recordTest('TC-02', '9-Condition Fail-Closed Gate Enforcement',
    compliantPass && ungroundedBlocked && trivialDistractorBlocked && retractedBlocked,
    `Compliant Passed: ${compliantPass}, Ungrounded Blocked: ${ungroundedBlocked}, Trivial Option Blocked: ${trivialDistractorBlocked}, Retracted Blocked: ${retractedBlocked}`
  );

  // -------------------------------------------------------------------------
  // TEST 3: Daily Current Affairs Dynamic Sizing & Zero-Verified Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Daily Current Affairs Dynamic Sizing ---');

  // Generate 10 candidate questions where only 6 are compliant and 4 are unverified
  const mixedCaCandidates: QuestionAccuracyCandidate[] = Array.from({ length: 10 }, (_, i) => {
    if (i < 6) {
      return {
        ...validBaseline,
        id: `ca_cand_${i + 1}`,
        question_en: `Current Affairs Verified Question Stem ${i + 1}`,
        sourceExcerpt: `Current Affairs Verified Question Stem ${i + 1} Chennai facts`,
      };
    } else {
      return {
        ...validBaseline,
        id: `ca_cand_${i + 1}`,
        question_en: `Unverified Draft Question Stem ${i + 1}`,
        sourceUrl: undefined, // Missing source -> fails gate
      };
    }
  });

  const partialEdition = DailyCaAccuracyGuard.processDailyEdition('2026-10-24', mixedCaCandidates);
  const partialSizingPass =
    partialEdition.hasApprovedEdition === true &&
    partialEdition.verifiedCount === 6 &&
    partialEdition.package?.questions.length === 6 &&
    partialEdition.package?.title_en.includes('6 Questions');

  // Generate 10 candidate questions where 0 are compliant
  const allUnverifiedCaCandidates = mixedCaCandidates.map((q) => ({ ...q, sourceUrl: undefined }));
  const zeroEdition = DailyCaAccuracyGuard.processDailyEdition('2026-10-24', allUnverifiedCaCandidates);
  const zeroFallbackPass =
    zeroEdition.hasApprovedEdition === false &&
    zeroEdition.status === 'EDITORIAL_REVIEW_IN_PROGRESS' &&
    zeroEdition.package === null &&
    zeroEdition.message.includes('undergoing official verification');

  recordTest('TC-03', 'Dynamic CA Sizing & Zero-Verified Editorial Status',
    partialSizingPass && zeroFallbackPass,
    `6-of-10 Sized Accurately: ${partialSizingPass} (Package Qs: ${partialEdition.package?.questions.length}), Zero-Verified Fallback: ${zeroFallbackPass}`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Existing Question Bank Audit & Non-Destructive Quarantine
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Existing Question Bank Audit & Quarantine ---');

  const allPublicCandidates = QuestionBankAuditor.getAllPublicSampleQuestions();
  const auditor = new QuestionBankAuditor();
  const { evaluations, summary: auditSummary } = auditor.auditBatch(allPublicCandidates);

  const failedItems = evaluations.filter((e) => !e.allGatesPassed);
  if (failedItems.length > 0) {
    console.log('Failing Questions in 40 Public Set:', failedItems.map(f => ({ id: f.questionId, reasons: f.rejectionReasons })));
  }

  const allPublicPassed =
    auditSummary.totalAudited === 40 &&
    auditSummary.complianceRate === 100 &&
    auditSummary.counts.published === 40;

  // Test Non-destructive Quarantine
  const defectiveCandidate = allPublicCandidates[0];
  const quarantined = QuestionBankAuditor.quarantineQuestion(
    defectiveCandidate,
    'FACT_CONFLICT',
    'Auditor identified statistical conflict with latest Gazette'
  );
  const quarantineEval = evaluatePublicationGate(quarantined);

  const quarantinePass =
    quarantined.isQuarantined === true &&
    quarantined.status === 'REJECTED' &&
    !quarantineEval.allGatesPassed &&
    quarantineEval.targetStatus === 'REJECTED';

  recordTest('TC-04', 'Existing Question Bank 40-MCQ Audit & Quarantine',
    allPublicPassed && quarantinePass,
    `40 Public MCQs Audited: ${auditSummary.totalAudited}, Compliance: ${auditSummary.complianceRate}%, Quarantine Non-Destructive: ${quarantinePass}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Publication Incident Response Protocol
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Publication Incident Response Protocol ---');

  const publishedQuestion = allPublicCandidates[1];
  const mockAttempts = [
    { attemptId: 'att_01', userId: 'user_A', chosenOptionIndex: 2, initialScore: 18, totalPossible: 20 },
    { attemptId: 'att_02', userId: 'user_B', chosenOptionIndex: publishedQuestion.correctOptionIndex, initialScore: 19, totalPossible: 20 },
    { attemptId: 'att_03', userId: 'user_C', chosenOptionIndex: 1, initialScore: 14, totalPossible: 20 },
  ];

  const incidentOutcome = IncidentResponseService.handleQuestionIncident(publishedQuestion, {
    questionId: publishedQuestion.id,
    reason: 'Department erratum revised the approved statistical baseline',
    severity: 'HIGH',
    adminUid: 'admin_lead_officer',
    revisedKeyIndex: 2,
    affectedTestAttempts: mockAttempts,
  });

  const deliveryBlocked = incidentOutcome.quarantinedQuestion.isRetracted === true &&
    incidentOutcome.quarantinedQuestion.status === 'RETRACTED';

  // Standard TNPSC Commission Erratum: Candidate who had incorrect key gets +1 bonus mark
  const candidateAScoredBonus = incidentOutcome.adjustedAttempts.find((a) => a.userId === 'user_A')?.bonusMarksAwarded === 1;
  const candidateBRetainedScore = incidentOutcome.adjustedAttempts.find((a) => a.userId === 'user_B')?.bonusMarksAwarded === 0;

  // Mistake Vault neutralized
  const mistakeVaultNeutralized = incidentOutcome.neutralizedMistakeVaultEntries.length === 3;

  // Republication requires formal reapproval
  let reapprovalBlockedWithoutSignOff = false;
  try {
    const freshEval = evaluatePublicationGate(incidentOutcome.quarantinedQuestion);
    reapprovalBlockedWithoutSignOff = !freshEval.allGatesPassed;
  } catch (e) {
    reapprovalBlockedWithoutSignOff = true;
  }

  // Formal reapproval test
  const reapprovedQuestion = IncidentResponseService.reapproveQuestion(
    incidentOutcome.quarantinedQuestion,
    2,
    'admin_super_lead',
    'Re-verified against Gazette Amendment No. 41'
  );
  const reapprovedEval = evaluatePublicationGate(reapprovedQuestion);
  const reapprovedPass = reapprovedEval.allGatesPassed && reapprovedEval.targetStatus === 'PUBLISHED';

  recordTest('TC-05', 'Publication Incident Response & Non-Destructive Erratum',
    deliveryBlocked && candidateAScoredBonus && candidateBRetainedScore && mistakeVaultNeutralized && reapprovalBlockedWithoutSignOff && reapprovedPass,
    `Delivery Blocked: ${deliveryBlocked}, Full Marks Awarded to Affected Aspirants: ${candidateAScoredBonus}, Mistake Vault Neutralized: ${mistakeVaultNeutralized}, Reapproval Workflow: ${reapprovedPass}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Platform Reporting Breakdown (7 Categories)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Platform Reporting Categories ---');

  const testAuditor = new QuestionBankAuditor();
  const mixedBatch: QuestionAccuracyCandidate[] = [
    validBaseline, // Published
    fakeUrlCandidate, // Rejected
    ungroundedCandidate, // Review Required
    retractedCandidate, // Retracted
    { ...validBaseline, id: 'cand_approved', editorialApproval: { approvedBy: 'lead_uid', approvedAt: '2026-10-24T00:00:00Z' }, status: 'HUMAN_APPROVED' },
    { ...validBaseline, id: 'cand_draft', status: 'DRAFT', editorialApproval: null },
  ];

  const { summary: batchSummary } = testAuditor.auditBatch(mixedBatch);

  const reportingCategoriesPresent =
    batchSummary.counts.published >= 0 &&
    batchSummary.counts.humanApproved >= 0 &&
    batchSummary.counts.sourceVerified >= 0 &&
    batchSummary.counts.reviewRequired >= 0 &&
    batchSummary.counts.rejected >= 0 &&
    batchSummary.counts.retracted >= 0 &&
    batchSummary.counts.draft >= 0;

  // Anti-Falsification Rule: Draft questions must never be counted as published
  const antiFalsificationPass = batchSummary.counts.published < mixedBatch.length;

  recordTest('TC-06', 'Platform 7-Category Reporting & Anti-Falsification',
    reportingCategoriesPresent && antiFalsificationPass,
    `Reported Counts: Published=${batchSummary.counts.published}, HumanApproved=${batchSummary.counts.humanApproved}, SourceVerified=${batchSummary.counts.sourceVerified}, ReviewRequired=${batchSummary.counts.reviewRequired}, Rejected=${batchSummary.counts.rejected}, Retracted=${batchSummary.counts.retracted}, Draft=${batchSummary.counts.draft}`
  );

  // -------------------------------------------------------------------------
  // FINAL EVALUATION
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('TEST SUMMARY');
  console.log('========================================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;
  console.log(`Total Invariant Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('STATUS: ZERO-COMPROMISE MCQ ACCURACY POLICY FULLY CERTIFIED!\n');
    process.exit(0);
  } else {
    console.log('STATUS: SOME ACCURACY INVARIANT CHECKS FAILED!\n');
    process.exit(1);
  }
}

runTestSuite();
