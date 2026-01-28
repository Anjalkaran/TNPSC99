'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, DocumentData } from 'firebase/firestore';

/**
 * This script corrects orphaned subject links in the database.
 * It finds documents that point to an incorrect subject ID ('தமழ') and updates them
 * to point to the correct one ('தமிழ்').
 */
async function fixSubjectLinks() {
  console.log('Starting subject link migration...');
  const { firestore } = initializeFirebase();
  
  const oldSubjectId = 'தமழ';
  const newSubjectId = 'தமிழ்';
  const collectionsToUpdate = ['tests', 'questions', 'units', 'categories'];
  
  try {
    const batch = writeBatch(firestore);
    let updatedCount = 0;

    console.log(`Searching for documents with incorrect subjectId '${oldSubjectId}'...`);

    // Asynchronously process all collections
    const promises = collectionsToUpdate.map(async (collectionName) => {
      const collectionRef = collection(firestore, collectionName);
      
      // Fetch all documents and filter client-side to be safe
      const snapshot = await getDocs(collectionRef);
      let foundInCollection = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        if (data.subjectId === oldSubjectId) {
          console.log(`  - Staging update for doc: ${collectionName}/${doc.id}`);
          batch.update(doc.ref, { subjectId: newSubjectId });
          updatedCount++;
          foundInCollection++;
        }
      });
      
      if (foundInCollection > 0) {
          console.log(`Found ${foundInCollection} documents to update in '${collectionName}'.`);
      } else {
          console.log(`No documents with subjectId '${oldSubjectId}' found in '${collectionName}'.`);
      }
    });

    // Wait for all scans to complete
    await Promise.all(promises);

    if (updatedCount > 0) {
      // Commit all staged writes at once
      await batch.commit();
      console.log(`Successfully migrated ${updatedCount} documents from subjectId '${oldSubjectId}' to '${newSubjectId}'.`);
      console.log('Your data has been fixed!');
    } else {
      console.log('No documents found to migrate. Your database seems to be up to date.');
    }
  } catch (error) {
    console.error('Error during subject link migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

// Immediately execute the function if the script is run directly
fixSubjectLinks();
