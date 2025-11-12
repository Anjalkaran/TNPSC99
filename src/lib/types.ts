import type { ImagePlaceholder } from './placeholder-images';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Test {
  slug: string;
  title: string;
  category: 'class' | 'subject' | 'previous';
  description: string;
  questions: Question[];
  image: ImagePlaceholder;
}
