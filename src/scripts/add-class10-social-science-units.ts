'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'முதல் உலகப்போரின் வெடிப்பும் அதன் பின்விளைவுகளும்' },
    { unitNumber: 2, unitName: 'இரு உலகப்போர்களுக்கு இடையில் உலகம்' },
    { unitNumber: 3, unitName: 'இரண்டாம் உலகப்போர்' },
    { unitNumber: 4, unitName: 'இரண்டாம் உலகப்போருக்குப் பிந்தைய உலகம்' },
    { unitNumber: 5, unitName: '19ஆம் நூற்றாண்டில் சமூக, சமய சீர்திருத்த இயக்கங்கள்' },
    { unitNumber: 6, unitName: 'ஆங்கிலேய ஆட்சிக்கு எதிராக தமிழகத்தில் நிகழ்ந்த தொடக்ககால கிளர்ச்சிகள்' },
    { unitNumber: 7, unitName: 'காலனியத்துக்கு எதிரான இயக்கங்களும் தேசியத்தின் தோற்றமும்' },
    { unitNumber: 8, unitName: 'தேசியம்: காந்திய காலகட்டம்' },
    { unitNumber: 9, unitName: 'தமிழ்நாட்டில் விடுதலைப் போராட்டம்' },
    { unitNumber: 10, unitName: 'தமிழ்நாட்டில் சமூக மாற்றங்கள்' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'இந்தியா - அமைவிடம், நிலத்தோற்றம் மற்றும் வடிகாலமைப்பு' },
    { unitNumber: 2, unitName: 'இந்தியா - காலநிலை மற்றும் இயற்கைத் தாவரங்கள்' },
    { unitNumber: 3, unitName: 'இந்தியா - வேளாண்மை' },
    { unitNumber: 4, unitName: 'இந்தியா - வளங்கள் மற்றும் தொழிலகங்கள்' },
    { unitNumber: 5, unitName: 'இந்தியா - மக்கள் தொகை, போக்குவரத்து, தகவல் தொடர்பு மற்றும் வணிகம்' },
    { unitNumber: 6, unitName: 'தமிழ்நாடு - இயற்கைப் பிரிவுகள்' },
    { unitNumber: 7, unitName: 'தமிழ்நாடு - மானுடப் புவியியல்' },
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

async function addClass10SocialScienceUnits() {
  console.log('Adding Class 10 Social Science units...');
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
          classId: '10',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'Full Book',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued Class 10 unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }

  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 10 Social Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass10SocialScienceUnits();
