'use client';

import React from 'react';
import { McqTest } from '@/components/mcq-test';
import type { Test, Question } from '@/lib/types';

const previewQuestions: Question[] = [
  {
    id: '10_1_g_S_01',
    text: 'ஒரு சொல் தனித்து நின்று பொருள் தருமாயின் அது எவ்வாறு அழைக்கப்படும்?',
    correctAnswer: 'தனிமொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'இணைமொழி'],
    explanation: 'ஒரு சொல் தனித்து நின்று பொருள் தருவது தனிமொழி எனப்படும். (எ.கா: கண், படி).',
    reference: 'பத்தாம் வகுப்பு தமிழ், இயல் 1, சொல் (இலக்கணம்), பக். 13',
    referencePage: 13,
  },
  {
    id: '10_1_g_S_02',
    text: 'இரண்டு அல்லது அதற்கு மேற்பட்ட தனிமொழிகள் தொடர்ந்து வந்து பொருள் தருவது எது?',
    correctAnswer: 'தொடர்மொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'தொகைமொழி'],
    explanation: 'இரண்டு அல்லது அதற்கு மேற்பட்ட தனிமொழிகள் தொடர்ந்து வந்து பொருள் தருவது தொடர்மொழி ஆகும். (எ.கா: கண்ணன் வந்தான்).',
    reference: 'பத்தாம் வகுப்பு தமிழ், இயல் 1, சொல் (இலக்கணம்), பக். 13',
    referencePage: 13,
  },
  {
    id: '10_1_g_S_03',
    text: 'ஒரு சொல் தனித்து நின்று ஒரு பொருளையும், அதே சொல் பிரிந்து நின்று வேறு பொருளையும் தந்து தனிமொழிக்கும் தொடர்மொழிக்கும் பொதுவாய் அமைவது எது?',
    correctAnswer: 'பொதுமொழி',
    answerOptions: ['தனிமொழி', 'தொடர்மொழி', 'பொதுமொழி', 'மரபுச்சொல்'],
    explanation: 'ஒரு சொல் தனித்து நின்று ஒரு பொருளையும் பிரிந்து நின்று வேறு பொருளையும் தருவது பொதுமொழி எனப்படும். (எ.கா: எட்டு, வேங்கை).',
    reference: 'பத்தாம் வகுப்பு தமிழ், இயல் 1, சொல் (இலக்கணம்), பக். 14',
    referencePage: 14,
  },
  {
    id: '10_1_g_S_04',
    text: 'ஒரு வினை அல்லது செயலைக் குறிக்கும் பெயரானது எண், இடம், காலம், பால் ஆகியவற்றை வெளிப்படையாகவோ குறிப்பாகவோ உணர்த்தாமல் வருவது எது?',
    correctAnswer: 'தொழிற்பெயர்',
    answerOptions: ['வினையாலணையும் பெயர்', 'தொழிற்பெயர்', 'பண்புப்பெயர்', 'இடப்பெயர்'],
    explanation: 'ஒரு வினை அல்லது செயலைக் குறிக்கும் பெயரானது எண், இடம், காலம், பால் ஆகியவற்றை உணர்த்தாமல் வருவது தொழிற்பெயர் எனப்படும்.',
    reference: 'பத்தாம் வகுப்பு தமிழ், இயல் 1, சொல் (இலக்கணம்), பக். 14',
    referencePage: 14,
  },
  {
    id: '10_1_g_S_05',
    text: 'வினையடியுடன் விகுதி சேர்வதால் உருவாகும் தொழிற்பெயர் எவ்வாறு அழைக்கப்படும்?',
    correctAnswer: 'விகுதி பெற்ற தொழிற்பெயர்',
    answerOptions: ['முதனிலைத் தொழிற்பெயர்', 'முதனிலை திரிந்த தொழிற்பெயர்', 'விகுதி பெற்ற தொழிற்பெயர்', 'எதிர்மறைத் தொழிற்பெயர்'],
    explanation: 'வினையடியுடன் விகுதி சேர்வதால் உருவாகும் தொழிற்பெயர் விகுதி பெற்ற தொழிற்பெயர் ஆகும். (எ.கா: நட + தல் = நடத்தல்).',
    reference: 'பத்தாம் வகுப்பு தமிழ், இயல் 1, சொல் (இலக்கணம்), பக். 14',
    referencePage: 14,
  }
];

const previewTest: Test = {
  id: 'preview_10_tamil_unit1',
  title: 'பத்தாம் வகுப்பு தமிழ் — இயல் 1: சொல் (இலக்கணம்)',
  description: 'Class 10 Tamil 2025 Edition, Grammar Chapter 1 Interactive Practice & Exam Simulator',
  questionIds: previewQuestions.map(q => q.id),
  questions: previewQuestions,
  classId: 'class-10',
  subjectId: 'tamil',
  categoryId: 'ilakkanam',
  referencePageOffset: 10,
  duration: 5, // 5 minutes for 5 questions
  totalQuestions: 5,
};

export default function TestPreviewPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <McqTest
        test={previewTest}
        totalQuestions={previewQuestions.length}
        answeredQuestions={0}
        inProgressAttempt={null}
      />
    </div>
  );
}
