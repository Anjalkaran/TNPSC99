import * as admin from 'firebase-admin';
import { execSync } from 'child_process';
import * as fs from 'fs';

const privateKey = execSync('gcloud secrets versions access latest --secret=FIREBASE_PRIVATE_KEY --project=tnpsc99-staging', { encoding: 'utf8' }).trim();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'tnpsc99-staging',
      clientEmail: 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com',
      privateKey,
    })
  });
}

const db = admin.firestore();

async function runAudit() {
  console.log('=== GATE 1: STAGING CA QUESTION AUDIT ===');
  const snap = await db.collection('currentAffairsQuestions')
    .where('status', '==', 'PUBLISHED')
    .get();

  console.log(`Found ${snap.docs.length} published questions in tnpsc99-staging.\n`);
  
  const records = snap.docs.map(d => d.data());
  // Sort by id
  records.sort((a, b) => a.id.localeCompare(b.id));

  for (const q of records) {
    console.log(`------------------------------------------------------------------------`);
    console.log(`ID: ${q.id}`);
    console.log(`Access: ${q.accessLevel} | isFree: ${q.isFree} | isRetracted: ${q.isRetracted} | status: ${q.status}`);
    console.log(`Source Publisher: ${q.publisher}`);
    console.log(`Source URL: ${q.sourceUrl}`);
    console.log(`EN Question: ${q.question_en}`);
    console.log(`TA Question: ${q.question_ta}`);
    console.log(`EN Options: ${JSON.stringify(q.options_en)}`);
    console.log(`TA Options: ${JSON.stringify(q.options_ta)}`);
    console.log(`Correct Option Index: ${q.correctOptionIndex} (${q.options_en?.[q.correctOptionIndex]})`);
    console.log(`EN Explanation: ${q.explanation_en}`);
    console.log(`TA Explanation: ${q.explanation_ta}`);
  }
}

runAudit().catch(console.error);
