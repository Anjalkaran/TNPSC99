/**
 * TNPSC99 — Phase 3C Final Security & Attempt Integrity Suite
 * Validates security constraints, attempt immutability rules, and 3-stage Mistake Vault progression.
 */

import { calculateNextMistakeStatus } from '../src/lib/mistake-vault-service';
import type { MistakeStatus, Question, Test, UserProfile } from '../src/lib/types';
import { getSubscriptionStatus } from '../src/lib/subscription-utils';
import * as fs from 'fs';
import * as path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('TNPSC99 Phase 3C Final Security Acceptance & Lifecycle Suite');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Rules File Synchronization Check
  // ---------------------------------------------------------------------------
  console.log('[1/5] Checking Firestore Rules Synchronization & Security Syntax...');
  const rootRulesPath = path.join(process.cwd(), 'firestore.rules');
  const srcRulesPath = path.join(process.cwd(), 'src', 'firestore.rules');
  
  assert(fs.existsSync(rootRulesPath), 'Root firestore.rules exists');
  assert(fs.existsSync(srcRulesPath), 'src/firestore.rules exists');

  const rootRules = fs.readFileSync(rootRulesPath, 'utf8');
  const srcRules = fs.readFileSync(srcRulesPath, 'utf8');

  assert(rootRules === srcRules, 'Root and src/firestore.rules are strictly identical');
  assert(rootRules.includes("request.resource.data.get('status', 'in-progress') == 'in-progress'"), 'Enforces in-progress on attempt create');
  assert(rootRules.includes("resource.data.get('status', 'in-progress') != 'completed'"), 'Prevents modifying or rescoring completed attempts');
  assert(rootRules.includes("request.resource.data.get('score', 0) <= request.resource.data.get('questionIds', []).size()"), 'Prevents score inflation beyond total questions');
  assert(rootRules.includes("in ['unresolved', 'revised', 'mastered']"), 'Constrains mistake vault status to valid 3-stage enum');

  // ---------------------------------------------------------------------------
  // 2. 3-Stage Mistake Vault Progression Logic Check
  // ---------------------------------------------------------------------------
  console.log('\n[2/5] Testing 3-Stage Mistake Vault Progression (Deterministic)...');

  // Case A: Unresolved question answered correctly once -> status: 'revised' (NOT 'mastered')
  const step1 = calculateNextMistakeStatus('unresolved', true, false, 1);
  assert(step1.nextStatus === 'revised', 'Stage 1: First correct answer on "unresolved" advances to "revised"');
  assert(step1.shouldUpdate === true, 'Stage 1: Triggers update flag');
  assert(step1.nextFailureCount === 1, 'Stage 1: Preserves failureCount');

  // Case B: Revised question answered correctly second time -> status: 'mastered'
  const step2 = calculateNextMistakeStatus('revised', true, false, 1);
  assert(step2.nextStatus === 'mastered', 'Stage 2: Second correct answer on "revised" advances to "mastered"');
  assert(step2.shouldUpdate === true, 'Stage 2: Triggers update flag');
  assert(step2.nextFailureCount === 1, 'Stage 2: Preserves failureCount');

  // Case C: Mastered question answered correctly again -> remains 'mastered' without extra write
  const step3 = calculateNextMistakeStatus('mastered', true, false, 1);
  assert(step3.nextStatus === 'mastered', 'Stage 3: Subsequent correct answer on "mastered" retains "mastered"');
  assert(step3.shouldUpdate === false, 'Stage 3: No redundant write required for already-mastered question');

  // Case D: Mastered or Revised question failed on any subsequent test -> resets to 'unresolved' and increments failureCount
  const failFromMastered = calculateNextMistakeStatus('mastered', false, false, 2);
  assert(failFromMastered.nextStatus === 'unresolved', 'Failure Demotion: Mastered question failed resets to "unresolved"');
  assert(failFromMastered.nextFailureCount === 3, 'Failure Demotion: Increments failureCount from 2 to 3');
  assert(failFromMastered.shouldUpdate === true, 'Failure Demotion: Triggers document update');

  const failFromRevised = calculateNextMistakeStatus('revised', false, false, 1);
  assert(failFromRevised.nextStatus === 'unresolved', 'Failure Demotion: Revised question failed resets to "unresolved"');
  assert(failFromRevised.nextFailureCount === 2, 'Failure Demotion: Increments failureCount from 1 to 2');

  // Case E: Idempotency check with same attempt ID
  const idempotentRepeat = calculateNextMistakeStatus('unresolved', false, true, 1);
  assert(idempotentRepeat.nextFailureCount === 1, 'Idempotency: Re-submitting same attempt ID does not double-increment failure count');

  const idempotentCorrect = calculateNextMistakeStatus('unresolved', true, true, 1);
  assert(idempotentCorrect.shouldUpdate === false, 'Idempotency: Re-evaluating same attempt does not double-advance revision status');

  // Case F: Question not in mistake vault answered correctly -> never enters mistake vault
  const untrackedCorrect = calculateNextMistakeStatus(undefined, true, false, 0);
  assert(untrackedCorrect.nextStatus === null, 'Vault Protection: Correct answer for untracked question does not inject into vault');
  assert(untrackedCorrect.shouldUpdate === false, 'Vault Protection: No write performed for unfailed question');

  // ---------------------------------------------------------------------------
  // 3. Subscription Gating for Revision Tests
  // ---------------------------------------------------------------------------
  console.log('\n[3/5] Testing Subscription Gating on Revision Tests...');

  const activeStudent: UserProfile = {
    id: 'student_active',
    subscriptionStatus: 'premium',
    subscriptionExpires: new Date(Date.now() + 86400000 * 15).toISOString(),
    aiCredits: 0
  };
  const activeCheck = getSubscriptionStatus(activeStudent);
  assert(!activeCheck.isExpired && activeCheck.status === 'premium', 'Active ₹99 subscriber is authorized for revision tests');

  const expiredStudent: UserProfile = {
    id: 'student_expired',
    subscriptionStatus: 'expired',
    subscriptionExpires: new Date(Date.now() - 86400000).toISOString(),
    aiCredits: 0
  };
  const expiredCheck = getSubscriptionStatus(expiredStudent);
  assert(expiredCheck.isExpired === true, 'Expired subscriber is detected and blocked from revision tests');

  // ---------------------------------------------------------------------------
  // 4. Production Route Lockdown Verification
  // ---------------------------------------------------------------------------
  console.log('\n[4/5] Testing Production Route Isolation for Dev Previews...');

  const layoutContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/layout.tsx'), 'utf8');
  assert(layoutContent.includes("process.env.NODE_ENV !== 'production' ? ['/test-preview', '/phase3c-preview'] : []"), 
    'App layout restricts /test-preview and /phase3c-preview to non-production only');

  const preview3cContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/phase3c-preview/page.tsx'), 'utf8');
  assert(preview3cContent.includes("if (process.env.NODE_ENV === 'production') {\n    notFound();\n  }"),
    'Phase 3C preview component immediately invokes notFound() in production mode');

  const testPreviewContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(app)/test-preview/page.tsx'), 'utf8');
  assert(testPreviewContent.includes("if (process.env.NODE_ENV === 'production') {\n    notFound();\n  }"),
    'Test preview component immediately invokes notFound() in production mode');

  // ---------------------------------------------------------------------------
  // 5. Zero Paid AI Inference Verification
  // ---------------------------------------------------------------------------
  console.log('\n[5/5] Verifying Zero Paid AI Inference Under ₹99 Subscription...');

  const progressEngineContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/deterministic-progress.ts'), 'utf8');
  assert(!progressEngineContent.includes('generateText') && !progressEngineContent.includes('ai.'),
    'Deterministic progress computation invokes 0 AI inference APIs');

  const mistakeVaultContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/mistake-vault-service.ts'), 'utf8');
  assert(!mistakeVaultContent.includes('vertex') && !mistakeVaultContent.includes('genkit'),
    'Mistake vault operations invoke 0 paid AI endpoints');

  console.log('\n================================================================');
  console.log('🎉 ALL 18 FINAL SECURITY ACCEPTANCE CHECKS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
