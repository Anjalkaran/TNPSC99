import 'dotenv/config';
import { db as firestore } from '../firebase/admin';
import type { Question } from '../lib/types';

async function fixTamilOptions() {
  console.log('Starting to fix Tamil MCQ options (Changing "யாரும் இல்லை" to "எதுவும் இல்லை")...');
  let batch = firestore.batch();
  let questionsToUpdate = 0;
  let operationsInCurrentBatch = 0;
  const BATCH_LIMIT = 400;

  try {
    const questionsRef = firestore.collection('questions');
    // We use "array-contains" to find documents where "யாரும் இல்லை" is one of the options.
    const questionsSnapshot = await questionsRef.where('answerOptions', 'array-contains', 'யாரும் இல்லை').get();
    
    console.log(`Found ${questionsSnapshot.size} questions with "யாரும் இல்லை" in options.`);

    for (const doc of questionsSnapshot.docs) {
      const question = doc.data() as Question;
      const updatePayload: { [key: string]: any } = {};
      let needsUpdate = false;

      // Update answerOptions array
      if (question.answerOptions && Array.isArray(question.answerOptions)) {
        const newOptions = question.answerOptions.map(option => 
          option === 'யாரும் இல்லை' ? 'எதுவும் இல்லை' : option
        );
        
        // Check if any change was actually made (should be true due to where clause)
        const hasChanged = JSON.stringify(newOptions) !== JSON.stringify(question.answerOptions);
        if (hasChanged) {
          updatePayload.answerOptions = newOptions;
          needsUpdate = true;
        }
      }

      // Also update correctAnswer if it matches the string
      if (question.correctAnswer === 'யாரும் இல்லை') {
        updatePayload.correctAnswer = 'எதுவும் இல்லை';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        batch.update(doc.ref, updatePayload);
        questionsToUpdate++;
        operationsInCurrentBatch++;
        
        if (operationsInCurrentBatch % 50 === 0) {
          console.log(`Prepared ${operationsInCurrentBatch} updates in current batch...`);
        }
      }
      
      // Commit once batch limit is reached
      if (operationsInCurrentBatch >= BATCH_LIMIT) {
        console.log(`Committing batch of ${operationsInCurrentBatch} updates...`);
        await batch.commit();
        batch = firestore.batch();
        operationsInCurrentBatch = 0;
      }
    }

    // Final commit for remaining updates
    if (operationsInCurrentBatch > 0) {
      console.log(`Committing final batch of ${operationsInCurrentBatch} updates...`);
      await batch.commit();
    }

    console.log(`\nMigration Summary:`);
    console.log(`- Total questions processed: ${questionsSnapshot.size}`);
    console.log(`- Total questions updated: ${questionsToUpdate}`);
    console.log('Update complete!');

  } catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  }
}

fixTamilOptions();
