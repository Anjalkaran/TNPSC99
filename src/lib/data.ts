import type { Test } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (!image) {
    throw new Error(`Image with id "${id}" not found.`);
  }
  return image;
};

export const tests: Test[] = [
  {
    slug: 'class-10-science',
    title: 'Class 10 - Science',
    category: 'class',
    description: 'Test your knowledge of key concepts from the Class 10 Science syllabus.',
    image: findImage('class-wise'),
    questions: [
      { id: 1, question: 'What is the chemical formula for water?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 'H2O' },
      { id: 2, question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars' },
      { id: 3, question: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Chloroplast'], correctAnswer: 'Mitochondria' },
    ],
  },
  {
    slug: 'class-12-maths',
    title: 'Class 12 - Mathematics',
    category: 'class',
    description: 'Challenge yourself with questions from the Class 12 Mathematics curriculum.',
    image: findImage('class-wise'),
    questions: [
      { id: 1, question: 'What is the derivative of x^2?', options: ['2x', 'x', 'x^3/3', '2'], correctAnswer: '2x' },
      { id: 2, question: 'What is the integral of 1/x dx?', options: ['ln|x| + C', '1', 'x^2', '-1/x^2 + C'], correctAnswer: 'ln|x| + C' },
    ],
  },
  {
    slug: 'indian-history',
    title: 'Indian History',
    category: 'subject',
    description: 'Explore the rich history of India with these challenging questions.',
    image: findImage('subject-wise'),
    questions: [
      { id: 1, question: 'Who was the first Prime Minister of India?', options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'Subhas Chandra Bose'], correctAnswer: 'Jawaharlal Nehru' },
      { id: 2, question: 'The Battle of Plassey was fought in which year?', options: ['1757', '1764', '1857', '1947'], correctAnswer: '1757' },
    ],
  },
    {
    slug: 'geography',
    title: 'Geography',
    category: 'subject',
    description: 'Test your geographical knowledge from around the world.',
    image: findImage('subject-wise'),
    questions: [
      { id: 1, question: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], correctAnswer: 'Nile' },
      { id: 2, question: 'Which is the largest desert in the world?', options: ['Sahara', 'Arabian', 'Gobi', 'Antarctic Polar'], correctAnswer: 'Antarctic Polar' },
    ],
  },
  {
    slug: 'tnpsc-2023-group-1',
    title: '2023 TNPSC Group I',
    category: 'previous',
    description: 'Practice with actual questions from the 2023 TNPSC Group I preliminary exam.',
    image: findImage('previous-year'),
    questions: [
      { id: 1, question: 'The "Right to Education" is a fundamental right under which article of the Indian Constitution?', options: ['Article 21A', 'Article 19', 'Article 14', 'Article 32'], correctAnswer: 'Article 21A' },
      { id: 2, question: 'Which of the following is a classical dance form of Tamil Nadu?', options: ['Kathak', 'Kuchipudi', 'Bharatanatyam', 'Mohiniyattam'], correctAnswer: 'Bharatanatyam' },
    ],
  },
    {
    slug: 'tnpsc-2022-group-2',
    title: '2022 TNPSC Group II',
    category: 'previous',
    description: 'Familiarize yourself with the pattern from the 2022 TNPSC Group II exam.',
    image: findImage('previous-year'),
    questions: [
      { id: 1, question: 'The Sangam literature was written in which language?', options: ['Sanskrit', 'Pali', 'Tamil', 'Telugu'], correctAnswer: 'Tamil' },
      { id: 2, question: 'Who is known as the "Father of the Indian Constitution"?', options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Dr. B. R. Ambedkar', 'Sardar Vallabhbhai Patel'], correctAnswer: 'Dr. B. R. Ambedkar' },
    ],
  },
];
