'use server';

import { db as firestore } from '@/firebase/admin';
import type { Unit } from '@/lib/types';

const unitsToAdd = [
    { unitNumber: 1, unitName: 'இயக்க விதிகள்' },
    { unitNumber: 2, unitName: 'ஒளியியல்' },
    { unitNumber: 3, unitName: 'வெப்ப இயற்பியல்' },
    { unitNumber: 4, unitName: 'மின்னோட்டவியல்' },
    { unitNumber: 5, unitName: 'ஒலியியல்' },
    { unitNumber: 6, unitName: 'அணுக்கரு இயற்பியல்' },
    { unitNumber: 7, unitName: 'அணுக்களும் மூலக்கூறுகளும்' },
    { unitNumber: 8, unitName: 'தனிமங்களின் ஆவர்த்தன வகைப்பாடு' },
    { unitNumber: 9, unitName: 'கரைசல்கள்' },
    { unitNumber: 10, unitName: 'வேதிவினைகளின் வகைகள்' },
    { unitNumber: 11, unitName: 'கார்பனும் அதன் சேர்மங்களும்' },
    { unitNumber: 12, unitName: 'தாவர உள்ளமைப்பியல் மற்றும் தாவர செயலியல்' },
    { unitNumber: 13, unitName: 'உயிரினங்களின் அமைப்பு நிலைகள்' },
    { unitNumber: 14, unitName: 'தாவரங்களின் கடத்துதல் மற்றும் விலங்குகளின் சுற்றோட்டம்' },
    { unitNumber: 15, unitName: 'நரம்பு மண்டலம்' },
    { unitNumber: 16, unitName: 'தாவர மற்றும் விலங்கு ஹார்மோன்கள்' },
    { unitNumber: 17, unitName: 'தாவரங்கள் மற்றும் விலங்குகளில் இனப்பெருக்கம்' },
    { unitNumber: 18, unitName: 'மரபியல்' },
    { unitNumber: 19, unitName: 'உயிரின் தோற்றமும் பரிணாமமும்' },
    { unitNumber: 20, unitName: 'இனக்கலப்பு மற்றும் உயிரித்தொழில்நுட்பவியல்' },
    { unitNumber: 21, unitName: 'உடல் நலம் மற்றும் நோய்கள்' },
    { unitNumber: 22, unitName: 'சுற்றுச்சூழல் மேலாண்மை' },
    { unitNumber: 23, unitName: 'காட்சித் தொடர்பு' },
];

async function addUnits() {
  console.log('Adding Class 10 Science units...');

  const subjectsRef = firestore.collection('subjects');
  let scienceSubjectId: string | null = null;

  const queries = [
    subjectsRef.where('name', '==', 'Science'),
    subjectsRef.where('name', '==', 'அறிவியல்'),
    subjectsRef.where('name_ta', '==', 'அறிவியல்')
  ];

  for (const q of queries) {
      const snapshot = await q.get();
      if (!snapshot.empty) {
          scienceSubjectId = snapshot.docs[0].id;
          console.log(`Found subject with query. ID: ${scienceSubjectId}`);
          break;
      }
  }

  if (!scienceSubjectId) {
    console.error('Error: "Science" or "அறிவியல்" subject not found in the database. Please ensure the subject exists or run `npm run seed`.');
    return;
  }

  const batch = firestore.batch();
  const unitsCollection = firestore.collection('units');

  unitsToAdd.forEach(unitInfo => {
    const newUnitRef = unitsCollection.doc();
    const unitData: Omit<Unit, 'className' | 'subjectName' | 'categoryName'> = {
      id: newUnitRef.id,
      classId: '10',
      subjectId: scienceSubjectId,
      term: 'Full Book',
      bookType: 'samacheer',
      medium: 'tamil',
      unitNumber: unitInfo.unitNumber,
      unitName: unitInfo.unitName,
    };
    batch.set(newUnitRef, unitData);
  });

  try {
    await batch.commit();
    console.log(`Successfully added ${unitsToAdd.length} new units for Class 10 Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addUnits();
