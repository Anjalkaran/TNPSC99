
'use server';

import { db as firestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Question } from '@/lib/types';

async function migrateAllAnswers() {
  console.log('Starting full migration of all questions to new answer format...');
  const questionsRef = firestore.collection('questions');
  const BATCH_LIMIT = 450;
  let totalUpdated = 0;

  try {
    const allQuestionsSnapshot = await questionsRef.get();
    if (allQuestionsSnapshot.empty) {
      console.log('No questions found in the database.');
      return;
    }

    console.log(`Found ${allQuestionsSnapshot.size} total questions to process.`);
    const batches = [];
    let currentBatch = firestore.batch();
    let operationsInCurrentBatch = 0;

    allQuestionsSnapshot.forEach((doc) => {
      const question = doc.data() as Question;
      
      // Check if migration is needed (has index but not the new field)
      if (question.correctAnswerIndex !== undefined && question.correctAnswer === undefined) {
        const answerOptions = question.answerOptions;
        const correctIndex = question.correctAnswerIndex;

        if (Array.isArray(answerOptions) && correctIndex >= 0 && correctIndex < answerOptions.length) {
          const correctAnswerText = answerOptions[correctIndex];
          
          currentBatch.update(doc.ref, {
            correctAnswer: correctAnswerText,
            correctAnswerIndex: FieldValue.delete(), // Remove the old field
          });
          
          operationsInCurrentBatch++;
          totalUpdated++;

          if (operationsInCurrentBatch >= BATCH_LIMIT) {
            batches.push(currentBatch);
            currentBatch = firestore.batch();
            operationsInCurrentBatch = 0;
          }
        }
      }
    });

    // Add the final batch if it has operations
    if (operationsInCurrentBatch > 0) {
      batches.push(currentBatch);
    }
    
    if (batches.length > 0) {
        console.log(`Prepared ${batches.length} batch(es) to update ${totalUpdated} questions.`);
        for (let i = 0; i < batches.length; i++) {
            console.log(`Committing batch ${i + 1} of ${batches.length}...`);
            await batches[i].commit();
        }
        console.log(`\nSuccessfully migrated ${totalUpdated} questions to the new answer format.`);
    } else {
        console.log('\nNo questions needed migration. All questions seem to be in the new format already.');
    }

  } catch (error) {
    console.error('An error occurred during the migration:', error);
  }
}

migrateAllAnswers();
