'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, doc, getDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';

async function renameSocialScienceId() {
  console.log('Starting migration to rename "social-science" subject ID...');
  const { firestore } = initializeFirebaseServer();
  const batch = writeBatch(firestore);

  const oldSubjectId = 'social-science';
  const newSubjectId = 'சமூக அறிவியல்'; // Using the Tamil name as the new ID as requested.

  const oldSubjectRef = doc(firestore, 'subjects', oldSubjectId);
  const newSubjectRef = doc(firestore, 'subjects', newSubjectId);

  try {
    // 1. Get the old subject document
    const oldSubjectSnap = await getDoc(oldSubjectRef);
    if (!oldSubjectSnap.exists()) {
      console.log(`Subject with ID "${oldSubjectId}" not found. It might have been renamed already. Checking for new ID...`);
      const newSubjectSnap = await getDoc(newSubjectRef);
      if (newSubjectSnap.exists()) {
          console.log(`Subject with new ID "${newSubjectId}" already exists. Migration seems complete.`);
      } else {
          console.log(`Neither old nor new subject ID found. Aborting.`);
      }
      return;
    }
    const subjectData = oldSubjectSnap.data();

    // 2. Create the new subject document with the new ID
    const newSubjectData = {
        ...subjectData,
        id: newSubjectId, // update the id field within the document
        name: 'சமூக அறிவியல்', // Let's update the name as well to be consistent
    };
    batch.set(newSubjectRef, newSubjectData);
    console.log(`- Prepared to create new subject with ID: ${newSubjectId}`);

    // 3. Find and update all references in 'tests'
    const testsRef = collection(firestore, 'tests');
    const testsQuery = query(testsRef, where('subjectId', '==', oldSubjectId));
    const testsSnapshot = await getDocs(testsQuery);
    console.log(`- Found ${testsSnapshot.size} tests referencing the old subject ID.`);
    testsSnapshot.forEach(doc => {
      batch.update(doc.ref, { subjectId: newSubjectId });
    });

    // 4. Find and update all references in 'units'
    const unitsRef = collection(firestore, 'units');
    const unitsQuery = query(unitsRef, where('subjectId', '==', oldSubjectId));
    const unitsSnapshot = await getDocs(unitsQuery);
    console.log(`- Found ${unitsSnapshot.size} units referencing the old subject ID.`);
    unitsSnapshot.forEach(doc => {
      batch.update(doc.ref, { subjectId: newSubjectId });
    });

    // 5. Find and update all references in 'categories'
    const categoriesRef = collection(firestore, 'categories');
    const categoriesQuery = query(categoriesRef, where('subjectId', '==', oldSubjectId));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    console.log(`- Found ${categoriesSnapshot.size} categories referencing the old subject ID.`);
    categoriesSnapshot.forEach(doc => {
      batch.update(doc.ref, { subjectId: newSubjectId });
    });
    
    // 6. Delete the old subject document
    batch.delete(oldSubjectRef);
    console.log(`- Prepared to delete old subject with ID: ${oldSubjectId}`);

    // 7. Commit the batch
    await batch.commit();
    console.log('\nMigration successful!');
    console.log(`Subject ID changed from "${oldSubjectId}" to "${newSubjectId}" and all references have been updated.`);

  } catch (error) {
    console.error('An error occurred during the migration:', error);
    console.log('The migration failed. Please check the error message and your Firestore rules.');
  }
}

renameSocialScienceId();
