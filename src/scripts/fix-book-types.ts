
'use server';

import { initializeFirebase } from '@/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

async function fixBookTypes() {
  console.log('Starting to fix missing bookType in tests...');
  const { firestore } = initializeFirebase();
  const batch = writeBatch(firestore);
  let updatedCount = 0;

  try {
    const testsCollection = collection(firestore, 'tests');
    const testsSnapshot = await getDocs(testsCollection);

    console.log(`Found ${testsSnapshot.size} tests to check.`);

    testsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.bookType) {
        console.log(`Updating test with doc ID: ${doc.id}, adding bookType: 'samacheer'`);
        batch.update(doc.ref, { bookType: 'samacheer' });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      console.log(`Committing updates for ${updatedCount} tests...`);
      await batch.commit();
      console.log(`SUCCESS: Successfully updated ${updatedCount} tests with bookType 'samacheer'.`);
    } else {
      console.log('All tests already have a bookType. No migration needed.');
    }
  } catch (error) {
    console.error('Error fixing book types:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

// Immediately execute the function if the script is run directly
fixBookTypes();
