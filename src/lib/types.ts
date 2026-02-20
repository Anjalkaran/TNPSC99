'use client';
import type { ImagePlaceholder } from './placeholder-images';
import { DocumentData, DocumentReference } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  subjectId?: string;
  classId?: string;
  unitId?: string;
  category?: string;
  correctAnswerIndex: number;
  answerOptions: string[];
  reference?: string;
  referenceUrl?: string;
  referencePage?: number;
  explanation?: string;
}

// Type for uploading questions, ID is optional as it will be generated.
export type QuestionInput = Omit<Question, 'id'>;

export interface Test {
  id: string;
  title: string;
  description: string;
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
  subscriptionStatus: 'none' | 'free_access';
}

export interface UserTestAttempt {
  id:string;
  userId: string;
  testId: string;
  lastUpdatedDate: string;
  score: number;
  answers: number[];
  testTitle?: string;
  correctlyAnsweredQuestionIds?: string[];
  incorrectlyAnsweredQuestionIds?: string[];
  sessionQuestionIds?: string[];
  status: 'in-progress' | 'completed';
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
  createdAt: string;
  classId?: string;
  subjectId?: string;
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
