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
  phone?: string;
  city?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  subscriptionStatus: 'free' | 'premium';
  subscriptionExpires?: string;
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
