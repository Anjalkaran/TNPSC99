

'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

const CATEGORIES_TO_MERGE = [
    'கூற்று - காரணம்',
    'தவறான இணையைக் கண்டறிக',
    'பொருத்துக',
    'நேரடி வினா'
];

async function mergeDuplicateCategoryTests() {
  console.log(`Starting migration to merge tests for categories: ${CATEGORIES_TO_MERGE.join(', ')}`);

  for (const categoryToMerge of CATEGORIES_TO_MERGE) {
    console.log(`\n--- Processing category: "${categoryToMerge}" ---`);
    const testsRef = firestore.collection('tests');
    const query = testsRef.where('syllabusCategory', '==', categoryToMerge);

    try {
      const querySnapshot = await query.get();
      
      if (querySnapshot.empty) {
        console.log(`No test banks found with the category "${categoryToMerge}". Skipping.`);
        continue;
      }

      console.log(`Found ${querySnapshot.size} test banks with the category "${categoryToMerge}". Grouping them for merging...`);

      // Group tests by their syllabus path to ensure we only merge duplicates within the same topic
      const testsByGroup = new Map<string, Test[]>();

      querySnapshot.forEach(doc => {
        const test = { id: doc.id, ...doc.data() } as Test;
        const groupKey = [
          test.examGroup,
          test.syllabusPart,
          test.syllabusUnitName,
          test.syllabusTopic,
          test.medium
        ].join('|');
        
        if (!testsByGroup.has(groupKey)) {
          testsByGroup.set(groupKey, []);
        }
        testsByGroup.get(groupKey)!.push(test);
      });

      let totalMergedForCategory = 0;
      const batch = firestore.batch();
      let hasOperationsInBatch = false;

      for (const [groupKey, tests] of testsByGroup.entries()) {
        if (tests.length > 1) {
          console.log(`  Found ${tests.length} duplicates for group: ${groupKey}`);
          
          // Sort by number of questions descending to keep the largest one as primary
          const sortedTests = tests.sort((a, b) => b.questionIds.length - a.questionIds.length);
          
          const primaryTest = sortedTests[0];
          const duplicates = sortedTests.slice(1);

          console.log(`    - Primary test: ${primaryTest.id} (${primaryTest.questionIds.length} questions)`);

          const allQuestionIds = new Set(primaryTest.questionIds);
          duplicates.forEach(dup => {
            console.log(`    - Merging from duplicate: ${dup.id} (${dup.questionIds.length} questions)`);
            if (dup.questionIds && Array.isArray(dup.questionIds)) {
              dup.questionIds.forEach(id => allQuestionIds.add(id));
            }
          });

          const finalQuestionIds = Array.from(allQuestionIds);

          // Update the primary test document
          const primaryTestRef = testsRef.doc(primaryTest.id);
          batch.update(primaryTestRef, { questionIds: finalQuestionIds });
          console.log(`    - Updating primary test to have ${finalQuestionIds.length} questions.`);
          hasOperationsInBatch = true;

          // Delete the duplicate test documents
          duplicates.forEach(dup => {
            const dupTestRef = testsRef.doc(dup.id);
            batch.delete(dupTestRef);
            console.log(`    - Deleting duplicate test: ${dup.id}`);
            totalMergedForCategory++;
          });
        }
      }

      if (hasOperationsInBatch) {
        await batch.commit();
        console.log(`  Migration successful for category "${categoryToMerge}"! Merged and deleted ${totalMergedForCategory} duplicate test banks.`);
      } else {
        console.log(`  No duplicate categories found within the same syllabus topic for "${categoryToMerge}". No merging was necessary.`);
      }

    } catch (error) {
      console.error(`An error occurred during the category merging for "${categoryToMerge}":`, error);
    }
  }

  console.log("\n--- Migration process finished. ---");
}

mergeDuplicateCategoryTests();
