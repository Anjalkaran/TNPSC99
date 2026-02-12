'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'வடஇந்தியாவில் வேதகாலப் பண்பாடும் தென்னிந்தியாவில் பெருங்கற்காலப் பண்பாடும்' },
    { unitNumber: 2, unitName: 'மாபெரும் சிந்தனையாளர்களும் புதிய நம்பிக்கைகளும்' },
    { unitNumber: 3, unitName: 'குடித்தலைமையில் இருந்து பேரரசு வரை' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'வளங்கள்' },
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'தேசியச் சின்னங்கள்' },
    { unitNumber: 2, unitName: 'இந்திய அரசியலமைப்புச் சட்டம்' },
  ],
  'பொருளியல்': [
    { unitNumber: 1, unitName: 'பொருளியல் - ஓர் அறிமுகம்' },
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

async function addClass6SocialScienceTerm2Units() {
  console.log('Adding Class 6 Social Science Term 2 units...');
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
    console.log('"Social Science" subject not found. Creating it...');
    const newSubjectRef = doc(subjectsRef, 'social-science'); // Use a predictable ID
    socialScienceSubject = {
        id: newSubjectRef.id,
        name: 'Social Science',
        name_ta: 'சமூக அறிவியல்',
        description: 'Social Science',
        description_ta: 'சமூக அறிவியல்',
    };
    await setDoc(newSubjectRef, socialScienceSubject);
    console.log(`Created subject "Social Science" with ID: ${newSubjectRef.id}`);
  }
  
  const socialScienceSubjectId = socialScienceSubject.id;

  const batch = writeBatch(firestore);
  const unitsCollection = collection(firestore, 'units');

  const categoryMap = {
    'வரலாறு': 'History',
    'புவியியல்': 'Geography',
    'குடிமையியல்': 'Civics',
    'பொருளியல்': 'Economics'
  };

  for (const [categoryNameTa, units] of Object.entries(unitsData)) {
    const categoryNameEn = categoryMap[categoryNameTa as keyof typeof categoryMap];
    if (!categoryNameEn) {
        console.error(`English mapping not found for category: ${categoryNameTa}. Skipping.`);
        continue;
    }
    const categoryId = await getOrCreateCategory(firestore, socialScienceSubjectId, categoryNameEn, categoryNameTa);

    for (const unitInfo of units) {
        const newUnitRef = doc(unitsCollection);
        const unitData: Omit<Unit, 'className' | 'subjectName' | 'categoryName'> = {
          id: newUnitRef.id,
          classId: '6',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'பருவம் 2',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued Term 2 unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }


  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 6 Social Science Term 2.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass6SocialScienceTerm2Units();
