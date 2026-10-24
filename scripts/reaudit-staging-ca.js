const admin = require('firebase-admin');
const { execSync } = require('child_process');

console.log('[1] Fetching staging key from secret manager...');
const privateKey = execSync('gcloud.cmd secrets versions access latest --secret=FIREBASE_PRIVATE_KEY --project=tnpsc99-staging', { encoding: 'utf8' }).trim();
console.log('[2] Initializing Firebase Admin for tnpsc99-staging...');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: 'tnpsc99-staging',
    clientEmail: 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com',
    privateKey,
  })
});

const db = admin.firestore();

async function run() {
  console.log('[3] Querying currentAffairsQuestions in staging...');
  const snap = await db.collection('currentAffairsQuestions').get();
  console.log(`Found ${snap.docs.length} questions in staging currentAffairsQuestions:`);
  
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`- ${d.id}: status=${d.status}, isFree=${d.isFree}, isRetracted=${d.isRetracted}, url=${d.sourceUrl}`);
  });

  console.log('\n[4] Querying ca_manifests in staging...');
  const manSnap = await db.collection('ca_manifests').get();
  manSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Manifest: ${d.id}, status=${d.status}, accessLevel=${d.accessLevel}, count=${d.questionIds?.length}, questions=${JSON.stringify(d.questionIds)}`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
