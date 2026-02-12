'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import type { Unit, Category, Subject } from '@/lib/types';

const unitsData = {
  'வரலாறு': [
    { unitNumber: 1, unitName: 'புதிய சமயக் கருத்துக்களும் இயக்கங்களும்' },
    { unitNumber: 2, unitName: 'தமிழ்நாட்டில் கலையும் கட்டடக் கலையும்' },
    { unitNumber: 3, unitName: 'தமிழகத்தில் சமணம், பௌத்தம், ஆசீவகத் தத்துவங்கள்' },
  ],
  'புவியியல்': [
    { unitNumber: 1, unitName: 'கண்டங்களை ஆராய்தல் - வடஅமெரிக்கா மற்றும் தென்அமெரிக்கா' },
    { unitNumber: 2, unitName: 'நிலவரைபடத்தை கற்றறிதல்' },
    { unitNumber: 3, unitName: 'இயற்கை இடர்கள் - பேரிடர் மேலாண்மை நடவடிக்கைகளை புரிந்து கொள்ளல்' },
  ],
  'குடிமையியல்': [
    { unitNumber: 1, unitName: 'பெண்கள் மேம்பாடு' },
    { unitNumber: 2, unitName: 'சந்தை மற்றும் நுகர்வோர் பாதுகாப்பு' },
    { unitNumber: 3, unitName: 'சாலைப் பாதுகாப்பு' },
  ],
  'பொருளியல்': [
    { unitNumber: 1, unitName: 'வரியும் அதன் முக்கியத்துவமும்' },
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

async function addClass7SocialScienceTerm3Units() {
  console.log('Adding Class 7 Social Science Term 3 units...');
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
          classId: '7',
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
    console.log(`Successfully added new units for Class 7 Social Science Term 3.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addClass7SocialScienceTerm3Units();
