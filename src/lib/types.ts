import type { ImagePlaceholder } from './placeholder-images';
import { DocumentData, DocumentReference } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  subjectId: string;
  classId: string;
  correctAnswerIndex: number;
  answerOptions: string[];
}

export interface Test {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'class' | 'subject' | 'previous';
  image: ImagePlaceholder;
  questionIds: string[];
  questions?: Question[];
}

export interface Subject {
    id: string;
    name: string;
    description: string;
}

export interface Class {
    id: string;
    name: string;
    description: string;
}
