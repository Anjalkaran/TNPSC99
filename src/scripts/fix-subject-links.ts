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
    let totalStagedUpdates = 0;

    console.log(`Searching for documents with incorrect subjectId '${oldSubjectId}'...`);

    for (const collectionName of collectionsToUpdate) {
      console.log(`- - - Processing collection: '${collectionName}' - - -`);
      const collectionRef = collection(firestore, collectionName);
      const snapshot = await getDocs(collectionRef);
      let foundInCollection = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        if (data.subjectId === oldSubjectId) {
          batch.update(doc.ref, { subjectId: newSubjectId });
          foundInCollection++;
        }
      });
      
      if (foundInCollection > 0) {
        console.log(`Found and staged ${foundInCollection} documents for update in '${collectionName}'.`);
        totalStagedUpdates += foundInCollection;
      } else {
        console.log(`No documents with subjectId '${oldSubjectId}' found in '${collectionName}'.`);
      }
    }
    
    console.log(`- - - - - - - - - - - - - - - - -`);
    console.log(`Scan complete. A total of ${totalStagedUpdates} documents are staged for update.`);

    if (totalStagedUpdates > 0) {
      console.log('Attempting to commit all changes to the database...');
      await batch.commit();
      console.log(`SUCCESS! Successfully migrated ${totalStagedUpdates} documents from subjectId '${oldSubjectId}' to '${newSubjectId}'.`);
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
