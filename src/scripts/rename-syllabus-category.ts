
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

async function renameSyllabusCategory() {
  const oldCategoryName = 'தவறான இணை';
  const newCategoryName = 'தவறான இணையைக் கண்டறிக';
  
  console.log(`Starting migration to rename syllabus category from "${oldCategoryName}" to "${newCategoryName}"...`);

  const testsRef = firestore.collection('tests');
  const query = testsRef.where('syllabusCategory', '==', oldCategoryName);

  try {
    const querySnapshot = await query.get();
    
    if (querySnapshot.empty) {
      console.log(`No test banks found with the category "${oldCategoryName}". No changes needed.`);
      return;
    }

    console.log(`Found ${querySnapshot.size} test banks to update.`);
    const batch = firestore.batch();
    let updatedCount = 0;

    querySnapshot.forEach(doc => {
      const test = doc.data() as Test;
      const newTitle = test.title.replace(oldCategoryName, newCategoryName);
      
      console.log(`- Updating test "${test.title}" (ID: ${doc.id})`);
      batch.update(doc.ref, { 
        syllabusCategory: newCategoryName,
        title: newTitle 
      });
      updatedCount++;
    });

    await batch.commit();
    console.log(`\nMigration successful! Updated ${updatedCount} test banks.`);

  } catch (error) {
    console.error('An error occurred during the category renaming migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

renameSyllabusCategory();
