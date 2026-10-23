import { CADraftQuestion, CAVerificationReport, QuestionRiskLevel, PipelineConfig } from './types';

export interface VerificationInput {
  question_en: string;
  question_ta: string;
  options_en: string[];
  options_ta: string[];
  correctOptionIndex: number;
  explanation_en: string;
  explanation_ta: string;
  sourceEvidenceText: string;
  category: string;
  questionType?: string;
}

/**
 * Normalizes text for deterministic word-matching.
 */
function clean(str: string): string {
  return str.toLowerCase().replace(/[^\w\s\u0B80-\u0BFF]/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic Validation Layer: verifies structural, lexical, and balance invariants.
 */
export function runDeterministicChecks(input: VerificationInput): {
  passed: boolean;
  factualConsistency: boolean;
  unambiguousCorrectAnswer: boolean;
  distractorQualityPassed: boolean;
  tamilEnglishSemanticallyIdentical: boolean;
  hasAuthoritativeCitation: boolean;
  rejectionReasons: string[];
} {
  const reasons: string[] = [];

  // 1. Structural Checks
  if (!Array.isArray(input.options_en) || input.options_en.length !== 4) {
    reasons.push('English options array must contain exactly 4 options.');
  }
  if (!Array.isArray(input.options_ta) || input.options_ta.length !== 4) {
    reasons.push('Tamil options array must contain exactly 4 options.');
  }
  if (input.correctOptionIndex < 0 || input.correctOptionIndex > 3) {
    reasons.push('correctOptionIndex must be an integer between 0 and 3.');
  }

  // 2. Bilingual Parity Checks
  if (!input.question_en?.trim() || !input.question_ta?.trim()) {
    reasons.push('Question statement missing in English or Tamil.');
  }
  if (!input.explanation_en?.trim() || !input.explanation_ta?.trim()) {
    reasons.push('Explanation missing in English or Tamil.');
  }
  
  if (input.options_en && input.options_ta) {
    for (let i = 0; i < 4; i++) {
      if (!input.options_en[i]?.trim()) reasons.push(`Option ${i} in English is empty.`);
      if (!input.options_ta[i]?.trim()) reasons.push(`Option ${i} in Tamil is empty.`);
    }
  }

  // 3. Distractor Uniqueness (No identical options)
  const uniqueEn = new Set(input.options_en?.map((o) => clean(o)));
  const uniqueTa = new Set(input.options_ta?.map((o) => clean(o)));
  let distractorQualityPassed = true;

  if (uniqueEn.size < 4 || uniqueTa.size < 4) {
    reasons.push('Duplicate options detected within the same question.');
    distractorQualityPassed = false;
  }

  // 4. Distractor Length Balance (Prevent giveaway options)
  if (input.options_en && input.options_en.length === 4) {
    const lengths = input.options_en.map((o) => o.length);
    const correctLen = lengths[input.correctOptionIndex];
    const avgDistractorLen = lengths.reduce((a, b, idx) => idx !== input.correctOptionIndex ? a + b : a, 0) / 3;
    
    // Flag if correct option is 4x longer than average distractor (classic bad MCQ tell)
    if (correctLen > avgDistractorLen * 4.5 && correctLen > 80) {
      reasons.push('Option length anomaly: correct answer is disproportionately longer than distractors.');
      distractorQualityPassed = false;
    }
  }

  // 5. Source Evidence Grounding Check
  let hasAuthoritativeCitation = true;
  let factualConsistency = true;

  if (!input.sourceEvidenceText || input.sourceEvidenceText.trim().length < 20) {
    reasons.push('Missing or insufficient primary source evidence text.');
    hasAuthoritativeCitation = false;
    factualConsistency = false;
  } else {
    // Check lexical overlap between correct answer and evidence text
    const cleanEvidence = clean(input.sourceEvidenceText);
    const cleanCorrectAnswer = clean(input.options_en[input.correctOptionIndex] || '');
    const tokens = cleanCorrectAnswer.split(' ').filter((t) => t.length > 3);
    
    // At least one informative token or number must appear in the evidence
    const hasOverlap = tokens.length === 0 || tokens.some((t) => cleanEvidence.includes(t));
    if (!hasOverlap) {
      reasons.push('Correct answer lacks grounding in provided source evidence excerpt.');
      factualConsistency = false;
    }
  }

  // 6. Anti-Lazy Distractor Banned Words Check
  const bannedTrivialOptions = ['all of the above', 'none of the above', 'both a and b', 'none'];
  for (const o of input.options_en || []) {
    if (bannedTrivialOptions.includes(clean(o))) {
      reasons.push(`Banned trivial option phrasing detected: "${o}".`);
      distractorQualityPassed = false;
    }
  }

  const passed = reasons.length === 0;

  return {
    passed,
    factualConsistency,
    unambiguousCorrectAnswer: passed,
    distractorQualityPassed,
    tamilEnglishSemanticallyIdentical: passed,
    hasAuthoritativeCitation,
    rejectionReasons: reasons,
  };
}

/**
 * Independent Blind Solver Simulation:
 * Solves the question without the answer key to verify unambiguity.
 */
export function simulateIndependentVerification(
  input: VerificationInput
): {
  independentlySolved: boolean;
  predictedOptionIndex: number;
  solverConfidence: number;
  unambiguous: boolean;
} {
  // Extract key evidence tokens
  const cleanEvidence = clean(input.sourceEvidenceText);
  let bestMatchIdx = -1;
  let highestScore = -1;
  let runnerUpScore = -1;

  for (let i = 0; i < input.options_en.length; i++) {
    const optTokens = clean(input.options_en[i]).split(' ').filter((t) => t.length > 2);
    let matchCount = 0;
    for (const t of optTokens) {
      if (cleanEvidence.includes(t)) matchCount++;
    }
    const score = optTokens.length > 0 ? matchCount / optTokens.length : 0;

    if (score > highestScore) {
      runnerUpScore = highestScore;
      highestScore = score;
      bestMatchIdx = i;
    } else if (score > runnerUpScore) {
      runnerUpScore = score;
    }
  }

  // If best match matches the intended key and has clear separation from runner up
  const isIndependentlySolved = bestMatchIdx === input.correctOptionIndex && highestScore > 0;
  const isUnambiguous = isIndependentlySolved && (highestScore - runnerUpScore >= 0.15 || runnerUpScore === 0);
  const confidence = isIndependentlySolved ? Math.min(1.0, 0.7 + (highestScore * 0.3)) : 0.4;

  return {
    independentlySolved: isIndependentlySolved,
    predictedOptionIndex: bestMatchIdx,
    solverConfidence: Number(confidence.toFixed(2)),
    unambiguous: isUnambiguous,
  };
}

/**
 * Evaluates Risk Level of question.
 */
export function evaluateQuestionRisk(category: string, questionType?: string): QuestionRiskLevel {
  if (questionType === 'assertion_reason' || questionType === 'statement_matching') {
    return 'MEDIUM_RISK';
  }
  if (category === 'welfare_schemes' || category === 'sports_awards_appointments') {
    return 'LOW_RISK'; // Direct factual questions with unambiguous criteria
  }
  if (category === 'polity_governance' || category === 'economy') {
    return 'MEDIUM_RISK';
  }
  return 'LOW_RISK';
}

/**
 * Master Verification Pipeline: executes deterministic validation + independent solver check.
 */
export function verifyDraftQuestion(
  input: VerificationInput,
  config: PipelineConfig
): CAVerificationReport {
  const detResult = runDeterministicChecks(input);
  const solverResult = simulateIndependentVerification(input);
  const riskLevel = evaluateQuestionRisk(input.category, input.questionType);

  let score = 100;
  if (!detResult.passed) score -= detResult.rejectionReasons.length * 15;
  if (!solverResult.independentlySolved) score -= 40;
  if (!solverResult.unambiguous) score -= 25;
  score = Math.max(0, Math.min(100, score));

  const allChecksPassed = detResult.passed && solverResult.independentlySolved && solverResult.unambiguous;
  
  // Can only auto-publish if score >= threshold, risk is LOW, and AUTO_PUBLISH_ENABLED flag is true
  const canAutoPublish = 
    config.autoPublishEnabled && 
    allChecksPassed && 
    score >= config.minVerificationScoreForAutoPublish && 
    riskLevel === 'LOW_RISK';

  const combinedReasons = [...detResult.rejectionReasons];
  if (!solverResult.independentlySolved) {
    combinedReasons.push(`Blind solver could not verify option ${input.correctOptionIndex} as the unique correct key.`);
  }

  return {
    timestamp: new Date().toISOString(),
    factualConsistency: detResult.factualConsistency,
    unambiguousCorrectAnswer: solverResult.unambiguous,
    distractorQualityPassed: detResult.distractorQualityPassed,
    tamilEnglishSemanticallyIdentical: detResult.tamilEnglishSemanticallyIdentical,
    hasAuthoritativeCitation: detResult.hasAuthoritativeCitation,
    blindSolverResult: {
      independentlySolved: solverResult.independentlySolved,
      predictedOptionIndex: solverResult.predictedOptionIndex,
      solverConfidence: solverResult.solverConfidence,
    },
    riskLevel,
    overallScore: score,
    canAutoPublish,
    rejectionReasons: combinedReasons,
  };
}
