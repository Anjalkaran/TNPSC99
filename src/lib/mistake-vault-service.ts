import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc, writeBatch, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { MistakeStatus, MistakeVaultItem, Question, Test } from './types';

/**
 * Pure calculation function for 3-stage mistake progression:
 * unresolved -> revised -> mastered
 * Any failure resets status to unresolved and increments failureCount.
 */
export function calculateNextMistakeStatus(
  currentStatus: MistakeStatus | undefined,
  isCorrect: boolean,
  isSameAttempt: boolean = false,
  currentFailureCount: number = 0
): {
  nextStatus: MistakeStatus | null;
  nextFailureCount: number;
  shouldUpdate: boolean;
} {
  if (isCorrect) {
    if (!currentStatus) {
      // Question is not in the mistake vault; answering correctly does not add it
      return { nextStatus: null, nextFailureCount: 0, shouldUpdate: false };
    }
    if (isSameAttempt) {
      // Idempotent: don't double-advance in the same attempt
      return { nextStatus: currentStatus, nextFailureCount: currentFailureCount, shouldUpdate: false };
    }
    if (currentStatus === 'unresolved') {
      // 1st successful revision -> 'revised' (NOT 'mastered')
      return { nextStatus: 'revised', nextFailureCount: currentFailureCount, shouldUpdate: true };
    }
    if (currentStatus === 'revised') {
      // 2nd successful revision -> 'mastered'
      return { nextStatus: 'mastered', nextFailureCount: currentFailureCount, shouldUpdate: true };
    }
    // Already mastered
    return { nextStatus: 'mastered', nextFailureCount: currentFailureCount, shouldUpdate: false };
  } else {
    // Incorrect answer -> resets to unresolved, increments failureCount
    const nextFailureCount = isSameAttempt ? (currentFailureCount || 1) : currentFailureCount + 1;
    return { nextStatus: 'unresolved', nextFailureCount, shouldUpdate: true };
  }
}

/**
 * Normalizes question data into MistakeVaultItem format
 */
export function buildMistakeVaultItem(
  question: Question,
  test: Test,
  attemptId: string,
  selectedOptionIndex: number,
  existingItem?: MistakeVaultItem
): MistakeVaultItem {
  const isSameAttempt = existingItem?.lastAttemptId === attemptId;
  const currentCount = existingItem?.failureCount || 0;
  const { nextStatus, nextFailureCount } = calculateNextMistakeStatus(
    existingItem?.status,
    false,
    isSameAttempt,
    currentCount
  );

  return {
    questionId: question.id,
    testId: test.id,
    testTitle: test.title || 'TNPSC Test',
    subjectId: test.subjectId,
    classId: test.classId,
    chapterName: test.title,
    questionText: question.text,
    answerOptions: question.answerOptions,
    correctAnswer: question.correctAnswer,
    selectedOptionIndex,
    explanation: question.explanation || '',
    referencePage: question.referencePage,
    referencePageOffset: test.referencePageOffset || 0,
    lastFailedDate: new Date().toISOString(),
    failureCount: nextFailureCount,
    status: (nextStatus || 'unresolved') as MistakeStatus,
    lastAttemptId: attemptId,
  };
}

/**
 * Saves incorrectly answered questions to the student's Mistake Vault
 * and updates progression of revised questions with 3-stage mastery:
 * unresolved -> revised -> mastered
 * Ensures idempotent writes: same attempt ID does not double-count failures or status changes.
 */
export async function syncMistakesToVault(
  firestore: Firestore,
  userId: string,
  test: Test,
  attemptId: string,
  questions: Question[],
  answers: (number | undefined)[]
): Promise<number> {
  if (!firestore || !userId || !test || !questions || questions.length === 0) return 0;

  const mistakeQuestions: { q: Question; ansIdx: number }[] = [];
  const correctQuestions: Question[] = [];

  questions.forEach((q, idx) => {
    const ansIdx = answers[idx];
    if (ansIdx !== undefined && ansIdx !== -1) {
      if (q.answerOptions[ansIdx] !== q.correctAnswer) {
        mistakeQuestions.push({ q, ansIdx });
      } else {
        correctQuestions.push(q);
      }
    }
  });

  if (mistakeQuestions.length === 0 && correctQuestions.length === 0) return 0;

  try {
    // Read existing vault documents for relevant questions to ensure correct state transitions
    const allRelevantQuestions = [...mistakeQuestions.map(m => m.q), ...correctQuestions];
    const existingSnaps = await Promise.all(
      allRelevantQuestions.map(q =>
        getDoc(doc(firestore, `users/${userId}/mistakeVault`, q.id)).catch(() => null)
      )
    );

    const existingMap = new Map<string, MistakeVaultItem>();
    existingSnaps.forEach((snap, idx) => {
      if (snap && snap.exists()) {
        existingMap.set(allRelevantQuestions[idx].id, snap.data() as MistakeVaultItem);
      }
    });

    const batch = writeBatch(firestore);
    let mutatedCount = 0;

    // 1. Process failed questions -> reset to 'unresolved' and increment failure count
    for (const { q, ansIdx } of mistakeQuestions) {
      const existing = existingMap.get(q.id);
      const isSameAttempt = existing?.lastAttemptId === attemptId;
      const currentFailures = existing?.failureCount || 0;
      const newFailureCount = isSameAttempt ? (currentFailures || 1) : currentFailures + 1;

      const itemToSave: MistakeVaultItem = {
        questionId: q.id,
        testId: test.id,
        testTitle: test.title || 'TNPSC Test',
        subjectId: test.subjectId,
        classId: test.classId,
        chapterName: test.title,
        questionText: q.text,
        answerOptions: q.answerOptions,
        correctAnswer: q.correctAnswer,
        selectedOptionIndex: ansIdx,
        explanation: q.explanation || '',
        referencePage: q.referencePage,
        referencePageOffset: test.referencePageOffset || 0,
        lastFailedDate: new Date().toISOString(),
        failureCount: newFailureCount,
        status: 'unresolved',
        lastAttemptId: attemptId,
      };

      const docRef = doc(firestore, `users/${userId}/mistakeVault`, q.id);
      batch.set(docRef, itemToSave, { merge: true });
      mutatedCount++;
    }

    // 2. Process correctly answered questions -> 3-stage mastery progression
    for (const q of correctQuestions) {
      const existing = existingMap.get(q.id);
      if (!existing) {
        // Not a previous mistake; do not inject
        continue;
      }

      const isSameAttempt = existing.lastAttemptId === attemptId;
      const { nextStatus, shouldUpdate } = calculateNextMistakeStatus(
        existing.status,
        true,
        isSameAttempt,
        existing.failureCount
      );

      if (shouldUpdate && nextStatus) {
        const docRef = doc(firestore, `users/${userId}/mistakeVault`, q.id);
        const updatePayload: Partial<MistakeVaultItem> = {
          status: nextStatus,
          lastAttemptId: attemptId,
        };

        if (nextStatus === 'revised') {
          updatePayload.revisedAt = new Date().toISOString();
        } else if (nextStatus === 'mastered') {
          updatePayload.resolvedAt = new Date().toISOString();
        }

        batch.set(docRef, updatePayload, { merge: true });
        mutatedCount++;
      }
    }

    if (mutatedCount > 0) {
      await batch.commit();
    }

    return mistakeQuestions.length;
  } catch (err) {
    console.warn('Failed to sync mistakes to vault (non-blocking):', err);
    return 0;
  }
}

/**
 * Fetches all Mistake Vault items for a student
 */
export async function fetchStudentMistakes(
  firestore: Firestore,
  userId: string
): Promise<MistakeVaultItem[]> {
  if (!firestore || !userId) return [];
  try {
    const colRef = collection(firestore, `users/${userId}/mistakeVault`);
    const q = query(colRef, orderBy('lastFailedDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MistakeVaultItem));
  } catch (err) {
    console.error('Error fetching mistake vault:', err);
    return [];
  }
}
