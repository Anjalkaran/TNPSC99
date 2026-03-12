'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import type { Question } from '@/lib/types';

// Let's target a specific test for this pilot migration.
// Test ID: 'class-6-social', Question ID: 'soc-06-01'
const QUESTION_IDS_TO_MIGRATE = ['soc-06-01'];

async function testAnswerMigration() {
  console.log('Starting TEST migration for answer format...');
  const { firestore } = initializeFirebaseServer();
  const batch = writeBatch(firestore);
  let questionsToUpdate = 0;

  try {
    const questionsRef = collection(firestore, 'questions');
    const q = query(questionsRef, where('__name__', 'in', QUESTION_IDS_TO_MIGRATE));
    const questionsSnapshot = await getDocs(q);

    if (questionsSnapshot.empty) {
        console.log(`No questions found with the specified IDs: ${QUESTION_IDS_TO_MIGRATE.join(', ')}`);
        return;
    }

    console.log(`Found ${questionsSnapshot.size} questions to migrate.`);

    for (const doc of questionsSnapshot.docs) {
      const question = doc.data() as Question;
      
      // Check if migration is needed (has index but not the new field)
      if (question.correctAnswerIndex !== undefined && question.correctAnswer === undefined) {
        const answerOptions = question.answerOptions;
        const correctIndex = question.correctAnswerIndex;

        if (Array.isArray(answerOptions) && correctIndex >= 0 && correctIndex < answerOptions.length) {
          const correctAnswerText = answerOptions[correctIndex];
          console.log(`- Migrating question ID: ${doc.id}. Correct answer is "${correctAnswerText}"`);
          
          // For the test, we add the new field but don't remove the old one.
          // This makes it non-destructive.
          batch.update(doc.ref, { correctAnswer: correctAnswerText });
          questionsToUpdate++;
        } else {
          console.warn(`- Skipping question ID: ${doc.id} due to invalid index or options.`);
        }
      } else {
        console.log(`- Skipping question ID: ${doc.id} as it seems to be already migrated or lacks an index.`);
      }
    }

    if (questionsToUpdate > 0) {
      await batch.commit();
      console.log(`\nSuccessfully migrated ${questionsToUpdate} questions to the new answer format for the test.`);
    } else {
      console.log('\nNo questions were migrated in this test run.');
    }

  } catch (error) {
    console.error('An error occurred during the test migration:', error);
  }
}

testAnswerMigration();
