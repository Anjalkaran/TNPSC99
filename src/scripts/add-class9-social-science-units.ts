'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'மனிதப் பரிணாம வளர்ச்சியும் சமூகமும்: வரலாற்றுக்கு முந்தைய காலம்' },
    { unitNumber: 2, unitName: 'பண்டைய நாகரிகங்கள்' },
    { unitNumber: 3, unitName: 'தொடக்ககாலத் தமிழ்ச் சமூகமும் பண்பாடும்' },
    { unitNumber: 4, unitName: 'அறிவு மலர்ச்சியும், சமூக-அரசியல் மாற்றங்களும்' },
    { unitNumber: 5, unitName: 'செவ்வியல் உலகம்' },
    { unitNumber: 6, unitName: 'இடைக்காலம்' },
    { unitNumber: 7, unitName: 'இடைக்கால இந்தியாவில் அரசும் சமூகமும்' },
    { unitNumber: 8, unitName: 'நவீன யுகத்தின் தொடக்கம்' },
    { unitNumber: 9, unitName: 'புரட்சிகளின் காலம்' },
    { unitNumber: 10, unitName: 'தொழிற்புரட்சி' },
    { unitNumber: 11, unitName: 'ஆசிய ஆப்பிரிக்க நாடுகளில் காலனியாதிக்கம்' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'நிலக்கோளம் I – புவி அகச்செயல்பாடுகள்' },
    { unitNumber: 2, unitName: 'நிலக்கோளம் – II புவி புறச்செயல்பாடுகள்' },
    { unitNumber: 3, unitName: 'வளிமண்டலம்' },
    { unitNumber: 4, unitName: 'நீர்க்கோளம்' },
    { unitNumber: 5, unitName: 'உயிர்க்கோளம்' },
    { unitNumber: 6, unitName: 'மனிதனும் சுற்றுச் சூழலும்' },
    { unitNumber: 7, unitName: 'நிலவரைபடத் திறன்கள்' },
    { unitNumber: 8, unitName: 'பேரிடர் மேலாண்மை - பேரிடரை எதிர்கொள்ளுதல்' },
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

async function addClass9SocialScienceUnits() {
  console.log('Adding Class 9 Social Science units...');
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
    const newSubjectRef = doc(subjectsRef, 'social-science');
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
          classId: '9',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'Full Book',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued Class 9 unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 9 Social Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass9SocialScienceUnits();
