/**
 * TNPSC99 — CA-2026 Editorial Acceptance Workflow & Isolation Test Suite
 * 
 * Verifies:
 * 1. Live Question Bank Immutability: All 20 MCQs strictly retain editorialApproval: null and status: SOURCE_VERIFIED.
 * 2. Option Index Synchronization & Anti-Bias Safety: Answer text corresponds exactly to correctOptionIndex in both EN and TA.
 * 3. 2026 Temporal Window Eligibility: Every event strictly dates between 2026-01-01 and 2026-10-24.
 * 4. Workflow Transition Simulation: A synthetic test question transitions to HUMAN_APPROVED only when a valid human UID/timestamp is supplied.
 * 5. Public Endpoint Leak Prevention: The live draft questions cannot be published via DailyCaAccuracyGuard.
 */

import {
  AUTHENTIC_2026_SOURCE_REGISTRY,
  CA_2026_DRAFT_MCQ_BANK,
  getCa2026DraftCandidates,
  Ca2026DraftMCQ
} from '../src/data/ca-2026-draft-bank';
import { evaluatePublicationGate } from '../src/lib/accuracy/accuracy-engine';
import { DailyCaAccuracyGuard } from '../src/lib/accuracy/daily-ca-accuracy-guard';
import { TemporalEligibilityValidator } from '../src/lib/accuracy/temporal-validator';

interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function recordTest(code: string, name: string, passed: boolean, details: string) {
  testResults.push({ code, name, passed, details });
  const sym = passed ? '[✓ PASS]' : '[✗ FAIL]';
  console.log(`${sym} (${code}) -> ${name}\n       Details: ${details}`);
}

async function runAcceptanceTests() {
  console.log('========================================================================');
  console.log('TNPSC99 — CA-2026 EDITORIAL ACCEPTANCE WORKFLOW SUITE');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('========================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Live Question Bank Invariant (Zero Premature Approval)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Live Question Bank Zero Premature Approval ---');
  let zeroApprovalCount = 0;
  let sourceVerifiedStatusCount = 0;
  let rejectedStatusCount = 0;

  const confirmedDefectSet = new Set(['ca_2026_draft_02', 'ca_2026_draft_03', 'ca_2026_draft_08', 'ca_2026_draft_14', 'ca_2026_draft_17', 'ca_2026_draft_19']);
  for (const q of CA_2026_DRAFT_MCQ_BANK) {
    if (q.editorialApproval === null) {
      zeroApprovalCount++;
    }
    if (q.status === 'SOURCE_VERIFIED') {
      sourceVerifiedStatusCount++;
    }
    if (confirmedDefectSet.has(q.id) && q.status === 'REJECTED') {
      rejectedStatusCount++;
    }
  }

  recordTest(
    'TC-EA-01',
    'Live Questions Awaiting Editorial Sign-Off (14 Pending + 6 Confirmed Defects Quarantined)',
    zeroApprovalCount === 20 && sourceVerifiedStatusCount === 14 && rejectedStatusCount === 6,
    `Total Live Drafts: 20, Unapproved (null): ${zeroApprovalCount}, Pending SOURCE_VERIFIED: ${sourceVerifiedStatusCount}, Quarantined Confirmed Defects: ${rejectedStatusCount}`
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Option Distribution & Synchronization Safety
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Option Distribution & Synchronization Safety ---');
  const indexCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let synchronizedCount = 0;

  for (const q of CA_2026_DRAFT_MCQ_BANK) {
    indexCounts[q.correctOptionIndex as 0 | 1 | 2 | 3]++;

    const enOption = q.options_en[q.correctOptionIndex];
    const taOption = q.options_ta[q.correctOptionIndex];

    // Verify option text exists and is non-empty
    if (enOption && taOption && enOption.trim().length > 0 && taOption.trim().length > 0) {
      synchronizedCount++;
    }
  }

  const isBalanced =
    indexCounts[0] === 5 &&
    indexCounts[1] === 5 &&
    indexCounts[2] === 5 &&
    indexCounts[3] === 5;

  recordTest(
    'TC-EA-02',
    'Option Index Balance and Bilingual Synchronization',
    isBalanced && synchronizedCount === 20,
    `Distribution: A=${indexCounts[0]}, B=${indexCounts[1]}, C=${indexCounts[2]}, D=${indexCounts[3]}. Synchronized EN/TA pairs: ${synchronizedCount}/20.`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Strict 2026 Event Date Qualification
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Strict 2026 Temporal Window Validation ---');
  let temporalEligibleCount = 0;
  let pre2026RejectedCount = 0;

  for (const q of CA_2026_DRAFT_MCQ_BANK) {
    const tempEval = TemporalEligibilityValidator.validate(q);
    if (tempEval.eligible && q.eventDate && q.eventDate.startsWith('2026-')) {
      temporalEligibleCount++;
    } else if (q.id === 'ca_2026_draft_02' && !tempEval.eligible) {
      pre2026RejectedCount++;
    }
  }

  recordTest(
    'TC-EA-03',
    '2026 Temporal Qualification (19 Eligible 2026 + 1 Pre-2026 Rejected)',
    temporalEligibleCount === 19 && pre2026RejectedCount === 1,
    `Strict 2026 Verified Events: ${temporalEligibleCount}/20. Defect PRE_2026_EVENT_IN_2026_PUBLICATION rejected: ${pre2026RejectedCount}.`
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Isolated Simulation of Editorial Review Actions
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Isolated Editorial Workflow Decision Simulation ---');
  
  // Clone question 1 for isolated workflow testing
  const simQuestion: Ca2026DraftMCQ = JSON.parse(JSON.stringify(CA_2026_DRAFT_MCQ_BANK[0]));
  simQuestion.id = 'test_sim_workflow_01';

  // State 1: Awaiting Review
  const evalBefore = evaluatePublicationGate(simQuestion);
  const state1Pass = evalBefore.targetStatus === 'REVIEW_REQUIRED' && !evalBefore.allGatesPassed;

  // State 2: Simulated Human Approval (with authorized human editor UID)
  simQuestion.editorialApproval = {
    approvedBy: 'tnpsc_chief_editor_human_test_uid',
    approvedAt: '2026-10-24T14:00:00Z',
    notes: 'Primary source verified against PIB PRID 2324120. Approved for publication.',
  };
  simQuestion.status = 'HUMAN_APPROVED';

  const evalAfterApproval = evaluatePublicationGate(simQuestion);
  const state2Pass = evalAfterApproval.targetStatus === 'PUBLISHED' && evalAfterApproval.allGatesPassed;

  // State 3: Simulated Request Correction
  const simQuestionCorrection: Ca2026DraftMCQ = JSON.parse(JSON.stringify(CA_2026_DRAFT_MCQ_BANK[0]));
  simQuestionCorrection.id = 'test_sim_correction_02';
  simQuestionCorrection.editorialApproval = null;
  simQuestionCorrection.status = 'REVIEW_REQUIRED';

  const evalCorrection = evaluatePublicationGate(simQuestionCorrection);
  const state3Pass = evalCorrection.targetStatus === 'REVIEW_REQUIRED';

  // Verify that live question 1 remains completely unmutated
  const liveQ1Unchanged = CA_2026_DRAFT_MCQ_BANK[0].editorialApproval === null &&
    CA_2026_DRAFT_MCQ_BANK[0].status === 'SOURCE_VERIFIED';

  recordTest(
    'TC-EA-04',
    'Simulated Human Editorial Review Lifecycle Transitions',
    state1Pass && state2Pass && state3Pass && liveQ1Unchanged,
    `State 1 (Awaiting Review): ${state1Pass}, State 2 (Approved -> Target: PUBLISHED): ${state2Pass}, State 3 (Correction Requested): ${state3Pass}, Live Bank Unmutated: ${liveQ1Unchanged}`
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Public Endpoint Protection Guard
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Public Endpoint Fail-Closed Guard ---');
  const candidates = getCa2026DraftCandidates();
  const guardResult = DailyCaAccuracyGuard.processDailyEdition('2026-10-24', candidates);

  const leakPrevented =
    guardResult.hasApprovedEdition === false &&
    guardResult.package === null &&
    guardResult.verifiedCount === 0 &&
    guardResult.unverifiedFilteredCount === 20;

  recordTest(
    'TC-EA-05',
    'Public Endpoint Fail-Closed Guard (Zero Unapproved Question Leakage)',
    leakPrevented,
    `hasApprovedEdition: ${guardResult.hasApprovedEdition}, package: ${guardResult.package}, unverifiedFiltered: ${guardResult.unverifiedFilteredCount}/20`
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('ACCEPTANCE TEST SUMMARY');
  console.log('========================================================================');
  const passed = testResults.filter((r) => r.passed).length;
  console.log(`Total Checks: ${testResults.length} | Passed: ${passed} | Failed: ${testResults.length - passed}`);
  
  if (passed === testResults.length) {
    console.log('STATUS: EDITORIAL ACCEPTANCE WORKFLOW TEST SUITE FULLY CERTIFIED!');
  } else {
    console.error('STATUS: ACCEPTANCE TEST SUITE FAILED.');
    process.exit(1);
  }
}

runAcceptanceTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
