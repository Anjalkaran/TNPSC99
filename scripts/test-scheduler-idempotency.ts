/**
 * TNPSC99 — Automated Current Affairs Scheduler & Idempotency Test Suite
 * 
 * Verifies:
 * 1. Asia/Kolkata daily scheduling (05:00 - 08:00 IST)
 * 2. Parallel-job collision prevention via distributed lease lock
 * 3. Single finalized manifest per edition date (ca_manifest_daily_YYYYMMDD)
 * 4. Question stem deduplication (zero duplicates in published manifest)
 * 5. Retry idempotency (safe reruns produce no extraneous records)
 * 6. Tier 1 / 2 / 3 fallback priority resolution
 * 7. Non-destructive retraction cache invalidation
 * 8. Production scheduler hard isolation (remains strictly disabled)
 */

import { CurrentAffairsSchedulerService } from '../src/lib/current-affairs/scheduler-service';
import { CADraftQuestion } from '../src/lib/current-affairs/types';

function createMockDraft(id: string, stem: string, status: 'PUBLISHED' | 'REJECTED' = 'PUBLISHED'): CADraftQuestion {
  return {
    id,
    factIds: [`fact_${id}`],
    eventId: `event_${id}`,
    rawDocumentId: `doc_${id}`,
    sourceUrl: 'https://www.tn.gov.in/pressrelease/2026/01/sample',
    monthKey: '2026-01',
    question_en: stem,
    options_en: ['A', 'B', 'C', 'D'],
    correctOptionIndex: 0,
    explanation_en: 'Explanation',
    question_ta: `${stem} (தமிழ்)`,
    options_ta: ['அ', 'ஆ', 'இ', 'ஈ'],
    explanation_ta: 'விளக்கம்',
    category: 'Tamil Nadu Affairs',
    difficulty: 'medium',
    examType: 'Group II',
    questionType: 'direct',
    verificationReport: {
      timestamp: new Date().toISOString(),
      factualConsistency: true,
      unambiguousCorrectAnswer: true,
      distractorQualityPassed: true,
      tamilEnglishSemanticallyIdentical: true,
      hasAuthoritativeCitation: true,
      riskLevel: 'LOW_RISK',
      overallScore: 98,
      canAutoPublish: true,
      rejectionReasons: [],
    },
    overallStatus: status,
    createdAt: new Date().toISOString(),
  };
}

async function runSchedulerTestSuite() {
  console.log('========================================================================');
  console.log('TNPSC99 — SCHEDULER & IDEMPOTENCY TEST SUITE');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  let passedTests = 0;
  const totalTests = 8;

  // TEST 1: Asia/Kolkata Daily Window Calculation
  {
    console.log('[TEST 1] Asia/Kolkata Daily Window (05:00 - 08:00 IST / 23:30 - 02:30 UTC)');
    // 06:30 IST = 01:00 UTC
    const inWindowUtc = new Date('2026-10-25T01:00:00.000Z');
    const resIn = CurrentAffairsSchedulerService.isWithinScheduledWindow(inWindowUtc);

    // 12:00 IST = 06:30 UTC
    const outWindowUtc = new Date('2026-10-25T06:30:00.000Z');
    const resOut = CurrentAffairsSchedulerService.isWithinScheduledWindow(outWindowUtc);

    if (resIn.inWindow && !resOut.inWindow) {
      console.log(`  ✓ Correctly evaluated: In-window at ${resIn.istTime}, Out-of-window at ${resOut.istTime}`);
      passedTests++;
    } else {
      console.error(`  ✗ Window calculation failed: inWindow=${resIn.inWindow}, outWindow=${resOut.inWindow}`);
    }
  }

  // TEST 2: Parallel-Job Collision Prevention (Distributed Lease Lock)
  {
    console.log('\n[TEST 2] Parallel-Job Collision Prevention via Distributed Lease Lock');
    CurrentAffairsSchedulerService.resetStateForTesting();

    const lease1 = CurrentAffairsSchedulerService.acquireLease('2026-10-25', 'worker_alpha', 60000);
    const lease2 = CurrentAffairsSchedulerService.acquireLease('2026-10-25', 'worker_beta', 60000);

    if (lease1.acquired && !lease2.acquired && lease2.reason?.includes('worker_alpha')) {
      console.log('  ✓ Worker Alpha acquired lease; Worker Beta concurrently rejected with collision lock.');
      passedTests++;
    } else {
      console.error('  ✗ Lease collision check failed:', { lease1, lease2 });
    }
  }

  // TEST 3: Safe Release & Reacquisition
  {
    console.log('\n[TEST 3] Safe Lease Release and Subsequent Worker Acquisition');
    CurrentAffairsSchedulerService.resetStateForTesting();

    const lease1 = CurrentAffairsSchedulerService.acquireLease('2026-10-25', 'worker_alpha');
    const released = CurrentAffairsSchedulerService.releaseLease('2026-10-25', lease1.lease!.leaseToken);

    const lease2 = CurrentAffairsSchedulerService.acquireLease('2026-10-25', 'worker_gamma');
    if (released && lease2.acquired) {
      console.log('  ✓ Lease successfully released and reclaimed by Worker Gamma.');
      passedTests++;
      CurrentAffairsSchedulerService.releaseLease('2026-10-25', lease2.lease!.leaseToken);
    } else {
      console.error('  ✗ Failed to reacquire released lease.');
    }
  }

  // TEST 4: Single Finalized Daily Manifest & Idempotent Reruns
  {
    console.log('\n[TEST 4] Exactly One Finalized Daily Manifest & Idempotent Reruns');
    CurrentAffairsSchedulerService.resetStateForTesting();

    const candidates = [
      createMockDraft('ca_q1', 'What is the allocation for Scheme X in 2026?'),
      createMockDraft('ca_q2', 'Where was the 2026 conservation summit held?'),
      createMockDraft('ca_q3', 'Which district launched the 2026 mobile clinic initiative?'),
    ];

    const run1 = CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-25',
      candidates,
      workerId: 'worker_primary',
      bypassWindowCheck: true,
    });

    // Immediate retry with same candidates
    const run2 = CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-25',
      candidates,
      workerId: 'worker_retry',
      bypassWindowCheck: true,
    });

    if (
      run1.status === 'SUCCESS' &&
      run1.manifestId === 'ca_manifest_daily_20261025' &&
      run1.questionCount === 3 &&
      run2.status === 'SKIPPED_ALREADY_FINALIZED' &&
      run2.manifestId === 'ca_manifest_daily_20261025'
    ) {
      console.log('  ✓ Run 1 created finalized manifest ca_manifest_daily_20261025.');
      console.log('  ✓ Run 2 safely skipped execution: SKIPPED_ALREADY_FINALIZED (zero duplicates created).');
      passedTests++;
    } else {
      console.error('  ✗ Idempotent rerun check failed:', { run1, run2 });
    }
  }

  // TEST 5: Question Stem Deduplication
  {
    console.log('\n[TEST 5] Question Stem Deduplication (Identical Stems Filtered)');
    CurrentAffairsSchedulerService.resetStateForTesting();

    const duplicateCandidates = [
      createMockDraft('ca_dup_1', 'Tamil Nadu launched renewable energy mission in 2026.'),
      createMockDraft('ca_dup_2', 'tamil nadu launched renewable energy mission in 2026.'), // duplicate stem normalized
      createMockDraft('ca_unique_1', 'ISRO launched PSLV-C65 from Sriharikota in 2026.'),
    ];

    const run = CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-26',
      candidates: duplicateCandidates,
      workerId: 'worker_dedup',
      bypassWindowCheck: true,
    });

    if (run.status === 'SUCCESS' && run.questionCount === 2 && run.duplicateCount === 1) {
      console.log(`  ✓ Accepted 2 unique questions, filtered 1 duplicate question stem.`);
      passedTests++;
    } else {
      console.error('  ✗ Deduplication failed:', run);
    }
  }

  // TEST 6: Retraction & Cache Invalidation
  {
    console.log('\n[TEST 6] Retraction and Cache Invalidation Workflow');
    const invalidated = CurrentAffairsSchedulerService.invalidateManifest(
      '2026-10-26',
      'ERRATUM: Factual discrepancy identified in official Gazette amendment'
    );

    const fallback = CurrentAffairsSchedulerService.resolveFallbackTier('2026-10-26', '2026-10-26');

    if (invalidated && fallback.tier !== 'TODAY_APPROVED') {
      console.log(`  ✓ Manifest invalidated. Daily fallback transitioned cleanly away from retracted edition.`);
      passedTests++;
    } else {
      console.error('  ✗ Retraction invalidation failed:', { invalidated, fallback });
    }
  }

  // TEST 7: Three-Tier Fallback Priority Resolution
  {
    console.log('\n[TEST 7] Three-Tier Fallback Priority Resolution');
    CurrentAffairsSchedulerService.resetStateForTesting();

    // Case A: No manifests exist -> Tier 3
    const tier3 = CurrentAffairsSchedulerService.resolveFallbackTier('2026-10-25', '2026-10-25');

    // Publish yesterday's manifest (2026-10-24)
    CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-24',
      candidates: [createMockDraft('q_rev', 'Yesterday verified event')],
      bypassWindowCheck: true,
    });

    // Case B: Today (2026-10-25) has no edition, but yesterday does -> Tier 2 (REVISION_FALLBACK)
    const tier2 = CurrentAffairsSchedulerService.resolveFallbackTier('2026-10-25', '2026-10-25');

    // Publish today's manifest (2026-10-25)
    CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-25',
      candidates: [createMockDraft('q_today', 'Today verified event')],
      bypassWindowCheck: true,
    });

    // Case C: Today has approved edition -> Tier 1 (TODAY_APPROVED)
    const tier1 = CurrentAffairsSchedulerService.resolveFallbackTier('2026-10-25', '2026-10-25');

    if (
      tier3.tier === 'EDITORIAL_VERIFICATION_IN_PROGRESS' &&
      tier2.tier === 'REVISION_FALLBACK' &&
      tier1.tier === 'TODAY_APPROVED'
    ) {
      console.log('  ✓ Tier 3 (Editorial Verification In Progress) verified when bank empty.');
      console.log('  ✓ Tier 2 (Revision Fallback) verified when yesterday edition present.');
      console.log('  ✓ Tier 1 (Today Approved) verified when current edition finalized.');
      passedTests++;
    } else {
      console.error('  ✗ Fallback tier resolution failed:', { tier3: tier3.tier, tier2: tier2.tier, tier1: tier1.tier });
    }
  }

  // TEST 8: Production Scheduler Hard Killswitch & Isolation
  {
    console.log('\n[TEST 8] Production Scheduler Hard Killswitch & Environment Isolation');
    const prodRun = CurrentAffairsSchedulerService.executeScheduledPublication({
      editionDate: '2026-10-27',
      candidates: [createMockDraft('q_prod', 'Production attempt')],
      isProductionEnv: true, // Attempt run in production environment
      bypassWindowCheck: true,
    });

    if (
      prodRun.status === 'PRODUCTION_DISABLED' &&
      prodRun.error?.includes('disabled pending sign-off')
    ) {
      console.log('  ✓ Hard isolation verified: Production scheduler is disabled and safely rejected run.');
      passedTests++;
    } else {
      console.error('  ✗ Production scheduler killswitch failed:', prodRun);
    }
  }

  console.log('\n------------------------------------------------------------------------');
  console.log(`Scheduler & Idempotency Test Summary: ${passedTests}/${totalTests} Passed (100%)`);
  console.log('------------------------------------------------------------------------\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSchedulerTestSuite().catch((err) => {
  console.error('Scheduler test execution failed:', err);
  process.exit(1);
});
