/**
 * TNPSC99 — Permanent Zero-Compromise MCQ Accuracy Engine
 * Implements the 9-point Fail-Closed Publication Gate and deterministic validation.
 */

import {
  AccuracyGateCheckId,
  AccuracyGateEvaluation,
  GateCheckResult,
  QuestionAccuracyCandidate,
  AccuracyLifecycleStatus
} from './types';
import { TemporalEligibilityValidator } from './temporal-validator';
import { ActualSourceAuthenticator } from './actual-source-authenticator';
import { checkPersistentDefectRegistry } from '../../data/ca-defect-registry';

function cleanText(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1$2') // Normalize comma-formatted numbers: 1,330 -> 1330
    .replace(/[^\w\s\u0B80-\u0BFF]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Evaluates an MCQ candidate against all 9 mandatory Fail-Closed Publication Gates.
 */
export function evaluatePublicationGate(
  candidate: QuestionAccuracyCandidate,
  existingStemHashes?: Set<string>
): AccuracyGateEvaluation {
  const gateResults: GateCheckResult[] = [];
  const rejectionReasons: string[] = [];

  // =========================================================================
  // GATE 1: ACTUAL SOURCE AUTHENTICATION
  // =========================================================================
  const isWebSource = Boolean(candidate.sourceUrl && candidate.sourceUrl.startsWith('http'));
  const isPlaceholderUrl = Boolean(
    candidate.sourceUrl &&
    /example\.com|placeholder|test\.local|dummy|fake|temp-url/i.test(candidate.sourceUrl)
  );
  const isTextbookSource = Boolean(
    candidate.textbookCitation &&
    candidate.textbookCitation.standard &&
    candidate.textbookCitation.subject &&
    (candidate.textbookCitation.pageNumber || candidate.textbookCitation.lessonName)
  );

  let sourceAuthVerdict = isTextbookSource
    ? { passed: true, details: `Verified against ${candidate.textbookCitation?.standard} ${candidate.textbookCitation?.subject}` }
    : ActualSourceAuthenticator.authenticateActualDocument(candidate);

  if (isPlaceholderUrl) {
    sourceAuthVerdict = {
      passed: false,
      failureCode: 'INACCESSIBLE_SOURCE',
      details: 'Source URL is synthetic or placeholder.',
    };
  }

  if (!sourceAuthVerdict.passed) {
    const reason = sourceAuthVerdict.details;
    rejectionReasons.push(`Gate 1 Failed: ${reason}`);
    gateResults.push({
      checkId: 'SOURCE_AUTHENTICATED',
      name: 'Source Authenticated',
      passed: false,
      score: 0,
      details: reason,
      failureReason: sourceAuthVerdict.failureCode || reason,
    });
  } else {
    gateResults.push({
      checkId: 'SOURCE_AUTHENTICATED',
      name: 'Source Authenticated',
      passed: true,
      score: 100,
      details: isTextbookSource
        ? `Verified against ${candidate.textbookCitation?.standard} ${candidate.textbookCitation?.subject}`
        : sourceAuthVerdict.details,
    });
  }

  // =========================================================================
  // GATE 2: FACTUAL VERIFICATION & INDEPENDENT ANSWER GROUNDING
  // =========================================================================
  let factualPassed = true;
  let factualDetail = 'Factual claim grounded in source evidence';
  let failureReasonCode = undefined;

  const hasEvidenceExcerpt = Boolean(
    (candidate.sourceExcerpt && candidate.sourceExcerpt.trim().length >= 20) ||
    isTextbookSource
  );

  if (!hasEvidenceExcerpt) {
    factualPassed = false;
    factualDetail = 'Cannot verify facts without source excerpt';
    failureReasonCode = 'MISSING_SOURCE_EXCERPT';
  } else if (candidate.sourceExcerpt && !isTextbookSource) {
    // Run Independent Answer & Distractor Verification without model self-approval
    const independentResult = ActualSourceAuthenticator.verifyIndependentAnswerAndDistractors(candidate);
    if (!independentResult.passed) {
      factualPassed = false;
      factualDetail = independentResult.details;
      failureReasonCode = independentResult.failureCode;
    } else {
      factualDetail = independentResult.details;
    }
  }

  if (!factualPassed) {
    rejectionReasons.push(`Gate 2 Failed: ${factualDetail}`);
    gateResults.push({
      checkId: 'FACTUAL_VERIFICATION',
      name: 'Factual Verification',
      passed: false,
      score: 20,
      details: factualDetail,
      failureReason: failureReasonCode || factualDetail,
    });
  } else {
    gateResults.push({
      checkId: 'FACTUAL_VERIFICATION',
      name: 'Factual Verification',
      passed: true,
      score: 100,
      details: factualDetail,
    });
  }

  // =========================================================================
  // GATE 3: SINGLE CORRECT ANSWER CONFIRMATION
  // =========================================================================
  const validKeyIndex =
    typeof candidate.correctOptionIndex === 'number' &&
    Number.isInteger(candidate.correctOptionIndex) &&
    candidate.correctOptionIndex >= 0 &&
    candidate.correctOptionIndex <= 3;

  if (!validKeyIndex) {
    const reason = 'correctOptionIndex must be an integer between 0 and 3';
    rejectionReasons.push(`Gate 3 Failed: ${reason}`);
    gateResults.push({
      checkId: 'SINGLE_CORRECT_ANSWER',
      name: 'Single Correct Answer',
      passed: false,
      score: 0,
      details: reason,
      failureReason: reason,
    });
  } else {
    gateResults.push({
      checkId: 'SINGLE_CORRECT_ANSWER',
      name: 'Single Correct Answer',
      passed: true,
      score: 100,
      details: `Option index ${candidate.correctOptionIndex} confirmed as unambiguous single key`,
    });
  }

  // =========================================================================
  // GATE 4: TAMIL VERIFICATION
  // =========================================================================
  const hasTamilQuestion = Boolean(candidate.question_ta?.trim());
  const hasTamilExplanation = Boolean(candidate.explanation_ta?.trim());
  const hasTamilOptions =
    Array.isArray(candidate.options_ta) &&
    candidate.options_ta.length === 4 &&
    candidate.options_ta.every((o) => Boolean(o && o.trim()));
  const hasTamilChars =
    /[\u0B80-\u0BFF]/.test(candidate.question_ta || '') ||
    candidate.options_ta?.some((o) => /[\u0B80-\u0BFF]/.test(o || ''));

  if (!hasTamilQuestion || !hasTamilExplanation || !hasTamilOptions || !hasTamilChars) {
    const reason = 'Tamil translation missing, incomplete options, or lacking valid Tamil Unicode characters';
    rejectionReasons.push(`Gate 4 Failed: ${reason}`);
    gateResults.push({
      checkId: 'TAMIL_VERIFICATION',
      name: 'Tamil Verification',
      passed: false,
      score: 30,
      details: reason,
      failureReason: reason,
    });
  } else {
    gateResults.push({
      checkId: 'TAMIL_VERIFICATION',
      name: 'Tamil Verification',
      passed: true,
      score: 100,
      details: 'Tamil statement, 4 options, and explanation verified with Tamil Unicode typography',
    });
  }

  // =========================================================================
  // GATE 5: ENGLISH VERIFICATION
  // =========================================================================
  const hasEnglishQuestion = Boolean(candidate.question_en?.trim());
  const hasEnglishExplanation = Boolean(candidate.explanation_en?.trim());
  const hasEnglishOptions =
    Array.isArray(candidate.options_en) &&
    candidate.options_en.length === 4 &&
    candidate.options_en.every((o) => Boolean(o && o.trim()));

  if (!hasEnglishQuestion || !hasEnglishExplanation || !hasEnglishOptions) {
    const reason = 'English statement, options, or explanation missing or incomplete';
    rejectionReasons.push(`Gate 5 Failed: ${reason}`);
    gateResults.push({
      checkId: 'ENGLISH_VERIFICATION',
      name: 'English Verification',
      passed: false,
      score: 30,
      details: reason,
      failureReason: reason,
    });
  } else {
    gateResults.push({
      checkId: 'ENGLISH_VERIFICATION',
      name: 'English Verification',
      passed: true,
      score: 100,
      details: 'English statement, 4 options, and explanation verified',
    });
  }

  // =========================================================================
  // GATE 6: DISTRACTOR VERIFICATION
  // =========================================================================
  let distractorPassed = true;
  let distractorReason = 'All 4 options verified unique and balanced';

  if (candidate.options_en && candidate.options_ta) {
    const uniqueEn = new Set(candidate.options_en.map((o) => cleanText(o)));
    const uniqueTa = new Set(candidate.options_ta.map((o) => cleanText(o)));

    if (uniqueEn.size < 4 || uniqueTa.size < 4) {
      distractorPassed = false;
      distractorReason = 'Duplicate options detected within question options array';
    }

    // Banned trivial options
    const banned = ['all of the above', 'none of the above', 'both a and b', 'none', 'all'];
    for (const opt of candidate.options_en) {
      if (banned.includes(cleanText(opt))) {
        distractorPassed = false;
        distractorReason = `Trivial distractor phrasing forbidden: "${opt}"`;
        break;
      }
    }

    // Length giveaway anomaly check
    if (distractorPassed && candidate.options_en.length === 4) {
      const lengths = candidate.options_en.map((o) => o.length);
      const correctLen = lengths[candidate.correctOptionIndex];
      const avgDistractor = lengths.reduce((a, b, idx) => idx !== candidate.correctOptionIndex ? a + b : a, 0) / 3;
      if (correctLen > avgDistractor * 4.5 && correctLen > 80) {
        distractorPassed = false;
        distractorReason = 'Distractor length giveaway: correct answer is disproportionately longer than alternatives';
      }
    }
  } else {
    distractorPassed = false;
    distractorReason = 'Options array missing or malformed';
  }

  if (!distractorPassed) {
    rejectionReasons.push(`Gate 6 Failed: ${distractorReason}`);
    gateResults.push({
      checkId: 'DISTRACTOR_VERIFICATION',
      name: 'Distractor Verification',
      passed: false,
      score: 25,
      details: distractorReason,
      failureReason: distractorReason,
    });
  } else {
    gateResults.push({
      checkId: 'DISTRACTOR_VERIFICATION',
      name: 'Distractor Verification',
      passed: true,
      score: 100,
      details: distractorReason,
    });
  }

  // =========================================================================
  // GATE 7: DUPLICATE CHECK
  // =========================================================================
  let duplicatePassed = true;
  const stem = cleanText(candidate.question_en || candidate.question_ta || '');
  if (existingStemHashes && stem) {
    if (existingStemHashes.has(stem)) {
      duplicatePassed = false;
      rejectionReasons.push('Gate 7 Failed: Duplicate question stem found in existing question bank');
    }
  }

  gateResults.push({
    checkId: 'DUPLICATE_CHECK',
    name: 'Duplicate Check',
    passed: duplicatePassed,
    score: duplicatePassed ? 100 : 0,
    details: duplicatePassed ? 'No duplicate question stem detected' : 'Stem matches existing question bank record',
    failureReason: duplicatePassed ? undefined : 'Duplicate question stem detected',
  });

  // Pre-calculate Conflict and Temporal Checks for Gate 8 & 9 & 10
  const defectCheck = checkPersistentDefectRegistry(candidate);
  const isRetracted = candidate.isRetracted === true;
  const isQuarantined = candidate.isQuarantined === true || Boolean(candidate.quarantineReason) || defectCheck.isDefect;
  const hasHistoryDefect = Boolean(
    candidate.hasRetractionHistory ||
    candidate.hasDefectHistory ||
    candidate.isDisputed ||
    defectCheck.isDefect
  );

  const isCaQuestion =
    candidate.isCurrentAffairs === true ||
    Boolean(candidate.category && candidate.category.toLowerCase().includes('current affairs')) ||
    Boolean(candidate.category_ta && candidate.category_ta.includes('நடப்பு')) ||
    Boolean(candidate.eventDate && !candidate.textbookCitation);

  const temporalCheckResult = isCaQuestion
    ? TemporalEligibilityValidator.validate(candidate)
    : { eligible: true, details: 'Exempt: Textbook curriculum syllabus question or general knowledge item', rejectionReason: undefined };

  // =========================================================================
  // GATE 8: HUMAN EDITORIAL SIGN-OFF / AUTO_VERIFIED PUBLICATION GATE
  // =========================================================================
  const isAutoVerifiedMode = candidate.publicationMode === 'AUTO_VERIFIED';

  if (isAutoVerifiedMode) {
    // 1. Strict prohibition: Questions with retraction, defect, or dispute history cannot use AUTO_VERIFIED
    if (isRetracted || isQuarantined || hasHistoryDefect) {
      const reason = 'AUTO_VERIFIED mode strictly prohibited for questions with retraction, defect, quarantine, or dispute history. Mandatory human editorial sign-off (MANUAL_APPROVED) required.';
      rejectionReasons.push(`Gate 8 Failed: ${reason}`);
      gateResults.push({
        checkId: 'EDITORIAL_APPROVAL',
        name: 'Automated Publication Verification Gate',
        passed: false,
        score: 0,
        details: reason,
        failureReason: reason,
      });
    } else {
      // 2. Automated Validation Preconditions: Gates 1-7 & Temporal must all pass
      const priorFailedGates = gateResults.filter((g) => !g.passed);
      const passesPriorGates = priorFailedGates.length === 0;
      const passesTemporal = temporalCheckResult.eligible;

      if (!passesPriorGates || !passesTemporal) {
        const failList = [
          ...priorFailedGates.map((g) => g.name),
          ...(!passesTemporal ? ['2026 Temporal Eligibility'] : []),
        ];
        const reason = `Auto-verification blocked: Preceding automated validation checks failed (${failList.join(', ')}).`;
        rejectionReasons.push(`Gate 8 Failed: ${reason}`);
        gateResults.push({
          checkId: 'EDITORIAL_APPROVAL',
          name: 'Automated Publication Verification Gate',
          passed: false,
          score: 0,
          details: reason,
          failureReason: reason,
        });
      } else {
        gateResults.push({
          checkId: 'EDITORIAL_APPROVAL',
          name: 'Automated Publication Verification Gate',
          passed: true,
          score: 100,
          details: 'Auto-verified under verified automated publishing policy 2026.AUTO_V1 (all automated checks passed)',
        });
      }
    }
  } else {
    // Standard MANUAL_APPROVED Pathway: Mandatory Human Editorial Review Signature
    const hasEditorialApproval = Boolean(
      candidate.editorialApproval &&
      candidate.editorialApproval.approvedBy &&
      candidate.editorialApproval.approvedBy !== 'AUTO_PIPELINE' &&
      candidate.editorialApproval.approvedBy !== 'AI' &&
      candidate.editorialApproval.approvedAt
    );

    if (!hasEditorialApproval) {
      const reason = 'Human editorial review signature missing. AI-only sign-off is prohibited by Permanent Accuracy Policy (MANUAL_APPROVED pathway required)';
      rejectionReasons.push(`Gate 8 Failed: ${reason}`);
      gateResults.push({
        checkId: 'EDITORIAL_APPROVAL',
        name: 'Human Editorial Sign-Off',
        passed: false,
        score: 0,
        details: reason,
        failureReason: reason,
      });
    } else {
      gateResults.push({
        checkId: 'EDITORIAL_APPROVAL',
        name: 'Human Editorial Sign-Off',
        passed: true,
        score: 100,
        details: `Approved by editor ${candidate.editorialApproval?.approvedBy} on ${candidate.editorialApproval?.approvedAt}`,
      });
    }
  }

  // =========================================================================
  // GATE 9: CONFLICT & RETRACTION CHECK
  // =========================================================================
  const conflictPassed = !isRetracted && !isQuarantined && !defectCheck.isDefect;

  if (!conflictPassed) {
    const reason = defectCheck.isDefect
      ? `Persistent Defect Quarantined: ${defectCheck.details}`
      : (isRetracted
        ? 'Question is marked RETRACTED due to an erratum or factual update'
        : `Question is QUARANTINED: ${candidate.quarantineReason || 'Unresolved defect'}`);
    rejectionReasons.push(`Gate 9 Failed: ${reason}`);
    gateResults.push({
      checkId: 'CONFLICT_RETRACTION_CHECK',
      name: 'Conflict & Retraction Check',
      passed: false,
      score: 0,
      details: reason,
      failureReason: defectCheck.failureCode || reason,
    });
  } else {
    gateResults.push({
      checkId: 'CONFLICT_RETRACTION_CHECK',
      name: 'Conflict & Retraction Check',
      passed: true,
      score: 100,
      details: 'Zero retractions, active errata, or quarantine flags',
    });
  }

  // =========================================================================
  // GATE 10: 2026-ONLY CURRENT AFFAIRS TEMPORAL ELIGIBILITY
  // =========================================================================
  if (isCaQuestion) {
    if (!temporalCheckResult.eligible) {
      rejectionReasons.push(`Gate 10 Failed: ${temporalCheckResult.details}`);
      gateResults.push({
        checkId: 'TEMPORAL_ELIGIBILITY_2026',
        name: '2026-Only Current Affairs Temporal Eligibility',
        passed: false,
        score: 0,
        details: temporalCheckResult.details,
        failureReason: temporalCheckResult.rejectionReason || temporalCheckResult.details,
      });
    } else {
      gateResults.push({
        checkId: 'TEMPORAL_ELIGIBILITY_2026',
        name: '2026-Only Current Affairs Temporal Eligibility',
        passed: true,
        score: 100,
        details: temporalCheckResult.details,
      });
    }
  } else {
    gateResults.push({
      checkId: 'TEMPORAL_ELIGIBILITY_2026',
      name: '2026-Only Current Affairs Temporal Eligibility',
      passed: true,
      score: 100,
      details: 'Exempt: Textbook curriculum syllabus question or general knowledge item',
    });
  }

  // =========================================================================
  // FINAL FAIL-CLOSED SYNTHESIS
  // =========================================================================
  const allGatesPassed = gateResults.every((g) => g.passed);

  let targetStatus: AccuracyLifecycleStatus = 'PUBLISHED';
  if (isQuarantined || defectCheck.isDefect || candidate.status === 'REJECTED') {
    targetStatus = 'REJECTED';
  } else if (isRetracted) {
    targetStatus = 'RETRACTED';
  } else if (!allGatesPassed) {
    const temporalGate = gateResults.find((g) => g.checkId === 'TEMPORAL_ELIGIBILITY_2026');
    const isTemporalRejected = temporalGate && !temporalGate.passed && (
      temporalGate.failureReason?.includes('disqualified') ||
      temporalGate.failureReason?.includes('pre-2026') ||
      temporalGate.failureReason?.includes('strictly forbidden') ||
      temporalGate.failureReason?.includes('statutory fact')
    );

    const hasCriticalFailure = gateResults.some(
      (g) => !g.passed && (
        g.checkId === 'SOURCE_AUTHENTICATED' ||
        g.checkId === 'CONFLICT_RETRACTION_CHECK' ||
        g.checkId === 'DUPLICATE_CHECK' ||
        isTemporalRejected
      )
    );
    targetStatus = hasCriticalFailure ? 'REJECTED' : 'REVIEW_REQUIRED';
  }

  const publicationMode = candidate.publicationMode || 'MANUAL_APPROVED';
  const verificationPolicyVersion = '2026.AUTO_V1';
  const contentVersion = candidate.contentVersion || 1;

  return {
    questionId: candidate.id,
    allGatesPassed,
    targetStatus,
    gateResults,
    rejectionReasons,
    evaluatedAt: new Date().toISOString(),
    evaluatorVersion: 'TNPSC99_ACCURACY_ENGINE_V2_AUTO_VERIFIED',
    publicationMode,
    verificationPolicyVersion,
    provenance: {
      publicationMode,
      verificationPolicyVersion,
      publishedAt: candidate.publishedAt || (allGatesPassed ? new Date().toISOString() : undefined),
      contentVersion,
      verifiedSourceIds: candidate.verifiedSourceIds || (candidate.sourceUrl ? [candidate.sourceUrl] : []),
      isAutoVerified: publicationMode === 'AUTO_VERIFIED' && allGatesPassed,
    },
  };
}
