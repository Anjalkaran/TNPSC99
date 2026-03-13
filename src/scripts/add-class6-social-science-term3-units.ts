'use server';

import { db as firestore } from '@/firebase/admin';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'பண்டைக்காலத் தமிழகத்தில் சமூகமும் பண்பாடும்: சங்க காலம்' },
    { unitNumber: 2, unitName: 'இந்தியா - மௌரியருக்குப் பின்னர்' },
    { unitNumber: 3, unitName: 'பேரரசுகளின் காலம்: குப்தர், வர்த்தனர்' },
    { unitNumber: 4, unitName: 'தென்னிந்திய அரசுகள்' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'ஆசியா மற்றும் ஐரோப்பா' },
    { unitNumber: 2, unitName: 'புவி மாதிரி' },
    { unitNumber: 3, unitName: 'பேரிடரைப் புரிந்து கொள்ளுதல்' },
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'மக்களாட்சி' },
    { unitNumber: 2, unitName: 'உள்ளாட்சி அமைப்பு - ஊரகமும் நகர்ப்புறமும்' },
    { unitNumber: 3, unitName: 'சாலை பாதுகாப்பு' },
  ]
};

async function getOrCreateCategory(subjectId: string, categoryName: string, categoryNameTa: string): Promise<string> {
    const categoriesRef = firestore.collection('categories');
    const categoryQuery = categoriesRef.where('subjectId', '==', subjectId).where('name_ta', '==', categoryNameTa);
    const snapshot = await categoryQuery.get();

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    } else {
        console.log(`Category '${categoryNameTa}' not found for subject ${subjectId}. Creating it...`);
        const newCategoryRef = categoriesRef.doc();
        const newCategory: Omit<Category, 'id'> & { id: string } = {
            id: newCategoryRef.id,
            name: categoryName,
            name_ta: categoryNameTa,
            subjectId: subjectId
        };
        await newCategoryRef.set(newCategory);
        console.log(`Created category '${categoryNameTa}' with ID: ${newCategoryRef.id}`);
        return newCategoryRef.id;
    }
}

async function addClass6SocialScienceTerm3Units() {
  console.log('Adding Class 6 Social Science Term 3 units...');

  const subjectsRef = firestore.collection('subjects');
  let socialScienceSubject: Subject | null = null;

  const queries = [
    subjectsRef.where('name', '==', 'Social Science'),
    subjectsRef.where('name_ta', '==', 'சமூக அறிவியல்'),
  ];
  
  for (const q of queries) {
      const snapshot = await q.get();
      if (!snapshot.empty) {
          socialScienceSubject = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Subject;
          console.log(`Found subject: "${socialScienceSubject.name}" (ID: ${socialScienceSubject.id})`);
          break;
      }
  }

  if (!socialScienceSubject) {
    console.log('"Social Science" subject not found. Creating it...');
    const newSubjectRef = subjectsRef.doc('social-science'); // Use a predictable ID
    socialScienceSubject = {
        id: newSubjectRef.id,
        name: 'Social Science',
        name_ta: 'சமூக அறிவியல்',
        description: 'Social Science',
        description_ta: 'சமூக அறிவியல்',
    };
    await newSubjectRef.set(socialScienceSubject);
    console.log(`Created subject "Social Science" with ID: ${newSubjectRef.id}`);
  }
  
  const socialScienceSubjectId = socialScienceSubject.id;

  const batch = firestore.batch();
  const unitsCollection = firestore.collection('units');

  const categoryMap = {
    'வரலாறு': 'History',
    'புவியியல்': 'Geography',
    'குடிமையியல்': 'Civics'
  };

  for (const [categoryNameTa, units] of Object.entries(unitsData)) {
    const categoryNameEn = categoryMap[categoryNameTa as keyof typeof categoryMap];
    if (!categoryNameEn) {
        console.error(`English mapping not found for category: ${categoryNameTa}. Skipping.`);
        continue;
    }
    const categoryId = await getOrCreateCategory(socialScienceSubjectId, categoryNameEn, categoryNameTa);

    for (const unitInfo of units) {
        const newUnitRef = unitsCollection.doc();
        const unitData: Omit<Unit, 'className' | 'subjectName' | 'categoryName'> = {
          id: newUnitRef.id,
          classId: '6',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'பருவம் 3',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued Term 3 unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }


  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 6 Social Science Term 3.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass6SocialScienceTerm3Units();
