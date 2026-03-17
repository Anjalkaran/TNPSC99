'use server';

import { db as firestore } from '@/firebase/admin'; // Use the admin SDK
import type { Question } from '@/lib/types';

async function cleanAnswerOptions() {
  console.log('Starting to clean answer options and correct answers...');
  let batch = firestore.batch(); // Use admin firestore instance
  let questionsToUpdate = 0;
  let operationsInCurrentBatch = 0;
  const BATCH_LIMIT = 400; // Firestore limit is 500, using a safe number

  try {
    const questionsRef = firestore.collection('questions');
    const questionsSnapshot = await questionsRef.get(); // Use admin SDK get()
    console.log(`Found ${questionsSnapshot.size} total questions to inspect.`);

    for (const doc of questionsSnapshot.docs) {
      const question = doc.data() as Question;
      const updatePayload: { [key: string]: any } = {};
      let needsUpdate = false;

      // Clean answerOptions
      if (question.answerOptions && Array.isArray(question.answerOptions)) {
        const originalOptions = question.answerOptions;
        const cleanedOptions = originalOptions.map(option => 
          typeof option === 'string' ? option.replace(/\s*\([^)]*\)/g, '').trim() : option
        );
        const optionsChanged = originalOptions.some((original, index) => original !== cleanedOptions[index]);
        if (optionsChanged) {
          updatePayload.answerOptions = cleanedOptions;
          needsUpdate = true;
        }
      }

      // Clean correctAnswer
      if (question.correctAnswer && typeof question.correctAnswer === 'string') {
        const originalCorrectAnswer = question.correctAnswer;
        const cleanedCorrectAnswer = originalCorrectAnswer.replace(/\s*\([^)]*\)/g, '').trim();
        if (originalCorrectAnswer !== cleanedCorrectAnswer) {
          updatePayload.correctAnswer = cleanedCorrectAnswer;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        batch.update(doc.ref, updatePayload);
        questionsToUpdate++;
        operationsInCurrentBatch++;
      }
      
      // If the batch is full, commit it and start a new one
      if (operationsInCurrentBatch >= BATCH_LIMIT) {
        console.log(`Committing batch of ${operationsInCurrentBatch} updates...`);
        await batch.commit();
        batch = firestore.batch(); // Start a new batch
        operationsInCurrentBatch = 0;
        console.log('Batch committed. Starting new batch.');
      }
    }

    // Commit any remaining operations in the final batch
    if (operationsInCurrentBatch > 0) {
      console.log(`Committing final batch of ${operationsInCurrentBatch} updates...`);
      await batch.commit();
      console.log('Final batch committed.');
    }

    if (questionsToUpdate > 0) {
      console.log(`\nSuccessfully cleaned data for ${questionsToUpdate} questions.`);
      console.log('The bulk edit is complete.');
    } else {
      console.log('\nNo questions needed cleaning. All data is already in the correct format.');
    }

  } catch (error) {
    console.error('An error occurred during the cleaning process:', error);
    console.log('The operation failed. Please check the error message for more details.');
  }
}

cleanAnswerOptions();
