

'use server';

import { db as firestore } from '@/firebase/admin';
import type { Test } from '@/lib/types';

const renames = [
    { from: 'தவறான இணையைத் தேர்க', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'Assertion-Reason', to: 'கூற்று - காரணம்' },
    { from: 'assertion-reason', to: 'கூற்று - காரணம்' },
    { from: 'Find the Incorrect Pair', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'Find-Incorrect', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'matching', to: 'பொருத்துக' },
    { from: 'find-incorrect', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'Find the Incorrect', to: 'தவறான இணையைக் கண்டறிக' },
    { from: 'Matching', to: 'பொருத்துக' },
    { from: 'தமிழக அரசியல்', to: 'நேரடி வினா' },
    { from: 'நுகர்வோர் பாதுகாப்பு', to: 'நேரடி வினா' },
    { from: 'நிர்வாகம்', to: 'நேரடி வினா' },
    { from: 'மனித உரிமைகள்', to: 'நேரடி வினா' },
    { from: 'குழுக்கள்', to: 'நேரடி வினா' },
    { from: 'நடப்பு நிகழ்வுகள்', to: 'நேரடி வினா' },
    { from: 'வரலாறு', to: 'நேரடி வினா' },
    { from: 'சட்டம்', to: 'நேரடி வினா' },
    { from: 'நிர்வாகச் சீர்மை', to: 'நேரடி வினா' },
    { from: 'அடிப்படை', to: 'நேரடி வினா' },
    { from: 'சித்தாந்தம்', to: 'நேரடி வினா' },
    { from: 'பெண்கள் அதிகாரம்', to: 'நேரடி வினா' },
    { from: 'அதிகாரம்', to: 'நேரடி வினா' },
    { from: 'பகுப்பாய்வு வினா', to: 'நேரடி வினா' },
    { from: 'அழுத்தக் குழுக்கள்', to: 'நேரடி வினா' },
    { from: 'தகுதி', to: 'நேரடி வினா' },
    { from: 'தேர்தல் முறை', to: 'நேரடி வினா' },
    { from: 'வழக்கு ஆய்வு', to: 'நேரடி வினா' },
    { from: 'வகைப்பாடு', to: 'நேரடி வினா' },
    { from: 'நோக்கம்', to: 'நேரடி வினா' },
    { from: 'சலுகைகள்', to: 'நேரடி வினா' },
    { from: 'ஆட்சியியல் முறை', to: 'நேரடி வினா' },
    { from: 'நீதித்துறை', to: 'நேரடி வினா' },
    { from: 'தகவல் உரிமை', to: 'நேரடி வினா' },
    { from: 'தமிழக நிர்வாகம்', to: 'நேரடி வினா' },
    { from: 'சமீபத்திய மாற்றம்', to: 'நேரடி வினா' },
    { from: 'நடப்பு நிகழ்வுகள்/சட்டம்', to: 'நேரடி வினா' },
    { from: 'சமீபத்திய மாற்றங்கள்', to: 'நேரடி வினா' },
    { from: 'வரலாறு/அரசியலமைப்பு', to: 'நேரடி வினா' },
    { from: 'பொது அறிவு', to: 'நேரடி வினா' },
    { from: 'பகுாய்வு வினா', to: 'நேரடி வினா' },
    { from: 'வரலாறு/மாற்றம்', to: 'நேரடி வினா' },
    { from: 'நிர்வாக அறநெறி', to: 'நேரடி வினா' },
    { from: 'RTI திருத்தம்', to: 'நேரடி வினா' },
    { from: 'அமைப்பு', to: 'நேரடி வினா' },
    { from: 'நடவடிக்கைகள்', to: 'நேரடி வினா' },
    { from: 'சர்வதேச உறவுகள்', to: 'நேரடி வினா' },
    { from: 'பதவி நீக்கம்', to: 'நேரடி வினா' },
    { from: 'RTI', to: 'நேரடி வினா' },
    { from: 'முக்கியத் தேதிகள்', to: 'நேரடி வினா' },
    { from: 'காலக்கெடு', to: 'நேரடி வினா' },
    { from: 'மாநில நிர்வாகம்', to: 'நேரடி வினா' },
    { from: 'அதிகார வரம்பு', to: 'நேரடி வினா' },
    { from: 'நியமனம்', to: 'நேரடி வினா' },
    { from: 'நீதிமுறை', to: 'நேரடி வினா' },
    { from: 'நியமனம்/நீக்கம்', to: 'நேரடி வினா' }
];

async function fixCategoryNames() {
  console.log('Starting migration to fix category names...');

  const testsRef = firestore.collection('tests');
  const batch = firestore.batch();
  let updatedCount = 0;

  try {
    const allTestsSnapshot = await testsRef.get();
    console.log(`Found ${allTestsSnapshot.size} total tests to inspect.`);

    allTestsSnapshot.forEach(doc => {
      const test = doc.data() as Test;
      let needsUpdate = false;
      const updatePayload: { syllabusCategory?: string, title?: string } = {};

      renames.forEach(rename => {
        if (test.syllabusCategory === rename.from) {
          updatePayload.syllabusCategory = rename.to;
          if (test.title.includes(rename.from)) {
            updatePayload.title = test.title.replace(rename.from, rename.to);
          }
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        console.log(`- Updating test "${test.title}" (ID: ${doc.id})`);
        batch.update(doc.ref, updatePayload);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\nMigration successful! Updated ${updatedCount} test banks.`);
    } else {
      console.log('\nNo test banks found with the specified categories. No changes needed.');
    }

  } catch (error) {
    console.error('An error occurred during the category renaming migration:', error);
  }
}

fixCategoryNames();
