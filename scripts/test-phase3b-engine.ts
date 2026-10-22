import { Question, UserTestAttempt, Test } from '../src/lib/types';

console.log('====================================================');
console.log('   TNPSC99 PHASE 3B — TESTING ENGINE TEST SUITE    ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

// Mock Questions for testing
const mockQuestions: Question[] = [
  {
    id: '10_1_g_S_01',
    text: 'ஒரு சொல் தனித்து நின்று பொருள் தருமாயின் அது எது?',
    correctAnswer: 'தனிமொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'இணைமொழி'],
    explanation: 'ஒரு சொல் தனித்து நின்று பொருள் தருவது தனிமொழி எனப்படும்.',
    reference: 'பத்தாம் வகுப்பு தமிழ் இயல் 1 இலக்கணம்',
    referencePage: 13,
  },
  {
    id: '10_1_g_S_02',
    text: 'இரண்டு அல்லது அதற்கு மேற்பட்ட சொற்கள் தொடர்ந்து வந்து பொருள் தருவது எது?',
    correctAnswer: 'தொடர்மொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'தொகைமொழி'],
    explanation: 'இரண்டு அல்லது அதற்கு மேற்பட்ட தனிமொழிகள் தொடர்ந்து வந்து பொருள் தருவது தொடர்மொழி ஆகும்.',
    reference: 'பத்தாம் வகுப்பு தமிழ் இயல் 1 இலக்கணம்',
    referencePage: 13,
  },
  {
    id: '10_1_g_S_03',
    text: 'ஒரு சொல் தனித்து நின்று ஒரு பொருளையும் பிரிந்து நின்று வேறு பொருளையும் தருவது?',
    correctAnswer: 'பொதுமொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'மரபுச்சொல்'],
    explanation: 'தனித்து நின்று ஒரு பொருளையும் பிரிந்து நின்று வேறு பொருளையும் தருவது பொதுமொழி.',
    reference: 'பத்தாம் வகுப்பு தமிழ் இயல் 1 இலக்கணம்',
    referencePage: 14,
  }
];

// --- 1. Practice Mode Scoring & Rescore Prevention Tests ---
console.log('--- 1. Practice Mode Interaction & Re-scoring Protection Tests ---');

// In practice mode, once answered, answers are locked
function simulatePracticeAnswer(
  qIndex: number,
  optionIndex: number,
  currentAnswers: (number | undefined)[],
  practiceAnswered: Record<number, boolean>
) {
  if (practiceAnswered[qIndex]) {
    // Locked: do NOT mutate
    return { answers: currentAnswers, practiceAnswered, scoreIncremented: false };
  }
  const nextAnswers = [...currentAnswers];
  nextAnswers[qIndex] = optionIndex;
  const nextPracticeAnswered = { ...practiceAnswered, [qIndex]: true };
  const isCorrect = mockQuestions[qIndex].answerOptions[optionIndex] === mockQuestions[qIndex].correctAnswer;
  return { answers: nextAnswers, practiceAnswered: nextPracticeAnswered, scoreIncremented: isCorrect };
}

let answers: (number | undefined)[] = [undefined, undefined, undefined];
let practiceAnswered: Record<number, boolean> = {};

// Step A: First attempt selects correct answer (0 -> 'தனிமொழி')
const step1 = simulatePracticeAnswer(0, 0, answers, practiceAnswered);
assert(step1.scoreIncremented === true, 'Practice Mode: Initial correct selection increments score');
assert(step1.answers[0] === 0, 'Practice Mode: Selected option recorded');
assert(step1.practiceAnswered[0] === true, 'Practice Mode: Question marked as locked');

// Step B: User attempts to switch to option 1 ('தொடர்மொழி')
const step2 = simulatePracticeAnswer(0, 1, step1.answers, step1.practiceAnswered);
assert(step2.scoreIncremented === false, 'Practice Mode: Rescoring attempt rejected (score not incremented)');
assert(step2.answers[0] === 0, 'Practice Mode: Original answer preserved without mutation');

// --- 2. Exam Mode Answer Mutability & Concealment Tests ---
console.log('\n--- 2. Exam Mode Answer Mutability & Concealment Tests ---');

function simulateExamAnswer(
  qIndex: number,
  optionIndex: number | undefined,
  currentAnswers: (number | undefined)[]
) {
  const nextAnswers = [...currentAnswers];
  nextAnswers[qIndex] = optionIndex;
  return nextAnswers;
}

let examAnswers: (number | undefined)[] = [undefined, undefined, undefined];

// Step A: Select option 0
examAnswers = simulateExamAnswer(0, 0, examAnswers);
assert(examAnswers[0] === 0, 'Exam Mode: Answer selection recorded');

// Step B: Change option to 1 before submit
examAnswers = simulateExamAnswer(0, 1, examAnswers);
assert(examAnswers[0] === 1, 'Exam Mode: Answer selection freely changeable before submission');

// Step C: Clear answer
examAnswers = simulateExamAnswer(0, undefined, examAnswers);
assert(examAnswers[0] === undefined, 'Exam Mode: Clear answer deselects option cleanly');

// --- 3. Exam Deadline & Time Reconciliation Tests ---
console.log('\n--- 3. Strict Exam Timer & Deadline Reconciliation Tests ---');

const initialDurationSeconds = 1800; // 30 minutes
const startTime = Date.now();
const examDeadline = new Date(startTime + initialDurationSeconds * 1000).toISOString();

function reconcileRemainingSeconds(deadlineIso: string, currentTimeMs: number): number {
  const deadlineMs = new Date(deadlineIso).getTime();
  return Math.max(0, Math.round((deadlineMs - currentTimeMs) / 1000));
}

// Check at T = 0
const remaining0 = reconcileRemainingSeconds(examDeadline, startTime);
assert(remaining0 === 1800, 'Timer: Correctly computes 1800 seconds remaining at start');

// Simulate 10 minutes passing (tab hidden / device asleep)
const tenMinutesLater = startTime + 10 * 60 * 1000;
const remaining10m = reconcileRemainingSeconds(examDeadline, tenMinutesLater);
assert(remaining10m === 1200, 'Timer: Reconciles elapsed time after 10m pause/background accurately');

// Simulate deadline passed
const pastDeadline = startTime + 31 * 60 * 1000;
const remainingExpired = reconcileRemainingSeconds(examDeadline, pastDeadline);
assert(remainingExpired === 0, 'Timer: Correctly reaches 0 seconds on expiry (triggers auto-submit)');

// --- 4. Duplicate Submission Protection Tests ---
console.log('\n--- 4. Duplicate Submission Guard Tests ---');

let isSubmitting = false;
let isSubmitted = false;
let submissionCallCount = 0;

async function handleFinalSubmitGuard(isAuto = false) {
  if (isSubmitting || isSubmitted) {
    return { success: false, reason: 'ALREADY_SUBMITTED' };
  }
  isSubmitting = true;
  submissionCallCount++;
  // Simulate Firestore network latency
  await new Promise(r => setTimeout(r, 20));
  isSubmitted = true;
  isSubmitting = false;
  return { success: true };
}

async function runDuplicateSubmitTest() {
  const call1 = handleFinalSubmitGuard(false);
  const call2 = handleFinalSubmitGuard(false);
  const call3 = handleFinalSubmitGuard(true);
  const results = await Promise.all([call1, call2, call3]);

  const successCount = results.filter(r => r.success).length;
  const rejectedCount = results.filter(r => !r.success).length;

  assert(successCount === 1, 'Duplicate Submit: Exactly one submission request succeeds');
  assert(rejectedCount === 2, 'Duplicate Submit: Concurrent or repeated submit calls rejected');
  assert(submissionCallCount === 1, 'Duplicate Submit: Backend save invoked exactly once');
}

// --- 5. Question Palette Status Mapping Tests ---
console.log('\n--- 5. Question Palette Status Mapping Tests ---');

function getQuestionStatus(
  index: number,
  userAnswers: (number | undefined)[],
  markedReview: boolean[]
): 'answered_and_marked' | 'marked' | 'answered' | 'unanswered' {
  const isAnswered = userAnswers[index] !== undefined && userAnswers[index] !== -1;
  const isMarked = markedReview[index] === true;

  if (isAnswered && isMarked) return 'answered_and_marked';
  if (isMarked) return 'marked';
  if (isAnswered) return 'answered';
  return 'unanswered';
}

const paletteAnswers: (number | undefined)[] = [0, undefined, 2, undefined];
const paletteMarked = [false, true, true, false];

assert(getQuestionStatus(0, paletteAnswers, paletteMarked) === 'answered', 'Palette: Question 1 mapped as answered');
assert(getQuestionStatus(1, paletteAnswers, paletteMarked) === 'marked', 'Palette: Question 2 mapped as marked (unanswered)');
assert(getQuestionStatus(2, paletteAnswers, paletteMarked) === 'answered_and_marked', 'Palette: Question 3 mapped as answered & marked');
assert(getQuestionStatus(3, paletteAnswers, paletteMarked) === 'unanswered', 'Palette: Question 4 mapped as unanswered');

// --- 6. Printed Page to PDF Page Offset Reconciliation ---
console.log('\n--- 6. Textbook Reference Page & Offset Conversion Tests ---');

function computePhysicalPdfPage(referencePage: number, offset: number = 0): number {
  return referencePage + (offset || 0);
}

// Class 10 Tamil 2025 Edition: printed page 13 has +10 PDF offset -> physical page 23
const physicalP23 = computePhysicalPdfPage(13, 10);
assert(physicalP23 === 23, 'Page Offset: Printed page 13 with +10 offset converts to PDF physical page 23');

// Printed page 14 has +10 PDF offset -> physical page 24
const physicalP24 = computePhysicalPdfPage(14, 10);
assert(physicalP24 === 24, 'Page Offset: Printed page 14 with +10 offset converts to PDF physical page 24');

// Default offset 0
const physicalP1 = computePhysicalPdfPage(1, 0);
assert(physicalP1 === 1, 'Page Offset: Default offset 0 maps printed page directly');

// --- 7. Legacy Firestore Attempt Backward Compatibility Tests ---
console.log('\n--- 7. Legacy Firestore Attempt Deserialization Tests ---');

// Legacy record from Phase 1/2 without Phase 3B fields
const legacyRecord: any = {
  id: 'attempt_legacy_123',
  userId: 'student_456',
  testId: '10_tamil_unit1',
  testTitle: 'இயல் 1 - சொல்',
  status: 'in-progress',
  currentQuestionIndex: 2,
  answers: [0, 1, -1],
  questionIds: ['10_1_g_S_01', '10_1_g_S_02', '10_1_g_S_03'],
  score: 1,
  startedAt: '2026-10-20T10:00:00Z',
  // mode, markedForReviewIds, examDeadline are UNDEFINED in legacy records
};

function deserializeAttempt(raw: any): UserTestAttempt {
  return {
    ...raw,
    mode: raw.mode || 'practice', // Safe default fallback
    markedForReviewIds: raw.markedForReviewIds || [],
    timeSpentSeconds: raw.timeSpentSeconds || 0,
    examDeadline: raw.examDeadline || undefined,
  };
}

const hydrated = deserializeAttempt(legacyRecord);
assert(hydrated.id === 'attempt_legacy_123', 'Legacy Compatibility: Attempt ID preserved');
assert(hydrated.mode === 'practice', 'Legacy Compatibility: Missing mode safely defaults to practice');
assert(Array.isArray(hydrated.markedForReviewIds) && hydrated.markedForReviewIds.length === 0, 'Legacy Compatibility: Missing markedForReviewIds defaults to empty array');
assert(hydrated.answers.length === 3, 'Legacy Compatibility: Question answers array preserved');
assert(hydrated.score === 1, 'Legacy Compatibility: Historical score preserved');

// Run async tests
runDuplicateSubmitTest().then(() => {
  console.log('\n====================================================');
  console.log(`TOTAL UNIT TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log('====================================================');
  if (failCount > 0) process.exit(1);
});
