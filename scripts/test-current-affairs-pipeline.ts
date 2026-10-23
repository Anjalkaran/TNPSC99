import { executeDailyPipeline } from '../src/lib/current-affairs/daily-pipeline';
import { verifyDraftQuestion } from '../src/lib/current-affairs/verification-engine';
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig } from '../src/lib/current-affairs/types';

interface PipelineTestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: PipelineTestResult[] = [];

async function runPipelineTestSuite() {
  console.log(`================================================================`);
  console.log(`TNPSC99 CURRENT AFFAIRS AUTOMATED PIPELINE & VERIFICATION TEST`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`================================================================\n`);

  // CP-01: End-to-End Pipeline Execution (Default Safe Policy: AUTO_PUBLISH_ENABLED = false)
  try {
    const today = '2026-10-23';
    const mockPayload = [
      {
        sourceId: 'SRC_TN_DIPR_PRESS',
        canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/cabinet-approvals',
        title: 'Tamil Nadu Cabinet Approves New Electronics Manufacturing Hub in Hosur',
        title_ta: 'ஓசூரில் புதிய மின்னணு உற்பத்தி மையத்திற்கு தமிழ்நாடு அமைச்சரவை ஒப்புதல்',
        rawPayload: '<div>The Cabinet approved an investment of Rs 1,800 crore for electronics manufacturing cluster in Hosur.</div>',
        publicationDate: today,
        eventDate: today,
      },
      {
        sourceId: 'SRC_ISRO_MISSIONS',
        canonicalUrl: 'https://www.isro.gov.in/updates/2026/10/chandrayaan4-docking',
        title: 'ISRO Demonstrates Autonomous Space Docking Experiment for Lunar Sample Return',
        title_ta: 'நிலவு மாதிரி சேகரிப்புக்கான விண்கல இணைப்பு சோதனையை இஸ்ரோ வெற்றிகரமாக நிறைவு செய்தது',
        rawPayload: '<div>ISRO completed autonomous docking simulation for future lunar missions at Bengaluru facility.</div>',
        publicationDate: today,
        eventDate: today,
      },
    ];

    const result = await executeDailyPipeline(today, mockPayload, new Set(), DEFAULT_PIPELINE_CONFIG, false);

    // Assert: status completed, metrics recorded, all routed to review (0 auto-published)
    const passed = 
      result.runRecord.status === 'COMPLETED' &&
      result.runRecord.metrics.rawDocumentsIngested === 2 &&
      result.runRecord.metrics.draftsGenerated === 2 &&
      result.runRecord.metrics.autoPublishedCount === 0 && // Default safe policy
      result.runRecord.metrics.routedToReviewCount === 2 &&
      result.generatedDrafts.every((d) => d.overallStatus === 'REVIEW_REQUIRED');

    results.push({
      id: 'CP-TEST-01',
      name: 'Default Safe Policy: Zero Auto-Publish & Mandatory Review Routing',
      passed,
      details: `Generated 2 drafts. AUTO_PUBLISH_ENABLED=false ensured 100% routed to REVIEW_REQUIRED. Zero unreviewed publishing.`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-01', name: 'Default Safe Policy: Zero Auto-Publish & Mandatory Review Routing', passed: false, details: err.message });
  }

  // CP-02: Conditional Auto-Publish Gate (When Feature Flag Enabled for Low-Risk Only)
  try {
    const today = '2026-10-23';
    const activeConfig: PipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      autoPublishEnabled: true,
      minVerificationScoreForAutoPublish: 90,
    };

    const mockPayload = [
      {
        sourceId: 'SRC_TN_DIPR_PRESS',
        canonicalUrl: 'https://www.tn.gov.in/pressrelease/2026/10/welfare-initiative-verified',
        title: 'Chief Minister Launches Scheme to Support Rural Artisans',
        title_ta: 'கிராமப்புற கைவினைஞர்களுக்கு ஆதரவளிக்கும் திட்டத்தை முதலமைச்சர் தொடங்கி வைத்தார்',
        rawPayload: '<div>Chief Minister launched welfare scheme for rural artisans with direct credit transfer.</div>',
        publicationDate: today,
        eventDate: today,
      },
    ];

    const result = await executeDailyPipeline(today, mockPayload, new Set(), activeConfig, false);

    const autoPublished = result.publishedQuestions.length > 0;
    const passed = autoPublished && result.publishedQuestions[0].overallStatus === 'PUBLISHED';

    results.push({
      id: 'CP-TEST-02',
      name: 'Controlled Auto-Publish Gate for Low-Risk High-Score Questions',
      passed,
      details: `Flag enabled. Low-risk welfare question auto-published with editorialApproval: 'AUTO_PIPELINE'.`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-02', name: 'Controlled Auto-Publish Gate for Low-Risk High-Score Questions', passed: false, details: err.message });
  }

  // CP-03: Verification Engine: Rejection of Banned & Trivial Phrasing
  try {
    const badInput = {
      question_en: 'Which of the following is true about the project?',
      question_ta: 'திட்டம் குறித்து பின்வருவனவற்றுள் எது உண்மை?',
      options_en: ['Point 1', 'Point 2', 'Point 3', 'All of the above'], // Banned trivial option
      options_ta: ['புள்ளி 1', 'புள்ளி 2', 'புள்ளி 3', 'மேற்கண்ட அனைத்தும்'],
      correctOptionIndex: 3,
      explanation_en: 'All statements are correct.',
      explanation_ta: 'அனைத்து அறிக்கைகளும் சரியானவை.',
      sourceEvidenceText: 'Official release discussing points 1, 2, and 3 in detail.',
      category: 'welfare_schemes',
    };

    const report = verifyDraftQuestion(badInput, DEFAULT_PIPELINE_CONFIG);
    const passed = report.distractorQualityPassed === false &&
                   report.rejectionReasons.some((r) => r.includes('Banned trivial option'));

    results.push({
      id: 'CP-TEST-03',
      name: 'Verification Engine: Anti-Triviality & Banned Phrasing Gate',
      passed,
      details: `Caught lazy 'All of the above' distractor. Marked distractorQualityPassed=false.`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-03', name: 'Verification Engine: Anti-Triviality & Banned Phrasing Gate', passed: false, details: err.message });
  }

  // CP-04: Verification Engine: Option Length Balance Check (Anti-Giveaway Tell)
  try {
    const unbalancedInput = {
      question_en: 'What is the objective of the new statutory commission?',
      question_ta: 'புதிய சட்டப்பூர்வ ஆணையத்தின் நோக்கம் என்ன?',
      options_en: [
        'Short A',
        'This is an exceptionally long and wordy answer that gives away the answer because it contains all the detailed policy text copied verbatim from the government gazette while all others are short', // 5x longer
        'Short C',
        'Short D',
      ],
      options_ta: ['சுருக்கம் அ', 'மிக நீண்ட சரியான விடை', 'சுருக்கம் இ', 'சுருக்கம் ஈ'],
      correctOptionIndex: 1,
      explanation_en: 'Detailed objective explained.',
      explanation_ta: 'விரிவான விளக்கம்.',
      sourceEvidenceText: 'Commission established to supervise state administrative reforms.',
      category: 'polity_governance',
    };

    const report = verifyDraftQuestion(unbalancedInput, DEFAULT_PIPELINE_CONFIG);
    const passed = report.rejectionReasons.some((r) => r.includes('Option length anomaly'));

    results.push({
      id: 'CP-TEST-04',
      name: 'Verification Engine: Distractor Length Balance Anomaly Detector',
      passed,
      details: `Flagged disproportionately long correct answer (anti-giveaway invariant enforced).`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-04', name: 'Verification Engine: Distractor Length Balance Anomaly Detector', passed: false, details: err.message });
  }

  // CP-05: AI Spending Cap Circuit Breaker
  try {
    const strictCapConfig: PipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      dailyAiSpendingCapUSD: 0.0001, // Very low cap to trigger breaker immediately
    };

    const payload = [
      {
        sourceId: 'SRC_TN_DIPR_PRESS',
        canonicalUrl: 'https://www.tn.gov.in/pressrelease/doc1',
        title: 'Doc 1',
        rawPayload: 'Text 1',
        publicationDate: '2026-10-23',
      },
      {
        sourceId: 'SRC_TN_DIPR_PRESS',
        canonicalUrl: 'https://www.tn.gov.in/pressrelease/doc2',
        title: 'Doc 2',
        rawPayload: 'Text 2',
        publicationDate: '2026-10-23',
      },
    ];

    const result = await executeDailyPipeline('2026-10-23', payload, new Set(), strictCapConfig, false);
    const passed = result.runRecord.status === 'CIRCUIT_BREAKER_TRIGGERED' &&
                   result.runRecord.errors.some((e) => e.includes('Daily AI spending cap'));

    results.push({
      id: 'CP-TEST-05',
      name: 'Cost Control: Hard Daily AI Spending Cap Circuit Breaker',
      passed,
      details: `Spending limit reached -> Pipeline safely halted generation and set status: CIRCUIT_BREAKER_TRIGGERED.`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-05', name: 'Cost Control: Hard Daily AI Spending Cap Circuit Breaker', passed: false, details: err.message });
  }

  // CP-06: Sunday Weekly Test Assembly (50 MCQs from Canonical Approved IDs)
  try {
    const today = '2026-10-25'; // Sunday
    // Generate 55 mock approved questions
    const mockApprovedQuestions = Array.from({ length: 55 }, (_, i) => ({
      id: `ca26_approved_${i.toString().padStart(3, '0')}`,
      factIds: [`fact_${i}`],
      eventId: `event_${i}`,
      rawDocumentId: `doc_${i}`,
      sourceUrl: `https://www.tn.gov.in/${i}`,
      monthKey: '2026-10',
      question_en: `Question ${i}?`,
      options_en: ['A', 'B', 'C', 'D'],
      correctOptionIndex: 0,
      explanation_en: `Explanation ${i}`,
      question_ta: `வினா ${i}?`,
      options_ta: ['அ', 'ஆ', 'இ', 'ஈ'],
      explanation_ta: `விளக்கம் ${i}`,
      category: 'tamil_nadu' as const,
      difficulty: 'medium' as const,
      examType: 'Group II' as const,
      questionType: 'direct' as const,
      verificationReport: {
        timestamp: new Date().toISOString(),
        factualConsistency: true,
        unambiguousCorrectAnswer: true,
        distractorQualityPassed: true,
        tamilEnglishSemanticallyIdentical: true,
        hasAuthoritativeCitation: true,
        riskLevel: 'LOW_RISK' as const,
        overallScore: 98,
        canAutoPublish: true,
        rejectionReasons: [],
      },
      overallStatus: 'APPROVED' as const,
      createdAt: `${today}T06:00:00Z`,
    }));

    // Trigger pipeline with isSunday=true and pre-approved pool
    const { compileWeeklyManifest } = await import('../src/lib/current-affairs/manifest-generator');
    const weeklyManifest = compileWeeklyManifest(43, 2026, '2026-10-19', '2026-10-25', mockApprovedQuestions);

    const passed = weeklyManifest.questionCount === 50 &&
                   weeklyManifest.type === 'weekly' &&
                   weeklyManifest.durationMinutes === 45 &&
                   weeklyManifest.tier === 'premium';

    results.push({
      id: 'CP-TEST-06',
      name: 'Sunday Weekly Test Assembler (50 Canonical IDs)',
      passed,
      details: `Assembled 50-question Weekly Current Affairs Test from approved pool. Duration: 45m, Tier: Premium.`,
    });
  } catch (err: any) {
    results.push({ id: 'CP-TEST-06', name: 'Sunday Weekly Test Assembler (50 Canonical IDs)', passed: false, details: err.message });
  }

  // Summary
  console.log(`\n================================================================`);
  console.log(`CURRENT AFFAIRS PIPELINE TEST RESULTS SUMMARY`);
  console.log(`================================================================`);
  let allPassed = true;
  for (const r of results) {
    const statusStr = r.passed ? 'PASS [✓]' : 'FAIL [✗]';
    console.log(`${r.id.padEnd(12)} | ${statusStr} | ${r.name}`);
    console.log(`             Details: ${r.details}\n`);
    if (!r.passed) allPassed = false;
  }
  console.log(`================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PIPELINE INTEGRATION TESTS PASSED' : 'TESTS FAILED'}`);
  console.log(`================================================================`);

  if (!allPassed) {
    process.exit(1);
  }
}

runPipelineTestSuite().catch((err) => {
  console.error('Pipeline test error:', err);
  process.exit(1);
});
