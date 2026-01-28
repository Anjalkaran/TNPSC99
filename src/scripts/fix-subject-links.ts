'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

/**
 * This script corrects orphaned subject links in the database.
 * It finds documents that point to an incorrect subject ID ('தமழ') and updates them
 * to point to the correct one ('tamil').
 */
async function fixSubjectLinks() {
  console.log('Starting subject link migration...');
  const { firestore } = initializeFirebase();
  
  // This is the incorrect subject ID that was likely created by mistake.
  const oldSubjectId = 'தமழ';
  
  // This is the correct ID for the "Tamil" subject as defined in the seed script.
  const newSubjectId = 'tamil'; 
  
  // These are the collections where a `subjectId` field might exist.
  const collectionsToUpdate = ['tests', 'questions', 'units', 'categories'];
  
  try {
    const batch = writeBatch(firestore);
    let updatedCount = 0;

    console.log(`Searching for documents with incorrect subjectId '${oldSubjectId}'...`);

    // Asynchronously process all collections
    const promises = collectionsToUpdate.map(async (collectionName) => {
      const collectionRef = collection(firestore, collectionName);
      const q = query(collectionRef, where('subjectId', '==', oldSubjectId));
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`Found ${snapshot.size} documents to update in '${collectionName}'.`);
        snapshot.forEach((doc) => {
          console.log(`  - Staging update for doc: ${collectionName}/${doc.id}`);
          batch.update(doc.ref, { subjectId: newSubjectId });
          updatedCount++;
        });
      } else {
        console.log(`No documents with subjectId '${oldSubjectId}' found in '${collectionName}'.`);
      }
    });

    // Wait for all queries to complete
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
