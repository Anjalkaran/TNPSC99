'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'ஐரோப்பியர்களின் வருகை' },
    { unitNumber: 2, unitName: 'வர்த்தகத்திலிருந்து பேரரசு வரை' },
    { unitNumber: 3, unitName: 'கிராம சமூகமும் வாழ்க்கை முறையும்' },
    { unitNumber: 4, unitName: 'மக்களின் புரட்சி' },
    { unitNumber: 5, unitName: 'இந்தியாவில் கல்வி வளர்ச்சி' },
    { unitNumber: 6, unitName: 'இந்தியாவில் தொழிலகங்களின் வளர்ச்சி' },
    { unitNumber: 7, unitName: 'ஆங்கிலேயர் ஆட்சியில் நகர்ப்புற மாற்றங்கள்' },
    { unitNumber: 8, unitName: 'காலங்கள்தோறும் இந்தியப் பெண்களின் நிலை' }
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'பாறை மற்றும் மண்' },
    { unitNumber: 2, unitName: 'வானிலை மற்றும் காலநிலை' },
    { unitNumber: 3, unitName: 'நீரியல் சுழற்சி' },
    { unitNumber: 4, unitName: 'இடம் பெயர்தல் மற்றும் நகரமயமாதல்' },
    { unitNumber: 5, unitName: 'இடர்கள்' },
    { unitNumber: 6, unitName: 'தொழிலகங்கள்' },
    { unitNumber: 7, unitName: 'கண்டங்களை ஆராய்தல் (ஆப்பிரிக்கா, ஆஸ்திரேலியா மற்றும் அண்டார்டிகா)' },
    { unitNumber: 8, unitName: 'புவிப்படங்களைக் கற்றறிதல்' }
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'மாநில அரசு எவ்வாறு செயல்படுகிறது' },
    { unitNumber: 2, unitName: 'குடிமக்களும் குடியுரிமையும்' },
    { unitNumber: 3, unitName: 'சமயச்சார்பின்மையைப் புரிந்துகொள்ளுதல்' },
    { unitNumber: 4, unitName: 'மனித உரிமைகளும் ஐக்கிய நாடுகள் சபையும்' },
    { unitNumber: 5, unitName: 'சாலை பாதுகாப்பு விதிகள் மற்றும் நெறிமுறைகள்' },
    { unitNumber: 6, unitName: 'பாதுகாப்பு மற்றும் வெளியுறவுக் கொள்கை' },
    { unitNumber: 7, unitName: 'நீதித்துறை' },
  ],
  'பொருளியல்': [
    { unitNumber: 1, unitName: 'பணம், சேமிப்பு மற்றும் முதலீடுகள்' },
    { unitNumber: 2, unitName: 'பொது மற்றும் தனியார் துறைகள்' },
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

async function addClass8SocialScienceUnits() {
  console.log('Adding Class 8 Social Science units...');
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
    'குடிமையியல்': 'Civics',
    'பொருளியல்': 'Economics',
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
          classId: '8',
          subjectId: socialScienceSubjectId,
          categoryId: categoryId,
          term: 'Full Book',
          bookType: 'samacheer',
          medium: 'tamil',
          unitNumber: unitInfo.unitNumber,
          unitName: unitInfo.unitName,
        };
        batch.set(newUnitRef, unitData);
        console.log(`- Queued Class 8 unit: ${unitInfo.unitName} under category ${categoryNameTa}`);
    }
  }


  try {
    await batch.commit();
    console.log(`Successfully added new units for Class 8 Social Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass8SocialScienceUnits();
