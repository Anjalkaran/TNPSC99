'use server';

import { initializeFirebaseServer } from '@/firebase/server-init';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { Unit } from '@/lib/types';

const unitsToAdd = [
    { unitNumber: 3, unitName: 'ஒளியியல்' },
    { unitNumber: 4, unitName: 'வெப்பம்' },
    { unitNumber: 5, unitName: 'மின்னியல்' },
    { unitNumber: 6, unitName: 'ஒலியியல்' },
    { unitNumber: 7, unitName: 'காந்தவியல்' },
    { unitNumber: 8, unitName: 'அண்டம் மற்றும் விண்வெளி அறிவியல்' },
    { unitNumber: 9, unitName: 'நம்மைச் சுற்றியுள்ள பருப்பொருள்கள்' },
    { unitNumber: 10, unitName: 'நம்மைச்சுற்றி நிகழும் மாற்றங்கள்' },
    { unitNumber: 11, unitName: 'காற்று' },
    { unitNumber: 12, unitName: 'அணு அமைப்பு' },
    { unitNumber: 13, unitName: 'நீர்' },
    { unitNumber: 14, unitName: 'அமிலங்கள் மற்றும் காரங்கள்' },
    { unitNumber: 15, unitName: 'அன்றாட வாழ்வில் வேதியியல்' },
    { unitNumber: 16, unitName: 'நுண்ணுயிரிகள்' },
    { unitNumber: 17, unitName: 'தாவர உலகம்' },
    { unitNumber: 18, unitName: 'உயிரினங்களின் ஒருங்கமைவு' },
    { unitNumber: 19, unitName: 'விலங்குகளின் இயக்கம்' },
    { unitNumber: 20, unitName: 'வளரிளம் பருவமடைதல்' },
    { unitNumber: 21, unitName: 'பயிர்ப் பெருக்கம் மற்றும் மேலாண்மை' },
    { unitNumber: 22, unitName: 'தாவரங்கள் மற்றும் விலங்குகளைப் பாதுகாத்தல்' },
    { unitNumber: 23, unitName: 'லிப்ரே ஆபீஸ் கால்க்' },
];

async function addUnits() {
  console.log('Adding Class 8 Science units...');
  const { firestore } = initializeFirebaseServer();
  const batch = writeBatch(firestore);
  const unitsCollection = collection(firestore, 'units');

  unitsToAdd.forEach(unitInfo => {
    const newUnitRef = doc(unitsCollection);
    const unitData: Unit = {
      id: newUnitRef.id,
      classId: '8',
      subjectId: 'science',
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
    console.log(`Successfully added ${unitsToAdd.length} new units for Class 8 Science.`);
  } catch (error) {
    console.error('Error adding units:', error);
  }
}

addUnits();
