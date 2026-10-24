/**
 * TNPSC99 — Publication Incident Response & Erratum Service
 * Enforces non-destructive retraction, candidate score adjustments, Mistake Vault neutralization, and reapproval gates.
 */

import { QuestionAccuracyCandidate, QuestionIncidentLog } from './types';

export interface IncidentReportParams {
  questionId: string;
  reason: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  adminUid: string;
  revisedKeyIndex?: number;
  affectedTestAttempts?: {
    attemptId: string;
    userId: string;
    chosenOptionIndex: number;
    initialScore: number;
    totalPossible: number;
  }[];
}

export interface IncidentResolutionOutcome {
  incident: QuestionIncidentLog;
  quarantinedQuestion: QuestionAccuracyCandidate;
  adjustedAttempts: {
    attemptId: string;
    userId: string;
    oldScore: number;
    newScore: number;
    bonusMarksAwarded: number;
  }[];
  neutralizedMistakeVaultEntries: string[];
}

export class IncidentResponseService {
  /**
   * Executes a full publication incident response workflow following the TNPSC Erratum Protocol.
   */
  public static handleQuestionIncident(
    question: QuestionAccuracyCandidate,
    params: IncidentReportParams
  ): IncidentResolutionOutcome {
    const incidentId = `inc_${Date.now()}_${question.id.slice(-6)}`;
    const affectedAttempts = params.affectedTestAttempts || [];

    // 1. Immediately block further delivery by setting RETRACTED and isRetracted = true
    const quarantinedQuestion: QuestionAccuracyCandidate = {
      ...question,
      isRetracted: true,
      isQuarantined: true,
      quarantineReason: `INCIDENT_ERRATUM: ${params.reason}`,
      quarantineNotes: `Retracted by ${params.adminUid} at ${new Date().toISOString()}`,
      status: 'RETRACTED',
      editorialApproval: null, // Clear approval; reapproval is mandatory
    };

    // 2. Adjust scores for all affected attempts (TNPSC Commission Standard: Full marks awarded)
    const adjustedAttempts = affectedAttempts.map((attempt) => {
      // If student had not answered correctly according to the defective key, grant bonus point
      const wasConsideredWrong = attempt.chosenOptionIndex !== question.correctOptionIndex;
      const bonusMarksAwarded = wasConsideredWrong ? 1 : 0;
      const newScore = attempt.initialScore + bonusMarksAwarded;

      return {
        attemptId: attempt.attemptId,
        userId: attempt.userId,
        oldScore: attempt.initialScore,
        newScore,
        bonusMarksAwarded,
      };
    });

    // 3. Neutralize Mistake Vault penalties for all affected students
    const neutralizedMistakeVaultEntries = affectedAttempts.map(
      (a) => `users/${a.userId}/mistakeVault/${question.id}`
    );

    // 4. Record the immutable incident log
    const incident: QuestionIncidentLog = {
      incidentId,
      questionId: question.id,
      flaggedAt: new Date().toISOString(),
      reason: params.reason,
      severity: params.severity || 'HIGH',
      adminUid: params.adminUid,
      previousKeyIndex: question.correctOptionIndex,
      revisedKeyIndex: params.revisedKeyIndex,
      affectedAttemptsCount: affectedAttempts.length,
      affectedStudentsCount: new Set(affectedAttempts.map((a) => a.userId)).size,
      erratumActionTaken: 'FULL_MARKS_AWARDED',
      mistakeVaultNeutralizedCount: neutralizedMistakeVaultEntries.length,
      reapprovalRequired: true,
      status: 'ACTIVE_RETRACTION',
    };

    return {
      incident,
      quarantinedQuestion,
      adjustedAttempts,
      neutralizedMistakeVaultEntries,
    };
  }

  /**
   * Reapproves a corrected question after secondary factual verification.
   */
  public static reapproveQuestion(
    question: QuestionAccuracyCandidate,
    newCorrectOptionIndex: number,
    adminUid: string,
    notes: string
  ): QuestionAccuracyCandidate {
    if (!question.isRetracted) {
      throw new Error('Only retracted questions require formal reapproval workflow');
    }

    return {
      ...question,
      correctOptionIndex: newCorrectOptionIndex,
      isRetracted: false,
      isQuarantined: false,
      quarantineReason: undefined,
      quarantineNotes: undefined,
      status: 'HUMAN_APPROVED',
      editorialApproval: {
        approvedBy: adminUid,
        approvedAt: new Date().toISOString(),
        notes: `Post-incident reapproval: ${notes}`,
      },
    };
  }
}
