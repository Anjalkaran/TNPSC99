
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

const renames = [
    { from: 'தவறான இணையைத் தேர்க', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'Assertion-Reason', to: 'கூற்று - காரணம்' }
];

async function fixCategoryNames() {
  console.log('Starting migration to fix category names...');

  const testsRef = firestore.collection('tests');
  const batch = firestore.batch();
  let updatedCount = 0;

  try {
    const allTestsSnapshot = await testsRef.get();
    console.log(`Found ${allTestsSnapshot.size} total tests to inspect.`);

    allTestsSnapshot.forEach(doc => {
      const test = doc.data() as Test;
      let needsUpdate = false;
      const updatePayload: { syllabusCategory?: string, title?: string } = {};

      renames.forEach(rename => {
        if (test.syllabusCategory === rename.from) {
          updatePayload.syllabusCategory = rename.to;
          if (test.title.includes(rename.from)) {
            updatePayload.title = test.title.replace(rename.from, rename.to);
          }
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        console.log(`- Updating test "${test.title}" (ID: ${doc.id})`);
        batch.update(doc.ref, updatePayload);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\nMigration successful! Updated ${updatedCount} test banks.`);
    } else {
      console.log('\nNo test banks found with the specified categories. No changes needed.');
    }

  } catch (error) {
    console.error('An error occurred during the category renaming migration:', error);
  }
}

fixCategoryNames();
