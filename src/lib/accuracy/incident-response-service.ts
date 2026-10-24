/**
 * TNPSC99 — Publication Incident Response & Erratum Service
 * Enforces non-destructive retraction, classified erratum remedies, candidate score adjustments,
 * Mistake Vault neutralization, and reapproval gates.
 */

import {
  QuestionAccuracyCandidate,
  QuestionIncidentLog,
  ErratumDefectClassification,
  ErratumRemedyType,
  ErratumRemedyApproval,
  ErratumScoreAdjustment,
} from './types';

export interface TestAttemptAuditRecord {
  attemptId: string;
  userId: string;
  chosenOptionIndex: number;
  initialScore: number;
  totalPossible: number;
  testLanguage?: 'ta' | 'en';
  erratumAppliedIncidentIds?: string[];
}

export interface IncidentReportParams {
  questionId: string;
  reason: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  defectClassification: ErratumDefectClassification;
  adminUid: string;
  revisedKeyIndex?: number;
  acceptedOptionIndexes?: number[];
  remedyDecision?: ErratumRemedyType;
  editorialApproval?: ErratumRemedyApproval | null;
  affectedTestAttempts?: TestAttemptAuditRecord[];
}

export interface IncidentResolutionOutcome {
  incident: QuestionIncidentLog;
  quarantinedQuestion: QuestionAccuracyCandidate;
  adjustedAttempts: ErratumScoreAdjustment[];
  neutralizedMistakeVaultEntries: {
    path: string;
    userId: string;
    questionId: string;
    neutralizedAt: string;
    neutralizationReason: string;
    isNeutralized: boolean;
  }[];
}

export class IncidentResponseService {
  /**
   * Resolves the appropriate Erratum Remedy based on defect classification.
   */
  public static resolveDefaultRemedyType(classification: ErratumDefectClassification): ErratumRemedyType {
    switch (classification) {
      case 'INCORRECT_ANSWER_KEY':
        return 'KEY_RESCORE';
      case 'AMBIGUOUS_QUESTION':
        return 'ACCEPT_MULTIPLE_KEYS';
      case 'INVALID_QUESTION':
        return 'FULL_MARKS_AWARDED';
      case 'TRANSLATION_DISCREPANCY':
        return 'LANGUAGE_SPECIFIC_RESCORE';
      case 'INCORRECT_CITATION_ONLY':
        return 'METADATA_UPDATE_ONLY';
      default:
        return 'FULL_MARKS_AWARDED';
    }
  }

  /**
   * Executes a classified publication incident response workflow adhering to official TNPSC Erratum Rules.
   */
  public static handleQuestionIncident(
    question: QuestionAccuracyCandidate,
    params: IncidentReportParams
  ): IncidentResolutionOutcome {
    const incidentId = `inc_${Date.now()}_${question.id.slice(-6)}`;
    const affectedAttempts = params.affectedTestAttempts || [];
    const classification = params.defectClassification || 'INVALID_QUESTION';
    const remedyType = params.remedyDecision || this.resolveDefaultRemedyType(classification);

    // 1. Immediately block further student delivery by setting RETRACTED and isRetracted = true
    const quarantinedQuestion: QuestionAccuracyCandidate = {
      ...question,
      isRetracted: true,
      isQuarantined: true,
      quarantineReason: `INCIDENT_ERRATUM [${classification}]: ${params.reason}`,
      quarantineNotes: `Retracted by ${params.adminUid} at ${new Date().toISOString()}`,
      status: 'RETRACTED',
      editorialApproval: null, // Clear approval; reapproval is mandatory
    };

    // 2. Compute candidate score adjustments based on the specific defect classification
    // Original marks are preserved in attempt.originalScore; adjusted marks stored separately.
    const adjustedAttempts: ErratumScoreAdjustment[] = [];
    const neutralizedMistakeVaultEntries: IncidentResolutionOutcome['neutralizedMistakeVaultEntries'] = [];

    const nowIso = new Date().toISOString();

    for (const attempt of affectedAttempts) {
      // Prevent Double Compensation / Idempotency Check
      if (attempt.erratumAppliedIncidentIds?.includes(incidentId)) {
        adjustedAttempts.push({
          attemptId: attempt.attemptId,
          userId: attempt.userId,
          originalScore: attempt.initialScore,
          adjustedScore: attempt.initialScore,
          erratumDelta: 0,
          incidentId,
          remedyApplied: remedyType,
          appliedAt: nowIso,
          doubleCompensationPrevented: true,
        });
        continue;
      }

      let delta = 0;
      let shouldNeutralizeMistakeVault = false;

      switch (classification) {
        case 'INCORRECT_ANSWER_KEY': {
          // If candidate chose the newly corrected key, award point (+1)
          if (params.revisedKeyIndex !== undefined && attempt.chosenOptionIndex === params.revisedKeyIndex) {
            delta = 1;
            shouldNeutralizeMistakeVault = true;
          }
          break;
        }

        case 'AMBIGUOUS_QUESTION': {
          // If candidate selected any of the recognized ambiguous answers, award point (+1)
          const validKeys = params.acceptedOptionIndexes || [params.revisedKeyIndex ?? question.correctOptionIndex];
          if (validKeys.includes(attempt.chosenOptionIndex)) {
            // Only add point if not already credited
            if (attempt.chosenOptionIndex !== question.correctOptionIndex) {
              delta = 1;
            }
            shouldNeutralizeMistakeVault = true;
          } else {
            // General ambiguity: full marks awarded to all who attempted
            delta = attempt.chosenOptionIndex === question.correctOptionIndex ? 0 : 1;
            shouldNeutralizeMistakeVault = true;
          }
          break;
        }

        case 'INVALID_QUESTION': {
          // Factually broken or invalid question: full marks (+1) awarded to all candidates who attempted
          const wasConsideredWrong = attempt.chosenOptionIndex !== question.correctOptionIndex;
          delta = wasConsideredWrong ? 1 : 0;
          shouldNeutralizeMistakeVault = true;
          break;
        }

        case 'TRANSLATION_DISCREPANCY': {
          // Language specific rescore
          const lang = attempt.testLanguage || 'en';
          if (lang === 'ta' && params.revisedKeyIndex !== undefined && attempt.chosenOptionIndex === params.revisedKeyIndex) {
            delta = 1;
            shouldNeutralizeMistakeVault = true;
          } else if (lang === 'en' && attempt.chosenOptionIndex === question.correctOptionIndex) {
            delta = 0; // Already correct in English
          } else {
            delta = 1; // Benefit of doubt to candidate
            shouldNeutralizeMistakeVault = true;
          }
          break;
        }

        case 'INCORRECT_CITATION_ONLY': {
          // ZERO score change! The question & answer key were correct; only reference metadata had typo.
          delta = 0;
          shouldNeutralizeMistakeVault = false;
          break;
        }

        default: {
          delta = attempt.chosenOptionIndex !== question.correctOptionIndex ? 1 : 0;
          shouldNeutralizeMistakeVault = true;
          break;
        }
      }

      // Record adjusted marks separately from original score
      adjustedAttempts.push({
        attemptId: attempt.attemptId,
        userId: attempt.userId,
        originalScore: attempt.initialScore,
        adjustedScore: attempt.initialScore + delta,
        erratumDelta: delta,
        incidentId,
        remedyApplied: remedyType,
        appliedAt: nowIso,
        doubleCompensationPrevented: false,
      });

      // Neutralize Mistake Vault entries traceably
      if (shouldNeutralizeMistakeVault) {
        neutralizedMistakeVaultEntries.push({
          path: `users/${attempt.userId}/mistakeVault/${question.id}`,
          userId: attempt.userId,
          questionId: question.id,
          neutralizedAt: nowIso,
          neutralizationReason: `ERRATUM_${classification}: ${params.reason}`,
          isNeutralized: true,
        });
      }
    }

    // 3. Record immutable incident log
    const incident: QuestionIncidentLog = {
      incidentId,
      questionId: question.id,
      flaggedAt: nowIso,
      reason: params.reason,
      severity: params.severity || 'HIGH',
      defectClassification: classification,
      remedyType,
      adminUid: params.adminUid,
      previousKeyIndex: question.correctOptionIndex,
      revisedKeyIndex: params.revisedKeyIndex,
      acceptedOptionIndexes: params.acceptedOptionIndexes,
      affectedAttemptsCount: affectedAttempts.length,
      affectedStudentsCount: new Set(affectedAttempts.map((a) => a.userId)).size,
      erratumActionTaken: remedyType,
      editorialApproval: params.editorialApproval || null,
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
