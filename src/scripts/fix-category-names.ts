'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import type { Category } from '@/lib/types';

const categoryTranslations: { [key: string]: string } = {
  'History': 'வரலாறு',
  'Geography': 'புவியியல்',
  'Civics': 'குடிமையியல்',
  'Economics': 'பொருளியல்',
};

async function fixCategoryNames() {
  console.log('Starting to fix category names...');
  const { firestore } = initializeFirebaseServer();
  const batch = writeBatch(firestore);
  let categoriesToUpdate = 0;

  try {
    const categoriesRef = collection(firestore, 'categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    console.log(`Found ${categoriesSnapshot.size} total categories to inspect.`);

    categoriesSnapshot.forEach((doc) => {
      const category = doc.data() as Category;
      
      // Check if name_ta is missing and if we have a translation for the English name
      if (!category.name_ta && category.name in categoryTranslations) {
        const tamilName = categoryTranslations[category.name];
        console.log(`- Updating category "${category.name}" (ID: ${doc.id}) with Tamil name: ${tamilName}`);
        batch.update(doc.ref, { name_ta: tamilName });
        categoriesToUpdate++;
      }
    });

    if (categoriesToUpdate > 0) {
      await batch.commit();
      console.log(`\nSuccessfully updated ${categoriesToUpdate} categories with Tamil names.`);
    } else {
      console.log('\nNo categories needed updating. All seem to have Tamil names already.');
    }

  } catch (error) {
    console.error('An error occurred during the category name update process:', error);
  }
}

fixCategoryNames();
