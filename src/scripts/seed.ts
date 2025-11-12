'use server';

import { initializeFirebase } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { PlaceHolderImages } from '../lib/placeholder-images';

const findImage = (id: string) => {
    const image = PlaceHolderImages.find((img) => img.id === id);
    if (!image) {
      throw new Error(`Image with id "${id}" not found.`);
    }
    return image;
};

const subjects = [
    { id: 'science', name: 'Science', description: 'General Science' },
    { id: 'maths', name: 'Maths', description: 'General Maths' },
    { id: 'history', name: 'History', description: 'Indian History' },
    { id: 'geography', name: 'Geography', description: 'World Geography' },
    { id: 'polity', name: 'Polity', description: 'Indian Polity' },
    { id: 'tamil', name: 'Tamil', description: 'Tamil Language' },
];

const classes = [
    { id: '10', name: 'Class 10', description: '10th Standard' },
    { id: '12', name: 'Class 12', description: '12th Standard' },
];

const questions = [
    { id: 'q1', text: 'நீரின் வேதியியல் சூத்திரம் என்ன?', subjectId: 'science', classId: '10', answerOptions: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswerIndex: 0 },
    { id: 'q2', text: 'எந்த கிரகம் சிவப்பு கிரகம் என்று அழைக்கப்படுகிறது?', subjectId: 'science', classId: '10', answerOptions: ['பூமி', 'செவ்வாய்', 'வியாழன்', 'சனி'], correctAnswerIndex: 1 },
    { id: 'q3', text: 'செல்லின் ஆற்றல் மையம் எது?', subjectId: 'science', classId: '10', answerOptions: ['கரு', 'ரைபோசோம்', 'மைட்டோகாண்ட்ரியா', 'குளோரோபிளாஸ்ட்'], correctAnswerIndex: 2 },
    { id: 'q4', text: 'x^2 இன் வகைக்கெழு என்ன?', subjectId: 'maths', classId: '12', answerOptions: ['2x', 'x', 'x^3/3', '2'], correctAnswerIndex: 0 },
    { id: 'q5', text: '1/x dx இன் தொகையீடு என்ன?', subjectId: 'maths', classId: '12', answerOptions: ['ln|x| + C', '1', 'x^2', '-1/x^2 + C'], correctAnswerIndex: 0 },
    { id: 'q6', text: 'இந்தியாவின் முதல் பிரதமர் யார்?', subjectId: 'history', classId: '12', answerOptions: ['மகாத்மா காந்தி', 'ஜவஹர்லால் நேரு', 'சர்தார் படேல்', 'சுபாஷ் சந்திர போஸ்'], correctAnswerIndex: 1 },
    { id: 'q7', text: 'பிளாசி போர் எந்த ஆண்டு நடந்தது?', subjectId: 'history', classId: '12', answerOptions: ['1757', '1764', '1857', '1947'], correctAnswerIndex: 0 },
    { id: 'q8', text: 'உலகின் மிக நீளமான நதி எது?', subjectId: 'geography', classId: '10', answerOptions: ['அமேசான்', 'நைல்', 'யாங்சே', 'மிசிசிப்பி'], correctAnswerIndex: 1 },
    { id: 'q9', text: 'உலகின் மிகப்பெரிய பாலைவனம் எது?', subjectId: 'geography', classId: '10', answerOptions: ['சஹாரா', 'அரேபியன்', 'கோபி', 'அண்டार्க்டிக் துருவம்'], correctAnswerIndex: 3 },
    { id: 'q10', text: 'இந்திய அரசியலமைப்பின் எந்தப் பிரிவின் கீழ் "கல்வி உரிமை" ஒரு அடிப்படை உரிமையாகும்?', subjectId: 'polity', classId: '12', answerOptions: ['பிரிவு 21A', 'பிரிவு 19', 'பிரிவு 14', 'பிரிவு 32'], correctAnswerIndex: 0 },
    { id: 'q11', text: 'பின்வருவனவற்றில் எது தமிழ்நாட்டின் பாரம்பரிய நடன வடிவம்?', subjectId: 'history', classId: '12', answerOptions: ['கதக்', 'குச்சிப்புடி', 'பரதநாட்டியம்', 'மோகினியாட்டம்'], correctAnswerIndex: 2 },
    { id: 'q12', text: 'சங்க இலக்கியம் எந்த மொழியில் எழுதப்பட்டது?', subjectId: 'tamil', classId: '12', answerOptions: ['சமஸ்கிருதம்', 'பாளி', 'தமிழ்', 'தெலுங்கு'], correctAnswerIndex: 2 },
    { id: 'q13', text: 'இந்திய அரசியலமைப்பின் தந்தை என்று யார் அழைக்கப்படுகிறார்?', subjectId: 'polity', classId: '12', answerOptions: ['மகாத்மா காந்தி', 'ஜவஹர்லால் நேரு', 'டாக்டர். பி. ஆர். அம்பேத்கர்', 'சர்தார் வல்லபாய் படேல்'], correctAnswerIndex: 2 },
    { id: 'q14', text: 'கீழடியில் நடத்தப்பட்ட தொல்பொருள் ஆய்வுகள் எந்த நாகரிகத்துடன் தொடர்புடையவை?', subjectId: 'history', classId: '10', answerOptions: ['சிந்து சமவெளி நாகரிகம்', 'சங்க கால நாகரிகம்', 'மௌரியப் பேரரசு', 'குப்தப் பேரரசு'], correctAnswerIndex: 1 },
    { id: 'q15', text: 'திருக்குறளை எழுதியவர் யார்?', subjectId: 'tamil', classId: '10', answerOptions: ['கம்பர்', 'திருவள்ளுவர்', 'ஔவையார்', 'பாரதியார்'], correctAnswerIndex: 1 },
];

const tests = [
  {
    id: 'class-10-science',
    slug: 'class-10-science',
    title: 'வகுப்பு 10 - அறிவியல்',
    category: 'class',
    description: '10 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்தின் முக்கிய संकल्पనைகள் குறித்த உங்கள் அறிவை சோதிக்கவும்.',
    image: findImage('class-wise'),
    questionIds: ['q1', 'q2', 'q3'],
  },
  {
    id: 'class-12-maths',
    slug: 'class-12-maths',
    title: 'வகுப்பு 12 - கணிதம்',
    category: 'class',
    description: '12 ஆம் வகுப்பு கணித பாடத்திட்டத்தில் இருந்து கேள்விகளுடன் உங்களை நீங்களே சோதித்துக் கொள்ளுங்கள்.',
    image: findImage('class-wise'),
    questionIds: ['q4', 'q5'],
  },
  {
    id: 'indian-history',
    slug: 'indian-history',
    title: 'இந்திய வரலாறு',
    category: 'subject',
    description: 'இந்த சவாலான கேள்விகளுடன் இந்தியாவின் வளமான வரலாற்றை ஆராயுங்கள்.',
    image: findImage('subject-wise'),
    questionIds: ['q6', 'q7'],
  },
  {
    id: 'geography',
    slug: 'geography',
    title: 'புவியியல்',
    category: 'subject',
    description: 'உலகம் முழுவதிலுமிருந்து உங்கள் புவியியல் அறிவை சோதிக்கவும்.',
    image: findImage('subject-wise'),
    questionIds: ['q8', 'q9'],
  },
  {
    id: 'tnpsc-2023-group-1',
    slug: 'tnpsc-2023-group-1',
    title: '2023 TNPSC குரூப் I',
    category: 'previous',
    description: '2023 TNPSC குரூப் I முதல்நிலைத் தேர்வின் உண்மையான கேள்விகளுடன் பயிற்சி செய்யுங்கள்.',
    image: findImage('previous-year'),
    questionIds: ['q10', 'q11'],
  },
  {
    id: 'tnpsc-2022-group-2',
    slug: 'tnpsc-2022-group-2',
    title: '2022 TNPSC குரூப் II',
    category: 'previous',
    description: '2022 TNPSC குரூப் II தேர்வின் முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.',
    image: findImage('previous-year'),
    questionIds: ['q12', 'q13'],
  },
  {
    id: 'tnpsc-2021-group-4',
    slug: 'tnpsc-2021-group-4',
    title: '2021 TNPSC குரூப் IV',
    category: 'previous',
    description: '2021 TNPSC குரூப் IV தேர்வில் இருந்து கேள்விகளுடன் உங்கள் அறிவை சோதிக்கவும்.',
    image: findImage('previous-year'),
    questionIds: ['q14', 'q15'],
  },
];


export async function seedDatabase() {
  const { firestore } = initializeFirebase();
  const batch = writeBatch(firestore);

  // Seed Subjects
  const subjectsCollection = collection(firestore, 'subjects');
  subjects.forEach((subject) => {
    const docRef = doc(subjectsCollection, subject.id);
    batch.set(docRef, subject);
  });

  // Seed Classes
  const classesCollection = collection(firestore, 'classes');
  classes.forEach((cls) => {
    const docRef = doc(classesCollection, cls.id);
    batch.set(docRef, cls);
  });

  // Seed Questions
  const questionsCollection = collection(firestore, 'questions');
  questions.forEach((question) => {
    const docRef = doc(questionsCollection, question.id);
    batch.set(docRef, question);
  });

  // Seed Tests
  const testsCollection = collection(firestore, 'tests');
  tests.forEach((test) => {
    const docRef = doc(testsCollection, test.id);
    batch.set(docRef, test);
  });

  try {
    await batch.commit();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
