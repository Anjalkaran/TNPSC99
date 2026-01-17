'use client';
import type { ImagePlaceholder } from './placeholder-images';
import { DocumentData, DocumentReference } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  subjectId: string;
  classId: string;
  unitId: string;
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
  unitNumber: number;
  unitName: string;
  className?: string; // For display purposes
  subjectName?: string; // For display purposes
  categoryName?: string; // For display purposes
}


export interface UserProfile {
  id: string;
  username: string;
  email: string;
  registrationDate: string;
  isAdmin?: boolean;
  phone?: string;
  city?: string;
}

export interface UserTestAttempt {
  id:string;
  userId: string;
  testId: string;
  attemptDate: string;
  score: number;
  answers: number[];
  testTitle?: string;
  correctlyAnsweredQuestionIds?: string[];
  incorrectlyAnsweredQuestionIds?: string[];
  sessionQuestionIds?: string[];
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
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  fileUrl: string;
  fileName: string;
  storagePath: string;
  createdAt: string;
  className?: string; // for display
  subjectName?: string; // for display
}
