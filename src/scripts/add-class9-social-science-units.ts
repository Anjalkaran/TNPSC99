'use server';

import { db as firestore } from '@/firebase/admin';
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
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'அரசாங்க அமைப்புகள் மற்றும் மக்களாட்சி' },
    { unitNumber: 2, unitName: 'தேர்தல், அரசியல் கட்சிகள் மற்றும் அழுத்தக் குழுக்கள்' },
    { unitNumber: 3, unitName: 'மனித உரிமைகள்' },
    { unitNumber: 4, unitName: 'அரசாங்கங்களின் வகைகள்' },
    { unitNumber: 5, unitName: 'உள்ளாட்சி அமைப்புகள்' },
    { unitNumber: 6, unitName: 'சாலை பாதுகாப்பு' },
  ],
  'பொருளியல்': [
    { unitNumber: 1, unitName: 'மேம்பாட்டை அறிவோம்: தொலைநோக்கு, அளவீடு மற்றும் நிலைத் தன்மை' },
    { unitNumber: 2, unitName: 'இந்தியா மற்றும் தமிழ்நாட்டில் வேலைவாய்ப்பு' },
    { unitNumber: 3, unitName: 'பணம் மற்றும் கடன்' },
    { unitNumber: 4, unitName: 'தமிழகத்தில் வேளாண்மை' },
    { unitNumber: 5, unitName: 'இடம்பெயர்தல்' },
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

async function addClass9SocialScienceUnits() {
  console.log('Adding Class 9 Social Science units...');

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
    const newSubjectRef = subjectsRef.doc('social-science');
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
    'குடிமையியல்': 'Civics',
    'பொருளியல்': 'Economics',
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
