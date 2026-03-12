'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import type { Test } from '@/lib/types';

// Structure and question count for the mock test
const MOCK_TEST_CONFIG = [
    // Part C
    { part: 'பகுதி இ', unit: 'அலகு I', unitName: 'இலக்கணம்', count: 25 },
    { part: 'பகுதி இ', unit: 'அலகு II', unitName: 'சொல்லகராதி', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு III', unitName: 'எழுதும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு IV', unitName: 'கலைச் சொற்கள்', count: 10 },
    { part: 'பகுதி இ', unit: 'அலகு V', unitName: 'வாசித்தல் – புரிந்து கொள்ளும் திறன்', count: 15 },
    { part: 'பகுதி இ', unit: 'அலகு VI', unitName: 'எளிய மொழி பெயர்ப்பு', count: 5 },
    { part: 'பகுதி இ', unit: 'அலகு VII', unitName: 'இலக்கியம், தமிழ் அறிஞர்களும், தமிழ்த்தொண்டும்', count: 15 },
    // Part A
    { part: 'பகுதி அ', unit: 'அலகு I', unitName: 'பொது அறிவியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு II', unitName: 'புவியியல்', count: 5 },
    { part: 'பகுதி அ', unit: 'அலகு III', unitName: 'இந்தியாவின் வரலாறு, பண்பாடு மற்றும் இந்திய தேசிய இயக்கம்', count: 10 },
    { part: 'பகுதி அ', unit: 'அலகு IV', unitName: 'இந்திய ஆட்சியியல்', count: 15 },
    { part: 'பகுதி அ', unit: 'அலகு V', unitName: 'இந்தியப் பொருளாதாரம் மற்றும் தமிழ்நாட்டில் வளர்ச்சி நிர்வாகம்', count: 20 },
    { part: 'பகுதி அ', unit: 'அலகு VI', unitName: 'தமிழ்நாட்டின் வரலாறு, பண்பாடு, மரபு மற்றும் சமூக - அரசியல் இயக்கங்கள்', count: 20 },
    // Part B
    { part: 'பகுதி ஆ', unit: 'அலகு I', unitName: 'திறனறிவு', count: 15 },
    { part: 'பகுதி ஆ', unit: 'அலகு II', unitName: 'காரணவியல்', count: 10 },
];

// Function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function generateGroup4MockTest(userId: string, correctlyAnsweredIds: string[]): Promise<{ testId?: string; error?: string; }> {
    if (!userId) {
        return { error: "Authentication required." };
    }

    const { firestore } = initializeFirebaseServer();

    try {
        // 1. Use the passed-in list of correctly answered questions
        const correctlyAnsweredSet = new Set<string>(correctlyAnsweredIds);

        // 2. Fetch all Group IV syllabus tests once
        const testsRef = collection(firestore, 'tests');
        const testsQuery = query(testsRef, where('examGroup', '==', 'Group IV'), where('isMockTest', '!=', true));
        const testsSnapshot = await getDocs(testsQuery);
        const allGroupIVTests = testsSnapshot.docs.map(doc => doc.data() as Test);
        
        const allMockQuestionIds: string[] = [];

        // 3. Assemble questions based on config
        for (const config of MOCK_TEST_CONFIG) {
            // Find all question IDs for this unit config
            const sourceQuestionIds = new Set<string>();
            allGroupIVTests
                .filter(test => test.syllabusPart === config.part && test.syllabusUnit === config.unit && test.syllabusUnitName === config.unitName)
                .forEach(test => {
                    if (Array.isArray(test.questionIds)) {
                        test.questionIds.forEach(id => sourceQuestionIds.add(id));
                    }
                });

            let questionPool = Array.from(sourceQuestionIds);
            
            // Filter out already correctly answered questions
            let availableQuestions = questionPool.filter(id => !correctlyAnsweredSet.has(id));

            // If not enough new questions, add back the answered ones to meet the count
            if (availableQuestions.length < config.count) {
                const answeredInThisUnit = questionPool.filter(id => correctlyAnsweredSet.has(id));
                availableQuestions.push(...shuffleArray(answeredInThisUnit));
            }

            if (availableQuestions.length < config.count) {
                 return { error: `Not enough questions for "${config.unitName}". Found ${availableQuestions.length}, need ${config.count}. Please ask an admin to upload more.` };
            }
            
            // Shuffle and pick the required number of questions
            const selectedIds = shuffleArray(availableQuestions).slice(0, config.count);
            allMockQuestionIds.push(...selectedIds);
        }

        if (allMockQuestionIds.length !== 200) {
            return { error: `Generated test has ${allMockQuestionIds.length} questions, but expected 200. Please check question availability.` };
        }

        // 4. Create the new Test document for the mock test
        const newTestRef = doc(collection(firestore, 'tests'));
        const newMockTest: Partial<Test> = {
            id: newTestRef.id,
            title: `Group IV Mock Test - ${new Date().toLocaleDateString()}`,
            description: "A dynamically generated mock test for Group IV.",
            questionIds: allMockQuestionIds,
            examGroup: 'Group IV',
            isMockTest: true,
        };
        
        await setDoc(newTestRef, newMockTest);

        return { testId: newTestRef.id };

    } catch (e: any) {
        console.error("Error generating mock test:", e);
        return { error: e.message || "An unexpected error occurred on the server." };
    }
}
