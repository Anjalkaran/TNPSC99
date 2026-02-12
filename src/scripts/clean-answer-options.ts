'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import type { Question } from '@/lib/types';

async function cleanAnswerOptions() {
  console.log('Starting to clean answer options...');
  const { firestore } = initializeFirebaseServer();
  const batch = writeBatch(firestore);
  let questionsToUpdate = 0;

  try {
    const questionsRef = collection(firestore, 'questions');
    const questionsSnapshot = await getDocs(questionsRef);
    console.log(`Found ${questionsSnapshot.size} total questions to inspect.`);

    questionsSnapshot.forEach((doc) => {
      const question = doc.data() as Question;
      const originalOptions = question.answerOptions;
      
      // The regex /\s*\([^)]*\)/g matches optional whitespace followed by text in parentheses.
      const cleanedOptions = originalOptions.map(option => option.replace(/\s*\([^)]*\)/g, '').trim());

      // Check if any option was actually changed to avoid unnecessary writes
      const hasChanged = originalOptions.some((original, index) => original !== cleanedOptions[index]);

      if (hasChanged) {
        console.log(`- Updating options for question ID: ${doc.id}`);
        batch.update(doc.ref, { answerOptions: cleanedOptions });
        questionsToUpdate++;
      }
    });

    if (questionsToUpdate > 0) {
      await batch.commit();
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
