import { NextRequest, NextResponse } from 'next/server';
import admin, { db, adminAuth } from '@/firebase/admin';
import type { Question, Test, MistakeVaultItem, Score } from '@/lib/types';
import { calculateNextMistakeStatus } from '@/lib/mistake-vault-service';

export async function POST(req: NextRequest) {
  try {
    // -------------------------------------------------------------------------
    // 1. Authenticate Request
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let uid: string;
    let username = 'Aspirant';

    try {
      if (adminAuth) {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        uid = decodedToken.uid;
        username = decodedToken.name || decodedToken.email?.split('@')[0] || 'Aspirant';
      } else {
        // Fallback for emulator environments without initialized adminAuth
        return NextResponse.json(
          { error: 'Server authentication provider unavailable' },
          { status: 500 }
        );
      }
    } catch (authErr: any) {
      console.error('[Auth Error] Token verification failed:', authErr.message);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication credentials' },
        { status: 401 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database service unavailable' },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // 2. Parse and Validate Request Payload
    // -------------------------------------------------------------------------
    const body = await req.json();
    const { attemptId, testId, answers, timeSpentSeconds, mode } = body;

    if (!attemptId || typeof attemptId !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request: Missing or invalid attemptId' },
        { status: 400 }
      );
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Bad Request: Answers array is required' },
        { status: 400 }
      );
    }

    const attemptRef = db.doc(`users/${uid}/testAttempts/${attemptId}`);

    // -------------------------------------------------------------------------
    // 3. Server-Authoritative Transaction (Idempotent & Atomic)
    // -------------------------------------------------------------------------
    const result = await db.runTransaction(async (transaction) => {
      const attemptSnap = await transaction.get(attemptRef);

      if (!attemptSnap.exists) {
        throw new Error('NOT_FOUND: Test attempt document does not exist');
      }

      const attemptData = attemptSnap.data() || {};

      // Security check: Verify attempt belongs to the authenticated user
      if (attemptData.userId && attemptData.userId !== uid) {
        throw new Error('FORBIDDEN: Attempt does not belong to the authenticated student');
      }

      // Idempotency check: If already completed, return existing verified results
      if (attemptData.status === 'completed') {
        return {
          idempotent: true,
          score: attemptData.score ?? 0,
          totalQuestions: attemptData.questionIds?.length || 0,
          completedAt: attemptData.completedAt,
          correctlyAnsweredQuestionIds: attemptData.correctlyAnsweredQuestionIds || [],
          incorrectlyAnsweredQuestionIds: attemptData.incorrectlyAnsweredQuestionIds || [],
        };
      }

      const questionIds: string[] = attemptData.questionIds || [];
      if (questionIds.length === 0) {
        throw new Error('BAD_REQUEST: Attempt contains no question IDs');
      }

      // Deadline validation for Exam Mode
      const now = Date.now();
      const examDeadlineStr = attemptData.examDeadline;
      let isTimeExpired = false;

      if (attemptData.mode === 'exam' && examDeadlineStr) {
        const deadlineMs = new Date(examDeadlineStr).getTime();
        // Allow a 60-second grace buffer for network transit
        if (now > deadlineMs + 60000) {
          isTimeExpired = true;
        }
      }

      // -----------------------------------------------------------------------
      // 4. Fetch Trusted Authoritative Questions
      // -----------------------------------------------------------------------
      const questionsMap = new Map<string, Question>();

      // Fetch questions from trusted 'questions' collection
      const questionSnaps = await Promise.all(
        questionIds.map((qid) => transaction.get(db.doc(`questions/${qid}`)))
      );

      questionSnaps.forEach((qSnap) => {
        if (qSnap.exists) {
          questionsMap.set(qSnap.id, { id: qSnap.id, ...qSnap.data() } as Question);
        }
      });

      // Fallback: If questions were embedded in the test document (e.g. revision or mock test)
      const missingQids = questionIds.filter((qid) => !questionsMap.has(qid));
      if (missingQids.length > 0) {
        const effectiveTestId = testId || attemptData.testId;
        if (effectiveTestId) {
          const testSnap = await transaction.get(db.doc(`tests/${effectiveTestId}`));
          if (testSnap.exists) {
            const testDoc = testSnap.data() as Test;
            if (testDoc.questions && Array.isArray(testDoc.questions)) {
              testDoc.questions.forEach((q) => {
                if (q && q.id && !questionsMap.has(q.id)) {
                  questionsMap.set(q.id, q);
                }
              });
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 5. Authoritative Score Calculation (Never Client-Supplied)
      // -----------------------------------------------------------------------
      let authoritativeScore = 0;
      const correctlyAnsweredIds: string[] = [];
      const incorrectlyAnsweredIds: string[] = [];
      const failedQuestionsData: { question: Question; selectedOptionIndex: number }[] = [];
      const correctQuestionsData: Question[] = [];

      questionIds.forEach((qid, idx) => {
        const selectedIdx = answers[idx] !== undefined ? answers[idx] : attemptData.answers?.[idx];
        const qData = questionsMap.get(qid);

        if (!qData) {
          // If question record is missing, record as incorrect
          incorrectlyAnsweredIds.push(qid);
          return;
        }

        if (selectedIdx !== undefined && selectedIdx !== -1) {
          const selectedOptionText = qData.answerOptions?.[selectedIdx];
          if (selectedOptionText && selectedOptionText === qData.correctAnswer) {
            authoritativeScore++;
            correctlyAnsweredIds.push(qid);
            correctQuestionsData.push(qData);
          } else {
            incorrectlyAnsweredIds.push(qid);
            failedQuestionsData.push({ question: qData, selectedOptionIndex: selectedIdx });
          }
        } else {
          // Unanswered
          incorrectlyAnsweredIds.push(qid);
          failedQuestionsData.push({ question: qData, selectedOptionIndex: -1 });
        }
      });

      // -----------------------------------------------------------------------
      // 6. Derive Mistake Vault 3-Stage Mastery Transitions
      // -----------------------------------------------------------------------
      const completionTimestamp = new Date().toISOString();

      // Read current mistake vault items for all questions in this attempt
      const mistakeDocSnaps = await Promise.all(
        questionIds.map((qid) => transaction.get(db.doc(`users/${uid}/mistakeVault/${qid}`)))
      );

      const existingMistakesMap = new Map<string, MistakeVaultItem>();
      mistakeDocSnaps.forEach((mSnap) => {
        if (mSnap.exists) {
          existingMistakesMap.set(mSnap.id, mSnap.data() as MistakeVaultItem);
        }
      });

      // Process failed questions -> reset to 'unresolved' and increment failure count
      for (const { question, selectedOptionIndex } of failedQuestionsData) {
        const existing = existingMistakesMap.get(question.id);
        const currentFailures = existing?.failureCount || 0;
        const newFailureCount = currentFailures + 1;

        const mistakePayload: MistakeVaultItem = {
          questionId: question.id,
          testId: testId || attemptData.testId || 'unknown_test',
          testTitle: attemptData.testTitle || 'TNPSC Test',
          subjectId: attemptData.subjectId || question.subjectId,
          classId: attemptData.classId || question.classId,
          chapterName: attemptData.testTitle,
          questionText: question.text,
          answerOptions: question.answerOptions,
          correctAnswer: question.correctAnswer,
          selectedOptionIndex,
          explanation: question.explanation || '',
          referencePage: question.referencePage,
          referencePageOffset: attemptData.referencePageOffset || 0,
          lastFailedDate: completionTimestamp,
          failureCount: newFailureCount,
          status: 'unresolved',
          lastAttemptId: attemptId,
        };

        const vaultRef = db.doc(`users/${uid}/mistakeVault/${question.id}`);
        transaction.set(vaultRef, mistakePayload, { merge: true });
      }

      // Process correctly answered questions -> 3-stage mastery progression
      for (const question of correctQuestionsData) {
        const existing = existingMistakesMap.get(question.id);
        if (!existing) {
          // Question was never a mistake; do not inject into vault
          continue;
        }

        const { nextStatus, shouldUpdate } = calculateNextMistakeStatus(
          existing.status,
          true,
          false,
          existing.failureCount
        );

        if (shouldUpdate && nextStatus) {
          const vaultRef = db.doc(`users/${uid}/mistakeVault/${question.id}`);
          const updatePayload: Partial<MistakeVaultItem> = {
            status: nextStatus,
            lastAttemptId: attemptId,
          };

          if (nextStatus === 'revised') {
            updatePayload.revisedAt = completionTimestamp;
          } else if (nextStatus === 'mastered') {
            updatePayload.resolvedAt = completionTimestamp;
          }

          transaction.set(vaultRef, updatePayload, { merge: true });
        }
      }

      // -----------------------------------------------------------------------
      // 7. Atomic Write: Finalize Attempt Document
      // -----------------------------------------------------------------------
      const finalAnswers = questionIds.map((_, idx) =>
        answers[idx] !== undefined ? answers[idx] : attemptData.answers?.[idx] ?? -1
      );

      transaction.update(attemptRef, {
        status: 'completed',
        score: authoritativeScore,
        completedAt: completionTimestamp,
        correctlyAnsweredQuestionIds: correctlyAnsweredIds,
        incorrectlyAnsweredQuestionIds: incorrectlyAnsweredIds,
        answers: finalAnswers,
        timeSpentSeconds: timeSpentSeconds ?? attemptData.timeSpentSeconds ?? 0,
        lastUpdatedDate: completionTimestamp,
        isTimeExpired,
      });

      // -----------------------------------------------------------------------
      // 8. Atomic Write: Leaderboard Score Record
      // -----------------------------------------------------------------------
      const scoreDocRef = db.collection('scores').doc();
      const scoreData: Score = {
        userId: uid,
        username,
        score: authoritativeScore,
        testId: testId || attemptData.testId || 'unknown_test',
        testTitle: attemptData.testTitle || 'TNPSC Test',
        totalQuestionsInTest: questionIds.length,
        createdAt: completionTimestamp,
        classId: attemptData.classId,
        subjectId: attemptData.subjectId,
      };
      transaction.set(scoreDocRef, scoreData);

      return {
        idempotent: false,
        score: authoritativeScore,
        totalQuestions: questionIds.length,
        completedAt: completionTimestamp,
        correctlyAnsweredQuestionIds: correctlyAnsweredIds,
        incorrectlyAnsweredQuestionIds: incorrectlyAnsweredIds,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[Test Submission Error]:', err.message);

    if (err.message.startsWith('NOT_FOUND')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err.message.startsWith('FORBIDDEN')) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err.message.startsWith('BAD_REQUEST')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Internal Server Error during test finalization' },
      { status: 500 }
    );
  }
}
