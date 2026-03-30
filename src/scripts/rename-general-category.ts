
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

async function renameGeneralCategory() {
  const oldCategoryName = 'General';
  const newCategoryName = 'நேரடி வினா';
  
  console.log(`Starting migration to rename category from "${oldCategoryName}" to "${newCategoryName}"...`);

  const testsRef = firestore.collection('tests');
  
  try {
    // 1. Find explicit "General" categories
    const explicitQuery = testsRef.where('syllabusCategory', '==', oldCategoryName);
    const explicitSnapshot = await explicitQuery.get();
    
    console.log(`Found ${explicitSnapshot.size} test banks with explicit "${oldCategoryName}" category.`);

    const batch = firestore.batch();
    let updatedCount = 0;

    explicitSnapshot.forEach(doc => {
      console.log(`- Updating test (ID: ${doc.id})`);
      batch.update(doc.ref, { 
        syllabusCategory: newCategoryName
      });
      updatedCount++;
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Batch commit successful for explicit category rename.`);
    }

    console.log(`\nMigration successful! Updated ${updatedCount} test banks.`);

  } catch (error) {
    console.error('An error occurred during the category renaming migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

renameGeneralCategory();
