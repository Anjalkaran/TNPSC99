'use server';

import { db as firestore } from '@/firebase/admin';
import type { Unit } from '@/lib/types';

const unitsToAdd = [
    { unitNumber: 1, unitName: 'அளவீடு' },
    { unitNumber: 2, unitName: 'இயக்கம்' },
    { unitNumber: 3, unitName: 'பாய்மங்கள்' },
    { unitNumber: 4, unitName: 'மின்னூட்டமும் மின்னோட்டமும்' },
    { unitNumber: 5, unitName: 'காந்தவியல் மற்றும் மின்காந்தவியல்' },
    { unitNumber: 6, unitName: 'ஒளி' },
    { unitNumber: 7, unitName: 'வெப்பம்' },
    { unitNumber: 8, unitName: 'ஒலி' },
    { unitNumber: 9, unitName: 'அண்டம்' },
    { unitNumber: 10, unitName: 'நம்மைச் சுற்றியுள்ள பருப்பொருள்கள்' },
    { unitNumber: 11, unitName: 'அணு அமைப்பு' },
    { unitNumber: 12, unitName: 'தனிமங்களின் வகைப்பாட்டு அட்டவணை' },
    { unitNumber: 13, unitName: 'வேதிப்பிணைப்பு' },
    { unitNumber: 14, unitName: 'அமிலங்கள், காரங்கள் மற்றும் உப்புகள்' },
    { unitNumber: 15, unitName: 'கார்பனும் அவற்றின் சேர்மங்களும்' },
    { unitNumber: 16, unitName: 'பயன்பாட்டு வேதியியல்' },
    { unitNumber: 17, unitName: 'விலங்குலகம்' },
    { unitNumber: 18, unitName: 'திசுக்களின் அமைப்பு' },
    { unitNumber: 19, unitName: 'தாவர உலகம் - தாவர செயலியல்' },
    { unitNumber: 20, unitName: 'விலங்குகளின் உறுப்பு மண்டலங்கள்' },
    { unitNumber: 21, unitName: 'ஊட்டச்சத்து மற்றும் ஆரோக்கியம்' },
    { unitNumber: 22, unitName: 'நுண்ணுயிரிகளின் உலகம்' },
    { unitNumber: 23, unitName: 'பொருளாதார உயிரியல்' },
    { unitNumber: 24, unitName: 'சூழ்நிலை அறிவியல்' },
    { unitNumber: 25, unitName: 'லிப்ரே ஆபீஸ் இம்ப்ரஸ்' },
];

async function addUnits() {
  console.log('Adding Class 9 Science units...');

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
      classId: '9',
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
    console.log(`Successfully added ${unitsToAdd.length} new units for Class 9 Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addUnits();
