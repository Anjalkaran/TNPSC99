
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Question } from '@/lib/types';

async function testAnswerMigration() {
  console.log('Starting TEST migration for answer format...');
  const batch = firestore.batch();
  let questionsToUpdate = 0;
  const BATCH_LIMIT = 1; // We only want to test one for now.

  try {
    const questionsRef = firestore.collection('questions');
    const questionsSnapshot = await questionsRef.limit(20).get(); // Check the first 20 questions

    if (questionsSnapshot.empty) {
        console.log('No questions found in the database to test.');
        return;
    }

    console.log(`Found ${questionsSnapshot.size} questions to check for migration suitability...`);

    for (const doc of questionsSnapshot.docs) {
      if (questionsToUpdate >= BATCH_LIMIT) {
        break; // Stop after finding one suitable question
      }
      
      const question = doc.data() as Question;
      
      // Check if migration is needed (has index but not the new field)
      if (question.correctAnswerIndex !== undefined && question.correctAnswer === undefined) {
        const answerOptions = question.answerOptions;
        const correctIndex = question.correctAnswerIndex;

        if (Array.isArray(answerOptions) && correctIndex >= 0 && correctIndex < answerOptions.length) {
          const correctAnswerText = answerOptions[correctIndex];
          console.log(`- Found suitable question. Migrating ID: ${doc.id}. Setting correct answer to: "${correctAnswerText}"`);
          
          // Add the new field. We won't delete the old one in the test.
          batch.update(doc.ref, { correctAnswer: correctAnswerText });
          questionsToUpdate++;
        } else {
          // This case is unlikely but good to have
          console.log(`- Skipping question ID: ${doc.id} due to invalid index or options.`);
        }
      }
    }

    if (questionsToUpdate > 0) {
      await batch.commit();
      console.log(`\nSuccessfully migrated ${questionsToUpdate} question(s) to the new answer format for this test.`);
    } else {
      console.log('\nCould not find a suitable question to migrate among the first 20 checked. They may already be in the new format.');
    }

  } catch (error) {
    console.error('An error occurred during the test migration:', error);
  }
}

testAnswerMigration();
