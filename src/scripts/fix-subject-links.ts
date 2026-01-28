'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, query, where } from 'firebase/firestore';

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
  let totalUpdated = 0;

  try {
    for (const collectionName of collectionsToUpdate) {
      console.log(`- - - Processing collection: '${collectionName}' - - -`);
      const collectionRef = collection(firestore, collectionName);
      const q = query(collectionRef, where('subjectId', '==', oldSubjectId));
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      let countInCollection = 0;

      snapshot.forEach((doc) => {
        batch.update(doc.ref, { subjectId: newSubjectId });
        countInCollection++;
      });
      
      if (countInCollection > 0) {
        console.log(`Found and staged ${countInCollection} documents for update in '${collectionName}'.`);
        await batch.commit();
        console.log(`Successfully committed changes for '${collectionName}'.`);
        totalUpdated += countInCollection;
      } else {
        console.log(`No documents with subjectId '${oldSubjectId}' found in '${collectionName}'.`);
      }
    }
    
    console.log(`- - - - - - - - - - - - - - - - -`);
    if (totalUpdated > 0) {
        console.log(`SUCCESS! A total of ${totalUpdated} documents have been migrated from subjectId '${oldSubjectId}' to '${newSubjectId}'.`);
        console.log('Your data has been fixed!');
    } else {
        console.log('Scan complete. No documents found to migrate. Your database seems to be up to date.');
    }
  } catch (error) {
    console.error('Error during subject link migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

// Immediately execute the function if the script is run directly
fixSubjectLinks();
