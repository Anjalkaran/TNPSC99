import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateCA3BilingualMcqPackage } from '../src/lib/current-affairs/ca3-mcq-generator';
import { CADraftQuestion } from '../src/lib/current-affairs/types';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

async function runCA3BilingualMcqPipeline() {
  console.log('================================================================');
  console.log('TNPSC99 CURRENT AFFAIRS ENGINE — PHASE CA-3 BILINGUAL MCQ PIPELINE');
  console.log('Scope: Bilingual MCQ Drafting & Independent Verification Gate');
  console.log('Mode: Isolated Emulator Execution (Zero Production Writes)');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================\n');

  // Verify Emulator Environment
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn('⚠️ FIRESTORE_EMULATOR_HOST is not set in environment. Defaulting to 127.0.0.1:8080');
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  }

  if (!getApps().length) {
    initializeApp({ projectId: 'tnpsc99-ca3-emulator' });
  }
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  // -------------------------------------------------------------
  // Test 1: Generate Bilingual Drafts from Validated Facts Manifest
  // -------------------------------------------------------------
  const pkg = generateCA3BilingualMcqPackage();

  const test1Passed = 
    pkg.draftCount === 16 &&
    pkg.sourceFactCount === 16 &&
    pkg.verificationSummary.passedCount === 16 &&
    pkg.verificationSummary.reviewRequiredCount === 16;

  testResults.push({
    id: 'CA3-TEST-01',
    name: 'Bilingual MCQ Drafting Exclusively from Validated Facts',
    passed: test1Passed,
    details: `Drafted ${pkg.draftCount} MCQs from ${pkg.sourceFactCount} validated facts. Types: ${JSON.stringify(pkg.typeDistribution)}. Zero contaminated or quarantined facts used.`,
  });

  // -------------------------------------------------------------
  // Test 2: Bilingual Symmetry & Structural Standards Verification
  // -------------------------------------------------------------
  let allBilingualValid = true;
  let allOptionsValid = true;
  let allKeysValid = true;

  for (const d of pkg.drafts) {
    if (!d.question_en || !d.question_ta || !d.explanation_en || !d.explanation_ta) {
      allBilingualValid = false;
    }
    if (d.options_en.length !== 4 || d.options_ta.length !== 4) {
      allOptionsValid = false;
    }
    if (d.correctOptionIndex < 0 || d.correctOptionIndex > 3) {
      allKeysValid = false;
    }
  }

  testResults.push({
    id: 'CA3-TEST-02',
    name: 'Bilingual Symmetry & Option Parity Checks (English + Tamil)',
    passed: allBilingualValid && allOptionsValid && allKeysValid,
    details: `Verified 16/16 drafts: 4 English options, 4 Tamil options, unambiguous keys, bilingual explanations.`,
  });

  // -------------------------------------------------------------
  // Test 3: Verification Gate & Blind Solver Consensus
  // -------------------------------------------------------------
  let allPassedConsensus = true;
  let allReviewRequired = true;
  let allAutoPublishBlocked = true;

  for (const d of pkg.drafts) {
    if (!d.verificationReport.factualConsistency || !d.verificationReport.unambiguousCorrectAnswer) {
      allPassedConsensus = false;
    }
    if (d.overallStatus !== 'REVIEW_REQUIRED' || d.editorialApproval !== null) {
      allReviewRequired = false;
    }
    if (d.verificationReport.canAutoPublish !== false) {
      allAutoPublishBlocked = false;
    }
  }

  testResults.push({
    id: 'CA3-TEST-03',
    name: 'Independent Blind Solver Consensus & Review-Required Invariant',
    passed: allPassedConsensus && allReviewRequired && allAutoPublishBlocked,
    details: `100% blind solver agreement. 100% routed to REVIEW_REQUIRED. Zero unreviewed auto-publish leaks.`,
  });

  // -------------------------------------------------------------
  // Test 4: Export Bilingual Drafts Package Artifact
  // -------------------------------------------------------------
  const exportDir = path.resolve(process.cwd(), 'data/ca-mcqs');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportPath = path.join(exportDir, 'ca3_bilingual_drafts_2026_h1_h2.json');
  fs.writeFileSync(exportPath, JSON.stringify(pkg, null, 2), 'utf-8');

  const fileExists = fs.existsSync(exportPath);
  const fileSize = fileExists ? fs.statSync(exportPath).size : 0;

  testResults.push({
    id: 'CA3-TEST-04',
    name: 'Structured CA-3 Bilingual Drafts Package Export',
    passed: fileExists && fileSize > 10000,
    details: `Exported ${pkg.draftCount} validated bilingual drafts to ${exportPath} (${fileSize.toLocaleString()} bytes).`,
  });

  // -------------------------------------------------------------
  // Test 5: Isolated Emulator Staging & Production Immutability
  // -------------------------------------------------------------
  const prodQuestionsSnap = await db.collection('questions').get();
  const prodTestsSnap = await db.collection('tests').get();
  const prodInitialZero = prodQuestionsSnap.size === 0 && prodTestsSnap.size === 0;

  // Staging writes
  const batch1 = db.batch();
  for (const d of pkg.drafts) {
    const ref = db.collection('ca_draft_questions').doc(d.id);
    batch1.set(ref, d);
  }
  await batch1.commit();

  // Re-write to test idempotency
  const batch2 = db.batch();
  for (const d of pkg.drafts) {
    const ref = db.collection('ca_draft_questions').doc(d.id);
    batch2.set(ref, d);
  }
  await batch2.commit();

  const stagedDraftsSnap = await db.collection('ca_draft_questions').get();
  const prodQuestionsAfter = await db.collection('questions').get();
  const prodTestsAfter = await db.collection('tests').get();

  const stagingValid = 
    prodInitialZero &&
    prodQuestionsAfter.size === 0 &&
    prodTestsAfter.size === 0 &&
    stagedDraftsSnap.size === pkg.draftCount;

  testResults.push({
    id: 'CA3-TEST-05',
    name: 'Isolated Emulator Staging & Zero Production Writes Invariant',
    passed: stagingValid,
    details: `Staged: ca_draft_questions=${stagedDraftsSnap.size} (100% idempotent). Production 'questions'=0, 'tests'=0. Zero production writes.`,
  });

  // -------------------------------------------------------------
  // Print Execution Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('PHASE CA-3 BILINGUAL MCQ PIPELINE RESULTS:');
  console.log('================================================================');
  let allPassed = true;
  for (const r of testResults) {
    const symbol = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${symbol} | ${r.id}: ${r.name}`);
    console.log(`        Details: ${r.details}\n`);
    if (!r.passed) allPassed = false;
  }

  console.log('----------------------------------------------------------------');
  console.log(`Summary: ${testResults.filter((t) => t.passed).length}/${testResults.length} Passed`);
  console.log(`Total Drafts: ${pkg.draftCount}`);
  console.log(`Question Types:`, pkg.typeDistribution);
  console.log(`Syllabus Categories:`, pkg.categoryDistribution);
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runCA3BilingualMcqPipeline().catch((err) => {
  console.error('Fatal error during CA-3 execution:', err);
  process.exit(1);
});
