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
}

// Type for uploading questions, ID is optional as it will be generated.
export type QuestionInput = Omit<Question, 'id'>;

export interface Test {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'class' | 'subject' | 'previous';
  image: ImagePlaceholder;
  questionIds: string[];
  questions?: Question[];
  classId?: string; // Added for class-wise tests
  subjectId?: string; // Added for subject-wise tests
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

export interface Unit {
  id: string;
  classId: string;
  subjectId: string;
  term: string;
  unitNumber: number;
  unitName: string;
  category?: string;
  className?: string; // For display purposes
  subjectName?: string; // For display purposes
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
