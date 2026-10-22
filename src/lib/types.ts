'use client';
import type { ImagePlaceholder } from './placeholder-images';
import { DocumentData, DocumentReference } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  subjectId?: string;
  classId?: string;
  unitId?: string;
  category?: string;
  correctAnswer: string;
  answerOptions: string[];
  reference?: string;
  referenceUrl?: string;
  referencePage?: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  examType?: 'Group I' | 'Group II' | 'Group IV';
}

// Type for uploading questions, ID is optional as it will be generated.
export type QuestionInput = Omit<Question, 'id'>;

export interface Test {
  id: string;
  title: string;
  description: string;
  passage?: string;
  questionIds: string[];
  questions?: Question[];
  classId?: string;
  subjectId?: string;
  categoryId?: string;
  term?: string;
  unitId?: string;
  unitNumber?: number;
  unitName?: string;
  isPreviousYearPaper?: boolean;
  isMockTest?: boolean;
  userId?: string;
  year?: number;
  referencePageOffset?: number;
  bookType?: 'samacheer' | 'old';
  medium?: 'tamil' | 'english';
  examGroup?: 'Group I' | 'Group II' | 'Group IV';
  syllabusPart?: string;
  syllabusUnit?: string;
  syllabusUnitName?: string;
  syllabusTopic?: string;
  syllabusCategory?: string;
  totalQuestions?: number;
  duration?: number; // in minutes
  createdAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  name_ta?: string;
  description: string;
  description_ta?: string;
}

export interface Class {
  id: string;
  name: string;
  name_ta?: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  name_ta?: string;
  subjectId: string;
}


export interface Unit {
  id: string;
  classId: string;
  subjectId: string;
  categoryId?: string;
  term: string;
  unitNumber?: number;
  unitName?: string;
  className?: string; // For display purposes
  subjectName?: string; // For display purposes
  categoryName?: string; // For display purposes
  bookType?: 'samacheer' | 'old';
  medium?: 'tamil' | 'english';
}

export interface Syllabus {
  id: string;
  examGroup: 'Group I' | 'Group II' | 'Group IV';
  part: string;
  unit: string;
  unitName: string;
  topic: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  registrationDate: string;
  isAdmin?: boolean;
  role?: 'admin' | 'student' | 'user';
  phone?: string;
  city?: string;
  referralCode: string;
  referredBy?: string;
  subscriptionStatus: 'free' | 'premium';
  subscriptionExpires?: string;
  createdAt?: string;
  lastPaymentId?: string;
  lastOrderId?: string;
  currentSessionId?: string;
  subscriptionCount?: number;
  referralCount: number;
  lastSeen?: string;
}

export interface UserTestAttempt {
  id: string;
  userId: string;
  testId: string;
  questionIds: string[];
  answers: number[];
  score: number;
  status: 'in-progress' | 'completed';
  startedAt: string;
  completedAt?: string;
  testTitle?: string;
  isMockTest?: boolean;
  currentQuestionIndex: number;
  correctlyAnsweredQuestionIds?: string[];
  incorrectlyAnsweredQuestionIds?: string[];
  lastUpdatedDate?: string;
  examGroup?: 'Group I' | 'Group II' | 'Group IV';
  mode?: 'practice' | 'exam';
  markedForReviewIds?: string[];
  examDeadline?: string;
  examDeadlineMillis?: number;
  timeSpentSeconds?: number;
}


export interface BookmarkedQuestion {
  id: string;
  userId: string;
  questionId: string;
  createdAt: string;
}

export interface Score {
  id?: string;
  userId: string;
  username: string;
  score: number;
  testId: string;
  testTitle: string;
  totalQuestionsInTest: number;
  createdAt: string;
  classId?: string;
  subjectId?: string;
}

export interface LeaderboardScore {
    userId: string;
    username: string;
    score: number;
    completedAt: string;
    timeTaken?: number;
}

export interface QuestionComment {
    id: string;
    questionId: string;
    questionText: string;
    userId: string;
    username: string;
    comment: string;
    createdAt: string;
    status: 'open' | 'resolved';
}

export interface StudyMaterial {
  id: string;
  classId: string;
  subjectId: string;
  term: string;
  medium: 'tamil' | 'english';
  bookType: 'samacheer' | 'old';
  fileName: string;
  downloadURL: string;
  storagePath: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// PHASE 3C: STUDENT PROGRESS, MISTAKE VAULT & REVISION TYPES
// -----------------------------------------------------------------------------

export type MistakeStatus = 'unresolved' | 'revised' | 'mastered';

export interface MistakeVaultItem {
  id?: string;
  questionId: string;
  testId: string;
  testTitle: string;
  subjectId?: string;
  classId?: string;
  chapterName?: string;
  questionText: string;
  answerOptions: string[];
  correctAnswer: string;
  selectedOptionIndex: number;
  explanation: string;
  referencePage?: number;
  referencePageOffset?: number;
  lastFailedDate: string;
  failureCount: number;
  status: MistakeStatus;
  revisedAt?: string;
  resolvedAt?: string;
  lastAttemptId?: string;
}

export type MasteryStatus = 'mastered' | 'practicing' | 'needs_focus' | 'unattempted';
export type ConfidenceLevel = 'high' | 'moderate' | 'low' | 'insufficient_data';

export interface ChapterProgress {
  chapterId: string;
  chapterName: string;
  subjectId?: string;
  classId?: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  accuracy: number; // percentage (0 - 100)
  coverage: number; // percentage (attempted / total)
  repetition: number; // attempt count
  confidence: ConfidenceLevel;
  masteryStatus: MasteryStatus;
  lastPracticedDate?: string;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalChapters: number;
  masteredChapters: number;
  averageAccuracy: number;
  totalAttempts: number;
  chapters: ChapterProgress[];
}

export interface RecommendedRevision {
  type: 'mistake_vault' | 'weak_chapter' | 'subject';
  title: string;
  description: string;
  targetChapterId?: string;
  targetSubjectId?: string;
  availableQuestionCount: number;
}

export interface StudentProgressSummary {
  totalAttempts: number;
  completedAttempts: number;
  totalQuestionsAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  unresolvedMistakesCount: number;
  subjects: SubjectProgress[];
  weakChapters: ChapterProgress[];
  recommendedRevision?: RecommendedRevision;
}

