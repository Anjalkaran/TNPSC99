'use server';

import { db as firestore } from '@/firebase/admin';

async function fixSocialScienceSubject() {
  console.log('Attempting to fix "Social Science" subject name...');
  const subjectsRef = firestore.collection('subjects');
  const batch = firestore.batch();

  // Find the document by its English name
  const q = subjectsRef.where('name', '==', 'Social Science');
  
  try {
    const querySnapshot = await q.get();
    
    if (querySnapshot.empty) {
      console.log('Could not find a subject with the name "Social Science". No changes made.');
      return;
    }

    let updated = false;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name_ta !== 'சமூக அறிவியல்') {
        console.log(`Found subject "${doc.id}" with incorrect or missing Tamil name. Updating...`);
        batch.update(doc.ref, { name_ta: 'சமூக அறிவியல்' });
        updated = true;
      }
    });

    if (updated) {
      await batch.commit();
      console.log('Successfully updated the "Social Science" subject with the correct Tamil name.');
    } else {
      console.log('The "Social Science" subject already has the correct Tamil name. No changes were needed.');
    }

  } catch (error) {
    console.error('Error fixing subject name:', error);
  }
}

fixSocialScienceSubject();
