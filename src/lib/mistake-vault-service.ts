import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, setDoc, updateDoc, writeBatch, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { MistakeVaultItem, Question, Test, UserTestAttempt } from './types';

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
  const failureCount = isSameAttempt ? (existingItem?.failureCount || 1) : (existingItem ? existingItem.failureCount + 1 : 1);

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
    failureCount,
    status: 'unresolved',
    lastAttemptId: attemptId,
  };
}

/**
 * Saves incorrectly answered questions to the student's Mistake Vault.
 * Ensures idempotent writes: same attempt ID does not double-count failures.
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

  const mistakeItemsToSave: MistakeVaultItem[] = [];
  const correctQuestionIds: string[] = [];

  questions.forEach((q, idx) => {
    const ansIdx = answers[idx];
    if (ansIdx !== undefined && ansIdx !== -1) {
      if (q.answerOptions[ansIdx] !== q.correctAnswer) {
        // Wrong answer -> candidate for Mistake Vault
        mistakeItemsToSave.push(buildMistakeVaultItem(q, test, attemptId, ansIdx));
      } else {
        // Correct answer -> if in mistake vault, can be marked revised/mastered
        correctQuestionIds.push(q.id);
      }
    }
  });

  if (mistakeItemsToSave.length === 0 && correctQuestionIds.length === 0) return 0;

  try {
    const batch = writeBatch(firestore);

    // 1. Record / update mistakes
    for (const item of mistakeItemsToSave) {
      const docRef = doc(firestore, `users/${userId}/mistakeVault`, item.questionId);
      batch.set(docRef, item, { merge: true });
    }

    // 2. Mark correct items as mastered if they were previously unresolved
    for (const qid of correctQuestionIds) {
      const docRef = doc(firestore, `users/${userId}/mistakeVault`, qid);
      batch.set(
        docRef,
        {
          status: 'mastered',
          resolvedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return mistakeItemsToSave.length;
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
