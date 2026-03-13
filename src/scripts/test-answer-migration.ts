
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Question } from '@/lib/types';

// Let's target a specific test for this pilot migration.
// Test ID: 'class-6-social', Question ID: 'soc-06-01'
const QUESTION_IDS_TO_MIGRATE = ['soc-06-01'];

async function testAnswerMigration() {
  console.log('Starting TEST migration for answer format...');
  const batch = firestore.batch();
  let questionsToUpdate = 0;

  try {
    const questionsRef = firestore.collection('questions');
    
    // Admin SDK method to get multiple documents by ID
    const docRefs = QUESTION_IDS_TO_MIGRATE.map(id => questionsRef.doc(id));
    const questionsSnapshots = await firestore.getAll(...docRefs);

    if (questionsSnapshots.length === 0) {
        console.log(`No questions found with the specified IDs: ${QUESTION_IDS_TO_MIGRATE.join(', ')}`);
        return;
    }

    console.log(`Found ${questionsSnapshots.length} questions to check.`);

    for (const doc of questionsSnapshots) {
      if (!doc.exists) {
          console.warn(`- Document with ID ${doc.id} does not exist. Skipping.`);
          continue;
      }
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
