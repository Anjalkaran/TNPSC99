
'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

const CATEGORY_TO_MERGE = 'தவறான இணையைக் கண்டறிக';

async function mergeDuplicateCategoryTests() {
  console.log(`Starting migration to merge tests for category: "${CATEGORY_TO_MERGE}"`);

  const testsRef = firestore.collection('tests');
  const query = testsRef.where('syllabusCategory', '==', CATEGORY_TO_MERGE);

  try {
    const querySnapshot = await query.get();
    
    if (querySnapshot.empty) {
      console.log(`No test banks found with the category "${CATEGORY_TO_MERGE}". No changes needed.`);
      return;
    }

    console.log(`Found ${querySnapshot.size} test banks with the category "${CATEGORY_TO_MERGE}". Grouping them for merging...`);

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

    let totalMerged = 0;
    const batch = firestore.batch();

    for (const [groupKey, tests] of testsByGroup.entries()) {
      if (tests.length > 1) {
        console.log(`\nFound ${tests.length} duplicates for group: ${groupKey}`);
        
        // Sort by number of questions descending to keep the largest one as primary
        const sortedTests = tests.sort((a, b) => b.questionIds.length - a.questionIds.length);
        
        const primaryTest = sortedTests[0];
        const duplicates = sortedTests.slice(1);

        console.log(`  - Primary test: ${primaryTest.id} (${primaryTest.questionIds.length} questions)`);

        const allQuestionIds = new Set(primaryTest.questionIds);
        duplicates.forEach(dup => {
          console.log(`  - Merging from duplicate: ${dup.id} (${dup.questionIds.length} questions)`);
          dup.questionIds.forEach(id => allQuestionIds.add(id));
        });

        const finalQuestionIds = Array.from(allQuestionIds);

        // Update the primary test document
        const primaryTestRef = testsRef.doc(primaryTest.id);
        batch.update(primaryTestRef, { questionIds: finalQuestionIds });
        console.log(`  - Updating primary test to have ${finalQuestionIds.length} questions.`);

        // Delete the duplicate test documents
        duplicates.forEach(dup => {
          const dupTestRef = testsRef.doc(dup.id);
          batch.delete(dupTestRef);
          console.log(`  - Deleting duplicate test: ${dup.id}`);
          totalMerged++;
        });
      }
    }

    if (totalMerged > 0) {
      await batch.commit();
      console.log(`\nMigration successful! Merged and deleted ${totalMerged} duplicate test banks.`);
    } else {
      console.log('\nNo duplicate categories found within the same syllabus topic. No merging was necessary.');
    }

  } catch (error) {
    console.error('An error occurred during the category merging migration:', error);
  }
}

mergeDuplicateCategoryTests();
