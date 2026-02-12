'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'வரலாறு என்றால் என்ன?' },
    { unitNumber: 2, unitName: 'மனிதர்களின் பரிணாம வளர்ச்சி' },
    { unitNumber: 3, unitName: 'சிந்து வெளி நாகரிகம்' },
    { unitNumber: 4, unitName: 'தமிழ்நாட்டின் பண்டைய நகரங்கள்' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'பேரண்டம் மற்றும் சூரியக்குடும்பம்' },
    { unitNumber: 2, unitName: 'நிலப்பரப்பும் பெருங்கடல்களும்' },
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'பன்முகத் தன்மையினை அறிவோம்' },
    { unitNumber: 2, unitName: 'சமத்துவம் பெறுதல்' },
  ]
};

async function getOrCreateCategory(firestore: any, subjectId: string, categoryName: string, categoryNameTa: string): Promise<string> {
    const categoriesRef = collection(firestore, 'categories');
    const categoryQuery = query(categoriesRef, where('subjectId', '==', subjectId), where('name_ta', '==', categoryNameTa));
    const snapshot = await getDocs(categoryQuery);

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    } else {
        console.log(`Category '${categoryNameTa}' not found for subject ${subjectId}. Creating it...`);
        const newCategoryRef = doc(categoriesRef);
        const newCategory: Omit<Category, 'id'> & { id: string } = {
            id: newCategoryRef.id,
            name: categoryName,
            name_ta: categoryNameTa,
            subjectId: subjectId
        };
        await setDoc(newCategoryRef, newCategory);
        console.log(`Created category '${categoryNameTa}' with ID: ${newCategoryRef.id}`);
        return newCategoryRef.id;
    }
}


async function addClass6SocialScienceUnits() {
  console.log('Adding Class 6 Social Science Term 1 units...');
  const { firestore } = initializeFirebaseServer();

  const subjectsRef = collection(firestore, 'subjects');
  let socialScienceSubject: Subject | null = null;

  const queries = [
    query(subjectsRef, where('name', '==', 'Social Science')),
    query(subjectsRef, where('name_ta', '==', 'சமூக அறிவியல்')),
  ];
  
  for (const q of queries) {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
          socialScienceSubject = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Subject;
          console.log(`Found subject: "${socialScienceSubject.name}" (ID: ${socialScienceSubject.id})`);
          break;
      }
  }

  if (!socialScienceSubject) {
    console.error('Error: "Social Science" or "சமூக அறிவியல்" subject not found in the database. Please ensure the subject exists (e.g., by running `npm run seed`).');
    return;
  }
  
  const socialScienceSubjectId = socialScienceSubject.id;

  const batch = writeBatch(firestore);
  const unitsCollection = collection(firestore, 'units');

  const categoryMap = {
    'வரலாறு': 'History',
    'புவியியல்': 'Geography',
    'குடிமையியல்': 'Civics'
  };

  for (const [categoryNameTa, units] of Object.entries(unitsData)) {
    const categoryNameEn = categoryMap[categoryNameTa as keyof typeof categoryMap];
    const categoryId = await getOrCreateCategory(firestore, socialScienceSubjectId, categoryNameEn, categoryNameTa);

    for (const unitInfo of units) {
        const newUnitRef = doc(unitsCollection);
        const unitData: Omit<Unit, 'className' | 'subjectName' | 'categoryName'> = {
          id: newUnitRef.id,
          classId: '6',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'பருவம் 1',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }


  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 6 Social Science Term 1.`);
    console.log('Please delete the old "Uncategorized" units from the Topic Management page if necessary.');

  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass6SocialScienceUnits();
