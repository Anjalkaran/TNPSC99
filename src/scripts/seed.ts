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
    { id: 'general-science', name: 'General Science', name_ta: 'பொது அறிவியல்', description: 'General Science', description_ta: 'பொது அறிவியல்' },
    { id: 'geography', name: 'Geography', name_ta: 'புவியியல்', description: 'Geography', description_ta: 'புவியியல்' },
    { id: 'history-culture-inm', name: 'History, Culture of India, and Indian National Movement', name_ta: 'வரலாறு, இந்திய கலாச்சாரம் மற்றும் இந்திய தேசிய இயக்கம்', description: 'History, Culture of India, and Indian National Movement', description_ta: 'வரலாறு, இந்திய கலாச்சாரம் மற்றும் இந்திய தேசிய இயக்கம்' },
    { id: 'indian-polity', name: 'Indian Polity', name_ta: 'இந்திய அரசியல்', description: 'Indian Polity', description_ta: 'இந்திய அரசியல்' },
    { id: 'indian-economy-dev-admin', name: 'Indian Economy and Development Administration in Tamil Nadu', name_ta: 'இந்திய பொருளாதாரம் மற்றும் தமிழகத்தில் வளர்ச்சி நிர்வாகம்', description: 'Indian Economy and Development Administration in Tamil Nadu', description_ta: 'இந்திய பொருளாதாரம் மற்றும் தமிழகத்தில் வளர்ச்சி நிர்வாகம்' },
    { id: 'history-culture-heritage-tn', name: 'History, Culture, Heritage, and Socio-Political Movements of Tamil Nadu', name_ta: 'வரலாறு, கலாச்சாரம், பாரம்பரியம் மற்றும் தமிழகத்தின் சமூக-அரசியல் இயக்கங்கள்', description: 'History, Culture, Heritage, and Socio-Political Movements of Tamil Nadu', description_ta: 'வரலாறு, கலாச்சாரம், பாரம்பரியம் மற்றும் தமிழகத்தின் சமூக-அரசியல் இயக்கங்கள்' },
    { id: 'aptitude', name: 'Aptitude', name_ta: 'திறனறிதல்', description: 'Aptitude', description_ta: 'திறனறிதல்' },
    { id: 'reasoning', name: 'Reasoning', name_ta: 'காரணமறிதல்', description: 'Reasoning', description_ta: 'காரணமறிதல்' },
    { id: 'tamil-grammar', name: 'Tamil Grammar', name_ta: 'தமிழ் இலக்கணம்', description: 'Tamil Grammar', description_ta: 'தமிழ் இலக்கணம்' },
    { id: 'tamil-vocabulary', name: 'Tamil Vocabulary', name_ta: 'தமிழ் சொல்லகராதி', description: 'Tamil Vocabulary', description_ta: 'தமிழ் சொல்லகராதி' },
    { id: 'tamil-writing-skills', name: 'Tamil Writing Skills', name_ta: 'தமிழ் எழுதும் திறன்', description: 'Tamil Writing Skills', description_ta: 'தமிழ் எழுதும் திறன்' },
    { id: 'tamil-technical-terms', name: 'Tamil Technical Terms', name_ta: 'தமிழ் கலைச் சொற்கள்', description: 'Tamil Technical Terms', description_ta: 'தமிழ் கலைச் சொற்கள்' },
    { id: 'tamil-comprehension', name: 'Tamil Comprehension', name_ta: 'தமிழ் வாசித்தல் – புரிந்து கொள்ளும் திறன்', description: 'Tamil Reading Comprehension', description_ta: 'தமிழ் வாசித்தல் – புரிந்து கொள்ளும் திறன்' },
    { id: 'tamil-translation', name: 'Tamil Simple Translation', name_ta: 'தமிழ் எளிய மொழி பெயர்ப்பு', description: 'Tamil Simple Translation', description_ta: 'தமிழ் எளிய மொழி பெயர்ப்பு' },
    { id: 'tamil-literature', name: 'Tamil Literature', name_ta: 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்', description: 'Tamil Literature', description_ta: 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்' },
    { id: 'maths', name: 'Maths', name_ta: 'கணிதம்', description: 'General Maths', description_ta: 'பொது கணிதம்' },
    { id: 'history', name: 'History', name_ta: 'வரலாறு', description: 'Indian History', description_ta: 'இந்திய வரலாறு' },
    { id: 'polity', name: 'Polity', name_ta: 'அரசியல் அமைப்பு', description: 'Indian Polity', description_ta: 'இந்திய அரசியல் அமைப்பு' },
    { id: 'tamil', name: 'Tamil', name_ta: 'தமிழ்', description: 'Tamil Language', description_ta: 'தமிழ் மொழி' },
    { id: 'social-science', name: 'Social Science', name_ta: 'சமூக அறிவியல்', description: 'Social Science', description_ta: 'சமூக அறிவியல்' },
    { id: 'science', name: 'Science', name_ta: 'அறிவியல்', description: 'General Science', description_ta: 'பொது அறிவியல்' },
];

const classes = [
    { id: '5', name: 'Class V', name_ta: '5ஆம் வகுப்பு', description: '5th Standard' },
    { id: '6', name: 'Class VI', name_ta: '6ஆம் வகுப்பு', description: '6th Standard' },
    { id: '7', name: 'Class VII', name_ta: '7ஆம் வகுப்பு', description: '7th Standard' },
    { id: '8', name: 'Class VIII', name_ta: '8ஆம் வகுப்பு', description: '8th Standard' },
    { id: '9', name: 'Class IX', name_ta: '9ஆம் வகுப்பு', description: '9th Standard' },
    { id: '10', name: 'Class X', name_ta: '10ஆம் வகுப்பு', description: '10th Standard' },
    { id: '12', name: 'Class XII', name_ta: '12ஆம் வகுப்பு', description: '12th Standard' },
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
    { id: 'q9', text: 'உலகின் மிகப்பெரிய பாலைவனம் எது?', subjectId: 'geography', classId: '10', answerOptions: ['சஹாரா', 'அரேபியன்', 'கோபி', 'அண்டார்க்டிக் துருவம்'], correctAnswerIndex: 3 },
    { id: 'q10', text: 'இந்திய அரசியலமைப்பின் எந்தப் பிரிவின் கீழ் "கல்வி உரிமை" ஒரு அடிப்படை உரிமையாகும்?', subjectId: 'polity', classId: '12', answerOptions: ['பிரிவு 21A', 'பிரிவு 19', 'பிரிவு 14', 'பிரிவு 32'], correctAnswerIndex: 0 },
    { id: 'q11', text: 'பின்வருவனவற்றில் எது தமிழ்நாட்டின் பாரம்பரிய நடன வடிவம்?', subjectId: 'history', classId: '12', answerOptions: ['கதக்', 'குச்சிப்புடி', 'பரதநாட்டியம்', 'மோகினியாட்டம்'], correctAnswerIndex: 2 },
    { id: 'q12', text: 'சங்க இலக்கியம் எந்த மொழியில் எழுதப்பட்டது?', subjectId: 'tamil', classId: '12', answerOptions: ['சமஸ்கிருதம்', 'பாளி', 'தமிழ்', 'தெலுங்கு'], correctAnswerIndex: 2 },
    { id: 'q13', text: 'இந்திய அரசியலமைப்பின் தந்தை என்று யார் அழைக்கப்படுகிறார்?', subjectId: 'polity', classId: '12', answerOptions: ['மகாத்மா காந்தி', 'ஜவஹர்லால் நேரு', 'டாக்டர். பி. ஆர். அம்பேத்கர்', 'சர்தார் வல்லபாய் படேல்'], correctAnswerIndex: 2 },
    { id: 'q14', text: 'கீழடியில் நடத்தப்பட்ட தொல்பொருள் ஆய்வுகள் எந்த நாகரிகத்துடன் தொடர்புடையவை?', subjectId: 'history', classId: '10', answerOptions: ['சிந்து சமவெளி நாகரிகம்', 'சங்க கால நாகரிகம்', 'மௌரியப் பேரரசு', 'குப்தப் பேரரசு'], correctAnswerIndex: 1 },
    { id: 'q15', text: 'திருக்குறளை எழுதியவர் யார்?', subjectId: 'tamil', classId: '10', answerOptions: ['கம்பர்', 'திருவள்ளுவர்', 'ஔவையார்', 'பாரதியார்'], correctAnswerIndex: 1 },
    // Class 6
    { id: 'q16', text: 'ஆத்திசூடியை எழுதியவர் யார்?', subjectId: 'tamil', classId: '6', answerOptions: ['ஔவையார்', 'கம்பர்', 'திருவள்ளுவர்', 'பாரதியார்'], correctAnswerIndex: 0 },
    { id: 'q17', text: 'ஒளிச்சேர்க்கைக்கு தேவைப்படுவது எது?', subjectId: 'science', classId: '6', answerOptions: ['ஆக்ஸிஜன்', 'கார்பன் டை ஆக்சைடு', 'நைட்ரஜன்', 'ஹைட்ரஜன்'], correctAnswerIndex: 1 },
    { id: 'q18', text: 'சிந்து சமவெளி நாகரிகத்தின் முக்கிய அம்சம் எது?', subjectId: 'social-science', classId: '6', answerOptions: ['திட்டமிடப்பட்ட நகரங்கள்', 'பெரிய கோவில்கள்', 'இரும்பு கருவிகள்', 'குதிரைகள்'], correctAnswerIndex: 0 },
    // Class 7
    { id: 'q19', text: 'சிலப்பதிகாரத்தின் ஆசிரியர் யார்?', subjectId: 'tamil', classId: '7', answerOptions: ['திருத்தக்கதேவர்', 'இளங்கோவடிகள்', 'சீத்தலைச்சாத்தனார்', 'கம்பர்'], correctAnswerIndex: 1 },
    { id: 'q20', text: 'மனித உடலில் உள்ள மிகப்பெரிய உறுப்பு எது?', subjectId: 'science', classId: '7', answerOptions: ['கல்லீரல்', 'மூளை', 'இதயம்', 'தோல்'], correctAnswerIndex: 3 },
    { id: 'q21', text: 'டெல்லியை ஆண்ட முதல் பெண் ஆட்சியாளர் யார்?', subjectId: 'social-science', classId: '7', answerOptions: ['ரசியா சுல்தான்', 'சாந்த் बीबी', 'ராணி மங்கம்மாள்', 'ராணி சென்னம்மா'], correctAnswerIndex: 0 },
    // Class 8
    { id: 'q22', text: 'மணிமேகலையின் ஆசிரியர் யார்?', subjectId: 'tamil', classId: '8', answerOptions: ['இளங்கோவடிகள்', 'கம்பர்', 'சீத்தலைச்சாத்தனார்', 'திருவள்ளுவர்'], correctAnswerIndex: 2 },
    { id: 'q23', text: 'அணுவின் அடிப்படைத் துகள்கள் யாவை?', subjectId: 'science', classId: '8', answerOptions: ['புரோட்டான், நியூட்ரான், எலக்ட்ரான்', 'போட்டான், குளுவான், கிராவிட்டான்', 'மீசோன், லெப்டான், குவார்க்', 'மேற்கூறிய எதுவும் இல்லை'], correctAnswerIndex: 0 },
    { id: 'q24', text: 'ஐரோப்பாவிலிருந்து இந்தியாவிற்கு கடல் வழியைக் கண்டுபிடித்த முதல் ஐரோப்பியர் யார்?', subjectId: 'social-science', classId: '8', answerOptions: ['கிறிஸ்டோபர் கொலம்பஸ்', 'வாஸ்கோ ட காமா', 'மார்க்கோ போலோ', 'பார்த்தலோமியோ டயஸ்'], correctAnswerIndex: 1 },
    // Class 9
    { id: 'q25', text: 'யாப்பு இலக்கணத்தில் உள்ள உறுப்புகள் எத்தனை?', subjectId: 'tamil', classId: '9', answerOptions: ['நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு'], correctAnswerIndex: 2 },
    { id: 'q26', text: 'மரபியலின் தந்தை என்று அழைக்கப்படுபவர் யார்?', subjectId: 'science', classId: '9', answerOptions: ['சார்லஸ் டார்வின்', 'கிரிகோர் மெண்டல்', 'ஆல்பர்ட் ஐன்ஸ்டீன்', 'ஐசக் நியூட்டன்'], correctAnswerIndex: 1 },
    { id: 'q27', text: 'பிரெஞ்சுப் புரட்சி எந்த ஆண்டு தொடங்கியது?', subjectId: 'social-science', classId: '9', answerOptions: ['1776', '1789', '1804', '1815'], correctAnswerIndex: 1 },
    // Group IV questions
    { id: 'q28', text: 'Nature of Universe relates to which subject?', subjectId: 'general-science', classId: '10', answerOptions: ['Physics', 'Chemistry', 'Biology', 'Geology'], correctAnswerIndex: 0 },
    { id: 'q29', text: 'What is the highest common factor (HCF) of 12 and 18?', subjectId: 'aptitude', classId: '10', answerOptions: ['2', '3', '6', '12'], correctAnswerIndex: 2 },
    { id: 'q30', text: "எதிர்ச்செயலைக் கண்டறிக: 'உயர்வு'", subjectId: "tamil-vocabulary", classId: "10", answerOptions: ["தாழ்வு", "மேன்மை", "சிறப்பு", "மிகுதி"], correctAnswerIndex: 0 },

];

const tests = [
  {
    id: 'class-6-tamil-chapters',
    slug: 'class-6-tamil-chapters',
    title: 'Class VI - Tamil Chapters',
    category: 'class',
    description: 'Questions from the 6th Standard Tamil textbook chapters.',
    questionIds: ['q16'],
    classId: '6',
    subjectId: 'tamil',
  },
  {
    id: 'class-6-tamil-grammar',
    slug: 'class-6-tamil-grammar',
    title: 'Class VI - Tamil Grammar',
    category: 'class',
    description: 'Grammar questions from the 6th Standard Tamil syllabus.',
    questionIds: [],
    classId: '6',
    subjectId: 'tamil-grammar',
  },
  {
    id: 'class-6-science',
    slug: 'class-6-science',
    title: 'வகுப்பு 6 - அறிவியல்',
    category: 'class',
    description: '6 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q17'],
    classId: '6',
    subjectId: 'science',
  },
  {
    id: 'class-6-social',
    slug: 'class-6-social',
    title: 'வகுப்பு 6 - சமூக அறிவியல்',
    category: 'class',
    description: '6 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q18'],
    classId: '6',
    subjectId: 'social-science',
  },
  {
    id: 'class-7-tamil-chapters',
    slug: 'class-7-tamil-chapters',
    title: 'Class VII - Tamil Chapters',
    category: 'class',
    description: 'Questions from the 7th Standard Tamil textbook chapters.',
    questionIds: ['q19'],
    classId: '7',
    subjectId: 'tamil',
  },
  {
    id: 'class-7-tamil-grammar',
    slug: 'class-7-tamil-grammar',
    title: 'Class VII - Tamil Grammar',
    category: 'class',
    description: 'Grammar questions from the 7th Standard Tamil syllabus.',
    questionIds: [],
    classId: '7',
    subjectId: 'tamil-grammar',
  },
  {
    id: 'class-7-science',
    slug: 'class-7-science',
    title: 'வகுப்பு 7 - அறிவியல்',
    category: 'class',
    description: '7 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q20'],
    classId: '7',
    subjectId: 'science',
  },
   {
    id: 'class-7-social',
    slug: 'class-7-social',
    title: 'வகுப்பு 7 - சமூக அறிவியல்',
    category: 'class',
    description: '7 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q21'],
    classId: '7',
    subjectId: 'social-science',
  },
  {
    id: 'class-8-tamil-chapters',
    slug: 'class-8-tamil-chapters',
    title: 'Class VIII - Tamil Chapters',
    category: 'class',
    description: 'Questions from the 8th Standard Tamil textbook chapters.',
    questionIds: ['q22'],
    classId: '8',
    subjectId: 'tamil',
  },
   {
    id: 'class-8-tamil-grammar',
    slug: 'class-8-tamil-grammar',
    title: 'Class VIII - Tamil Grammar',
    category: 'class',
    description: 'Grammar questions from the 8th Standard Tamil syllabus.',
    questionIds: [],
    classId: '8',
    subjectId: 'tamil-grammar',
  },
  {
    id: 'class-8-science',
    slug: 'class-8-science',
    title: 'வகுப்பு 8 - அறிவியல்',
    category: 'class',
    description: '8 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q23'],
    classId: '8',
    subjectId: 'science',
  },
   {
    id: 'class-8-social',
    slug: 'class-8-social',
    title: 'வகுப்பு 8 - சமூக அறிவியல்',
    category: 'class',
    description: '8 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q24'],
    classId: '8',
    subjectId: 'social-science',
  },
    {
    id: 'class-9-tamil',
    slug: 'class-9-tamil',
    title: 'வகுப்பு 9 - தமிழ்',
    category: 'class',
    description: '9 ஆம் வகுப்பு தமிழ் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q25'],
    classId: '9',
    subjectId: 'tamil',
  },
  {
    id: 'class-9-science',
    slug: 'class-9-science',
    title: 'வகுப்பு 9 - அறிவியல்',
    category: 'class',
    description: '9 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q26'],
    classId: '9',
    subjectId: 'science',
  },
   {
    id: 'class-9-social',
    slug: 'class-9-social',
    title: 'வகுப்பு 9 - சமூக அறிவியல்',
    category: 'class',
    description: '9 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q27'],
    classId: '9',
    subjectId: 'social-science',
  },
  {
    id: 'class-10-science',
    slug: 'class-10-science',
    title: 'வகுப்பு 10 - அறிவியல்',
    category: 'class',
    description: '10 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்தின் முக்கிய संकल्पனைகள் குறித்த உங்கள் அறிவை சோதிக்கவும்.',
    questionIds: ['q1', 'q2', 'q3'],
    classId: '10',
    subjectId: 'science',
  },
  {
    id: 'class-10-tamil',
    slug: 'class-10-tamil',
    title: 'வகுப்பு 10 - தமிழ்',
    category: 'class',
    description: '10 ஆம் வகுப்பு தமிழ் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q15'],
    classId: '10',
    subjectId: 'tamil',
  },
    {
    id: 'class-10-social',
    slug: 'class-10-social',
    title: 'வகுப்பு 10 - சமூக அறிவியல்',
    category: 'class',
    description: '10 ஆம் வகுப்பு சமூக அறிவியல் பாடத்திட்டத்திலிருந்து கேள்விகள்.',
    questionIds: ['q14'],
    classId: '10',
    subjectId: 'social-science',
  },
  {
    id: 'class-12-maths',
    slug: 'class-12-maths',
    title: 'வகுப்பு 12 - கணிதம்',
    category: 'class',
    description: '12 ஆம் வகுப்பு கணித பாடத்திட்டத்தில் இருந்து கேள்விகளுடன் உங்களை நீங்களே சோதித்துக் கொள்ளுங்கள்.',
    questionIds: ['q4', 'q5'],
    classId: '12',
    subjectId: 'maths',
  },
  {
    id: 'indian-history',
    slug: 'indian-history',
    title: 'இந்திய வரலாறு',
    category: 'subject',
    description: 'இந்த சவாலான கேள்விகளுடன் இந்தியாவின் வளமான வரலாற்றை ஆராயுங்கள்.',
    questionIds: ['q6', 'q7'],
    subjectId: 'history',
  },
  {
    id: 'geography',
    slug: 'geography',
    title: 'புவியியல்',
    category: 'subject',
    description: 'உலகம் முழுவதிலுமிருந்து உங்கள் புவியியல் அறிவை சோதிக்கவும்.',
    questionIds: ['q8', 'q9'],
    subjectId: 'geography',
  },
  {
    id: 'tnpsc-2023-group-1',
    slug: 'tnpsc-2023-group-1',
    title: '2023 TNPSC குரூப் I',
    category: 'previous',
    description: '2023 TNPSC குரூப் I முதல்நிலைத் தேர்வின் உண்மையான கேள்விகளுடன் பயிற்சி செய்யுங்கள்.',
    questionIds: ['q10', 'q11'],
  },
  {
    id: 'tnpsc-2022-group-2',
    slug: 'tnpsc-2022-group-2',
    title: '2022 TNPSC குரூப் II',
    category: 'previous',
    description: '2022 TNPSC குரூப் II தேர்வின் முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.',
    questionIds: ['q12', 'q13'],
  },
  {
    id: 'tnpsc-2021-group-4',
    slug: 'tnpsc-2021-group-4',
    title: '2021 TNPSC குரூப் IV',
    category: 'previous',
    description: '2021 TNPSC குரூப் IV தேர்வில் இருந்து கேள்விகளுடன் உங்கள் அறிவை சோதிக்கவும்.',
    questionIds: ['q14', 'q15', 'q28', 'q29', 'q30'],
  },
  {
    id: 'group4-general-science',
    slug: 'group4-general-science',
    title: 'குரூப் IV - பொது அறிவியல்',
    category: 'subject',
    description: 'TNPSC குரூப் IV பொது அறிவியல் பாடத்திட்டத்தின் அடிப்படையில் கேள்விகள்.',
    questionIds: ['q28'],
    subjectId: 'general-science',
  },
  {
    id: 'group4-aptitude',
    slug: 'group4-aptitude',
    title: 'குரூப் IV - திறனறிவு',
    category: 'subject',
    description: 'TNPSC குரூப் IV திறனறிவு பாடத்திட்டத்தின் அடிப்படையில் கேள்விகள்.',
    questionIds: ['q29'],
    subjectId: 'aptitude',
  },
  {
    id: 'group4-tamil-eligibility',
    slug: 'group4-tamil-eligibility',
    title: 'குரூப் IV - தமிழ் தகுதி',
    category: 'subject',
    description: 'TNPSC குரூப் IV தமிழ் தகுதி மற்றும் மதிப்பீட்டுத் தேர்வு பாடத்திட்டத்தின் அடிப்படையில் கேள்விகள்.',
    questionIds: ['q30'],
    subjectId: 'tamil',
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
    const { image, ...testData } = test; // Exclude image from Firestore data
    batch.set(docRef, testData);
  });

  try {
    await batch.commit();
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
    
    

    

