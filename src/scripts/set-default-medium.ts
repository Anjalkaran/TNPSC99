'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test, Unit } from '@/lib/types';

async function setDefaultMedium() {
  console.log('Starting migration to set default medium...');
  const batch = firestore.batch();
  let updatedUnits = 0;
  let updatedTests = 0;

  try {
    // Update Units
    console.log('Checking units...');
    const unitsCollection = firestore.collection('units');
    const unitsSnapshot = await unitsCollection.get();
    unitsSnapshot.forEach((docSnapshot) => {
      const unit = docSnapshot.data() as Unit;
      if (!unit.medium) {
        batch.update(docSnapshot.ref, { medium: 'tamil' });
        updatedUnits++;
      }
    });
    console.log(`Found ${updatedUnits} units to update.`);

    // Update Tests
    console.log('Checking tests...');
    const testsCollection = firestore.collection('tests');
    const testsSnapshot = await testsCollection.get();
    testsSnapshot.forEach((docSnapshot) => {
      const test = docSnapshot.data() as Test;
      if (!test.medium) {
        batch.update(docSnapshot.ref, { medium: 'tamil' });
        updatedTests++;
      }
    });
    console.log(`Found ${updatedTests} tests to update.`);


    if (updatedUnits > 0 || updatedTests > 0) {
      await batch.commit();
      console.log(`Successfully set default medium for ${updatedUnits} units and ${updatedTests} tests.`);
    } else {
      console.log('All units and tests already have a medium field. No migration needed.');
    }
  } catch (error) {
    console.error('Error during migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

// Immediately execute the function if the script is run directly
setDefaultMedium();
