import * as admin from 'firebase-admin';
import { execSync } from 'child_process';
import { FREE_CURRENT_AFFAIRS_TEST } from '../src/data/public-sample-questions';

const PROJECT_ID = 'tnpsc99-staging';
console.log(`[Safety Guard] Targeting Firestore in isolated staging project: ${PROJECT_ID}`);

if (admin.apps.length === 0) {
  const privateKey = execSync('gcloud secrets versions access latest --secret=FIREBASE_PRIVATE_KEY --project=tnpsc99-staging', { encoding: 'utf8' }).trim();
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: PROJECT_ID,
      clientEmail: 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com',
      privateKey: privateKey,
    })
  });
}

const db = admin.firestore();

async function seedStaging() {
  console.log('Seeding staging Firestore data...');

  // 1. Synthetic test users (zero PII)
  const now = Date.now();
  const future = new Date(now + 30 * 24 * 60 * 60 * 1000);
  const past = new Date(now - 10 * 24 * 60 * 60 * 1000);

  const users = [
    {
      uid: 'user_free_01',
      data: {
        email: 'free_student@tnpsc99-staging.internal',
        displayName: 'Staging Free Student',
        role: 'student',
        subscriptionStatus: 'inactive',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    },
    {
      uid: 'user_sub_01',
      data: {
        email: 'active_sub@tnpsc99-staging.internal',
        displayName: 'Staging Active Subscriber',
        role: 'student',
        subscriptionStatus: 'active',
        subscriptionExpires: admin.firestore.Timestamp.fromDate(future),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    },
    {
      uid: 'user_expired_01',
      data: {
        email: 'expired_sub@tnpsc99-staging.internal',
        displayName: 'Staging Expired Subscriber',
        role: 'student',
        subscriptionStatus: 'expired',
        subscriptionExpires: admin.firestore.Timestamp.fromDate(past),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    },
    {
      uid: 'user_admin_01',
      data: {
        email: 'admin@tnpsc99-staging.internal',
        displayName: 'Staging Admin',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }
    }
  ];

  for (const u of users) {
    await db.collection('users').doc(u.uid).set(u.data, { merge: true });
    console.log(`  ✓ Seeded user ${u.uid} (${u.data.email})`);
  }

  // 2. Published free Current Affairs questions (10 questions)
  const questionIds: string[] = [];
  for (const q of FREE_CURRENT_AFFAIRS_TEST.questions) {
    questionIds.push(q.id);
    await db.collection('currentAffairsQuestions').doc(q.id).set({
      id: q.id,
      accessLevel: 'free',
      isFree: true,
      isRetracted: false,
      status: 'PUBLISHED',
      category: q.category,
      category_ta: q.category_ta,
      examType: q.examGroup,
      difficulty: q.difficulty,
      question_en: q.question_en,
      options_en: q.options_en,
      explanation_en: q.explanation_en,
      question_ta: q.question_ta,
      options_ta: q.options_ta,
      explanation_ta: q.explanation_ta,
      correctOptionIndex: q.correctOptionIndex,
      publisher: q.sourceRef || 'Tamil Nadu DIPR Press Notification',
      sourceUrl: q.sourceUrl || 'https://www.tn.gov.in/pressrelease',
      publishedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`  ✓ Seeded published question ${q.id} in currentAffairsQuestions`);
  }

  // 3. Published daily manifest in ca_manifests
  const freeManifest = {
    id: 'manifest_daily_20261024',
    type: 'daily',
    periodEnd: '2026-10-24',
    title_en: 'Daily Current Affairs — 10 Free Practice MCQs',
    title_ta: 'தினசரி நடப்பு நிகழ்வுகள் — 10 இலவச பயிற்சி வினாக்கள்',
    subtitle_en: 'Verified Government Notifications · 24 October 2026 Edition',
    subtitle_ta: 'சரிபார்க்கப்பட்ட அரசு செய்திக்குறிப்புகள் · 24 அக்டோபர் 2026 பதிப்பு',
    accessLevel: 'free',
    isFree: true,
    isRetracted: false,
    status: 'published',
    questionIds: questionIds,
    itemCount: questionIds.length,
    durationMinutes: 10,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection('ca_manifests').doc('manifest_daily_20261024').set(freeManifest);
  console.log('  ✓ Seeded published daily manifest manifest_daily_20261024 in ca_manifests');

  // 4. Strict Quarantine: Store 24 REVIEW_REQUIRED and 8 REJECTED drafts in internal quarantined collection
  const quarantineRef = db.collection('ca_drafts_quarantine');
  for (let i = 1; i <= 24; i++) {
    const draftId = `draft_review_${String(i).padStart(2, '0')}`;
    await quarantineRef.doc(draftId).set({
      id: draftId,
      status: 'REVIEW_REQUIRED',
      accessLevel: 'internal',
      isFree: false,
      isRetracted: false,
      reason: 'Awaiting secondary official source corroboration',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log('  ✓ Stored 24 REVIEW_REQUIRED drafts in isolated ca_drafts_quarantine collection');

  for (let i = 1; i <= 8; i++) {
    const rejectedId = `draft_rejected_${String(i).padStart(2, '0')}`;
    await quarantineRef.doc(rejectedId).set({
      id: rejectedId,
      status: 'REJECTED',
      accessLevel: 'internal',
      isFree: false,
      isRetracted: false,
      reason: 'Discrepancy with primary gazette date or figures',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log('  ✓ Stored 8 REJECTED drafts in isolated ca_drafts_quarantine collection');

  console.log('\nStaging data seeding successfully completed!');
}

seedStaging().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
