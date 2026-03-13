'use server';

import { db as firestore } from '@/firebase/admin';

export async function migrateQuestions() {
  console.log('Starting question migration...');
  const batch = firestore.batch();
  let updatedCount = 0;

  try {
    const questionsCollection = firestore.collection('questions');
    const questionsSnapshot = await questionsCollection.get();

    console.log(`Found ${questionsSnapshot.size} questions to check.`);

    questionsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Check if the 'id' field is missing or doesn't match the document ID
      if (!data.id || data.id !== doc.id) {
        console.log(`Updating question with doc ID: ${doc.id}`);
        batch.update(doc.ref, { id: doc.id });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updatedCount} questions with their document IDs.`);
    } else {
      console.log('All questions already have a correct ID field. No migration needed.');
    }
  } catch (error) {
    console.error('Error migrating questions:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

// Immediately execute the function if the script is run directly
migrateQuestions();
