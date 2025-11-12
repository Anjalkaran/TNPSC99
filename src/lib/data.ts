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
    title: 'வகுப்பு 10 - அறிவியல்',
    category: 'class',
    description: '10 ஆம் வகுப்பு அறிவியல் பாடத்திட்டத்தின் முக்கிய संकल्पనைகள் குறித்த உங்கள் அறிவை சோதிக்கவும்.',
    image: findImage('class-wise'),
    questions: [
      { id: 1, question: 'நீரின் வேதியியல் சூத்திரம் என்ன?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 'H2O' },
      { id: 2, question: 'எந்த கிரகம் சிவப்பு கிரகம் என்று அழைக்கப்படுகிறது?', options: ['பூமி', 'செவ்வாய்', 'வியாழன்', 'சனி'], correctAnswer: 'செவ்வாய்' },
      { id: 3, question: 'செல்லின் ஆற்றல் மையம் எது?', options: ['கரு', 'ரைபோசோம்', 'மைட்டோகாண்ட்ரியா', 'குளோரோபிளாஸ்ட்'], correctAnswer: 'மைட்டோகாண்ட்ரியா' },
    ],
  },
  {
    slug: 'class-12-maths',
    title: 'வகுப்பு 12 - கணிதம்',
    category: 'class',
    description: '12 ஆம் வகுப்பு கணித பாடத்திட்டத்தில் இருந்து கேள்விகளுடன் உங்களை நீங்களே சோதித்துக் கொள்ளுங்கள்.',
    image: findImage('class-wise'),
    questions: [
      { id: 1, question: 'x^2 இன் வகைக்கெழு என்ன?', options: ['2x', 'x', 'x^3/3', '2'], correctAnswer: '2x' },
      { id: 2, question: '1/x dx இன் தொகையீடு என்ன?', options: ['ln|x| + C', '1', 'x^2', '-1/x^2 + C'], correctAnswer: 'ln|x| + C' },
    ],
  },
  {
    slug: 'indian-history',
    title: 'இந்திய வரலாறு',
    category: 'subject',
    description: 'இந்த சவாலான கேள்விகளுடன் இந்தியாவின் வளமான வரலாற்றை ஆராயுங்கள்.',
    image: findImage('subject-wise'),
    questions: [
      { id: 1, question: 'இந்தியாவின் முதல் பிரதமர் யார்?', options: ['மகாத்மா காந்தி', 'ஜவஹர்லால் நேரு', 'சர்தார் படேல்', 'சுபாஷ் சந்திர போஸ்'], correctAnswer: 'ஜவஹர்லால் நேரு' },
      { id: 2, question: 'பிளாசி போர் எந்த ஆண்டு நடந்தது?', options: ['1757', '1764', '1857', '1947'], correctAnswer: '1757' },
    ],
  },
    {
    slug: 'geography',
    title: 'புவியியல்',
    category: 'subject',
    description: 'உலகம் முழுவதிலுமிருந்து உங்கள் புவியியல் அறிவை சோதிக்கவும்.',
    image: findImage('subject-wise'),
    questions: [
      { id: 1, question: 'உலகின் மிக நீளமான நதி எது?', options: ['அமேசான்', 'நைல்', 'யாங்சே', 'மிசிசிப்பி'], correctAnswer: 'நைல்' },
      { id: 2, question: 'உலகின் மிகப்பெரிய பாலைவனம் எது?', options: ['சஹாரா', 'அரேபியன்', 'கோபி', 'அண்டार्க்டிக் துருவம்'], correctAnswer: 'அண்டार्க்டிக் துருவம்' },
    ],
  },
  {
    slug: 'tnpsc-2023-group-1',
    title: '2023 TNPSC குரூப் I',
    category: 'previous',
    description: '2023 TNPSC குரூப் I முதல்நிலைத் தேர்வின் உண்மையான கேள்விகளுடன் பயிற்சி செய்யுங்கள்.',
    image: findImage('previous-year'),
    questions: [
      { id: 1, question: 'இந்திய அரசியலமைப்பின் எந்தப் பிரிவின் கீழ் "கல்வி உரிமை" ஒரு அடிப்படை உரிமையாகும்?', options: ['பிரிவு 21A', 'பிரிவு 19', 'பிரிவு 14', 'பிரிவு 32'], correctAnswer: 'பிரிவு 21A' },
      { id: 2, question: 'பின்வருவனவற்றில் எது தமிழ்நாட்டின் பாரம்பரிய நடன வடிவம்?', options: ['கதக்', 'குச்சிப்புடி', 'பரதநாட்டியம்', 'மோகினியாட்டம்'], correctAnswer: 'பரதநாட்டியம்' },
    ],
  },
    {
    slug: 'tnpsc-2022-group-2',
    title: '2022 TNPSC குரூப் II',
    category: 'previous',
    description: '2022 TNPSC குரூப் II தேர்வின் முறையைப் பற்றி அறிந்து கொள்ளுங்கள்.',
    image: findImage('previous-year'),
    questions: [
      { id: 1, question: 'சங்க இலக்கியம் எந்த மொழியில் எழுதப்பட்டது?', options: ['சமஸ்கிருதம்', 'பாளி', 'தமிழ்', 'தெலுங்கு'], correctAnswer: 'தமிழ்' },
      { id: 2, question: 'இந்திய அரசியலமைப்பின் தந்தை என்று யார் அழைக்கப்படுகிறார்?', options: ['மகாத்மா காந்தி', 'ஜவஹர்லால் நேரு', 'டாக்டர். பி. ஆர். அம்பேத்கர்', 'சர்தார் வல்லபாய் படேல்'], correctAnswer: 'டாக்டர். பி. ஆர். அம்பேத்கர்' },
    ],
  },
];
