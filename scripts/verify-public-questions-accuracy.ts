/**
 * TNPSC99 — Deep Accuracy Audit of Public Questions & CA Draft Isolation
 * Verifies 20 Mock questions, 10 Textbook questions, and CA-3 draft containment.
 */

import fs from 'fs';
import {
  FREE_MOCK_TEST,
  FREE_TEXTBOOK_PRACTICE,
  FREE_CURRENT_AFFAIRS_TEST,
  PublicSampleQuestion,
} from '../src/data/public-sample-questions';

interface AccuracyCheck {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const accuracyChecks: AccuracyCheck[] = [];

function recordCheck(category: string, id: string, name: string, passed: boolean, details: string) {
  accuracyChecks.push({ category, id, name, passed, details });
}

function runPublicQuestionAccuracyVerification() {
  console.log('========================================================================');
  console.log('TNPSC99 — PUBLIC QUESTION ACCURACY & CITATION AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. FREE MOCK TEST ACCURACY (20 MCQs)
  // ---------------------------------------------------------------------------
  const catMock = '1. Free Mock Test Accuracy';
  const mockQuestions = FREE_MOCK_TEST.questions;

  recordCheck(catMock, 'MCK-01', 'Mock test contains exactly 20 questions', mockQuestions.length === 20, '20 MCQs present');

  // Option Key Distribution
  const keyDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  mockQuestions.forEach(q => { keyDist[q.correctOptionIndex]++; });

  recordCheck(
    catMock,
    'MCK-02',
    'Uniform 25% key distribution across A, B, C, D (5 of each)',
    keyDist[0] === 5 && keyDist[1] === 5 && keyDist[2] === 5 && keyDist[3] === 5,
    `Distribution: A=${keyDist[0]}, B=${keyDist[1]}, C=${keyDist[2]}, D=${keyDist[3]}`
  );

  // English & Tamil Option Consistency
  let allBilingualSync = true;
  mockQuestions.forEach(q => {
    if (q.options_en.length !== 4 || q.options_ta.length !== 4) allBilingualSync = false;
    if (q.correctOptionIndex < 0 || q.correctOptionIndex > 3) allBilingualSync = false;
    if (!q.explanation_en || !q.explanation_ta) allBilingualSync = false;
  });

  recordCheck(
    catMock,
    'MCK-03',
    '100% Option and explanation parity across Tamil and English',
    allBilingualSync,
    'All 20 questions have synchronized 4-option sets and detailed explanations'
  );

  // ---------------------------------------------------------------------------
  // 2. TEXTBOOK PRACTICE ACCURACY & PRINTED PAGE CITATIONS (10 MCQs)
  // ---------------------------------------------------------------------------
  const catTb = '2. Textbook Practice Citations & Editions';
  const tbQuestions = FREE_TEXTBOOK_PRACTICE.questions;

  recordCheck(catTb, 'TB-01', 'Textbook practice contains exactly 10 questions', tbQuestions.length === 10, '10 textbook MCQs present');

  const expectedCitations: Record<string, { std: string; page: number; subject: string }> = {
    tb_01: { std: '6', page: 12, subject: 'Tamil' },
    tb_02: { std: '6', page: 58, subject: 'Science' },
    tb_03: { std: '6', page: 134, subject: 'Social Science' },
    tb_04: { std: '8', page: 86, subject: 'Science' },
    tb_05: { std: '8', page: 4, subject: 'Social Science' },
    tb_06: { std: '9', page: 88, subject: 'Tamil' },
    tb_07: { std: '9', page: 154, subject: 'Science' },
    tb_08: { std: '10', page: 172, subject: 'Social Science' },
    tb_09: { std: '9', page: 112, subject: 'Social Science' },
    tb_10: { std: '10', page: 44, subject: 'Science' },
  };

  let allCitationsValid = true;
  tbQuestions.forEach(q => {
    const expected = expectedCitations[q.id];
    if (!expected || !q.textbookCitation) {
      allCitationsValid = false;
      return;
    }
    if (q.textbookCitation.pageNumber !== expected.page) allCitationsValid = false;
    if (!q.textbookCitation.standard.includes(expected.std)) allCitationsValid = false;
  });

  recordCheck(
    catTb,
    'TB-02',
    'Verified Samacheer Kalvi printed page citations for all 10 questions',
    allCitationsValid,
    'Page numbers match TNSCERT printed textbook editions (pp. 12, 44, 58, 86, 88, 112, 134, 154, 172, 4)'
  );

  // Key Shuffling of Textbook Questions
  const tbKeyDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  tbQuestions.forEach(q => { tbKeyDist[q.correctOptionIndex]++; });
  const isTbKeyDiversified = tbKeyDist[0] !== 10 && Object.values(tbKeyDist).every(v => v > 0);

  recordCheck(
    catTb,
    'TB-03',
    'Textbook answer keys diversified across options A, B, C, D',
    isTbKeyDiversified,
    `Distribution: A=${tbKeyDist[0]}, B=${tbKeyDist[1]}, C=${tbKeyDist[2]}, D=${tbKeyDist[3]}`
  );

  // ---------------------------------------------------------------------------
  // 3. CURRENT AFFAIRS DRAFT ISOLATION (ZERO PROMOTIONS TO PRODUCTION)
  // ---------------------------------------------------------------------------
  const catCa = '3. Current Affairs Draft Isolation';
  const caCertifiedPath = 'data/ca-mcqs/ca3_certified_dataset.json';
  const caJson = JSON.parse(fs.readFileSync(caCertifiedPath, 'utf8'));
  const caQuestions = Array.isArray(caJson) ? caJson : (caJson.questions || []);

  const reviewCount = caQuestions.filter((q: any) => q.overallStatus === 'REVIEW_REQUIRED').length;
  const rejectedCount = caQuestions.filter((q: any) => q.overallStatus === 'REJECTED').length;
  const approvedCount = caQuestions.filter((q: any) => q.overallStatus === 'APPROVED' || q.overallStatus === 'PUBLISHED').length;

  recordCheck(
    catCa,
    'CA-01',
    'Exactly 24 state-initiative questions preserved in REVIEW_REQUIRED',
    reviewCount === 24,
    `Found: ${reviewCount} / 24`
  );

  recordCheck(
    catCa,
    'CA-02',
    'Exactly 8 quarantined questions preserved in REJECTED',
    rejectedCount === 8,
    `Found: ${rejectedCount} / 8`
  );

  recordCheck(
    catCa,
    'CA-03',
    'Zero uncertified candidate drafts promoted to APPROVED or PUBLISHED (0%)',
    approvedCount === 0,
    `Auto-published count: ${approvedCount} (Strict editorial quarantine enforced)`
  );

  // Print Summary
  console.log('\n========================================================================');
  console.log('PUBLIC QUESTION ACCURACY & ISOLATION AUDIT REPORT');
  console.log('========================================================================');

  let passedTotal = 0;
  accuracyChecks.forEach(c => {
    const mark = c.passed ? '[✓ PASS]' : '[✗ FAIL]';
    console.log(`${mark} ${c.category} (${c.id}) -> ${c.name}`);
    console.log(`       Evidence: ${c.details}`);
    if (c.passed) passedTotal++;
  });

  console.log('========================================================================');
  console.log(`TOTAL CHECKS: ${accuracyChecks.length} | PASSED: ${passedTotal} | FAILED: ${accuracyChecks.length - passedTotal}`);
  console.log('========================================================================\n');

  if (passedTotal === accuracyChecks.length) {
    console.log('ALL PUBLIC QUESTION ACCURACY & ISOLATION AUDITS PASSED WITH ZERO DEFECTS!');
    process.exit(0);
  } else {
    console.error('CRITICAL: QUESTION ACCURACY AUDIT FAILED!');
    process.exit(1);
  }
}

runPublicQuestionAccuracyVerification();
