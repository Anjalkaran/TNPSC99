'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import type { Question } from '@/lib/types';

async function cleanAnswerOptions() {
  console.log('Starting to clean answer options...');
  const { firestore } = initializeFirebaseServer();
  let batch = writeBatch(firestore);
  let questionsToUpdate = 0;
  let operationsInCurrentBatch = 0;
  const BATCH_LIMIT = 400; // Firestore limit is 500, using a safe number

  try {
    const questionsRef = collection(firestore, 'questions');
    const questionsSnapshot = await getDocs(questionsRef);
    console.log(`Found ${questionsSnapshot.size} total questions to inspect.`);

    for (const doc of questionsSnapshot.docs) {
      const question = doc.data() as Question;
      const originalOptions = question.answerOptions;
      
      const cleanedOptions = originalOptions.map(option => option.replace(/\s*\([^)]*\)/g, '').trim());

      const hasChanged = originalOptions.some((original, index) => original !== cleanedOptions[index]);

      if (hasChanged) {
        // console.log(`- Queuing update for question ID: ${doc.id}`); // Logging every line can be slow
        batch.update(doc.ref, { answerOptions: cleanedOptions });
        questionsToUpdate++;
        operationsInCurrentBatch++;
      }
      
      // If the batch is full, commit it and start a new one
      if (operationsInCurrentBatch >= BATCH_LIMIT) {
        console.log(`Committing batch of ${operationsInCurrentBatch} updates...`);
        await batch.commit();
        batch = writeBatch(firestore);
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
      console.log(`\nSuccessfully cleaned and updated answer options for ${questionsToUpdate} questions.`);
      console.log('The bulk edit is complete.');
    } else {
      console.log('\nNo answer options needed cleaning. All data is already in the correct format.');
    }

  } catch (error) {
    console.error('An error occurred during the cleaning process:', error);
    console.log('The operation failed. Please check the error message and your Firestore security rules.');
  }
}

cleanAnswerOptions();
