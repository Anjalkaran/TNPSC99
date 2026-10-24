const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'tnpsc99-staging';
const SA_EMAIL = 'staging-runner@tnpsc99-staging.iam.gserviceaccount.com';
const TMP_KEY_FILE = path.join(__dirname, 'tmp_sa_key.json');

console.log('1. Creating service account key for staging...');
try {
  if (fs.existsSync(TMP_KEY_FILE)) fs.unlinkSync(TMP_KEY_FILE);
  execSync(`gcloud iam service-accounts keys create "${TMP_KEY_FILE}" --iam-account=${SA_EMAIL} --project=${PROJECT_ID}`, { stdio: 'inherit' });
  
  const keyJson = JSON.parse(fs.readFileSync(TMP_KEY_FILE, 'utf8'));
  const privateKey = keyJson.private_key;
  fs.unlinkSync(TMP_KEY_FILE); // Remove temporary file immediately
  
  console.log('2. Creating or updating FIREBASE_PRIVATE_KEY secret in Secret Manager...');
  try {
    execSync(`gcloud secrets create FIREBASE_PRIVATE_KEY --data-file=- --project=${PROJECT_ID}`, {
      input: privateKey,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (e) {
    execSync(`gcloud secrets versions add FIREBASE_PRIVATE_KEY --data-file=- --project=${PROJECT_ID}`, {
      input: privateKey,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }

  console.log('3. Creating RAZORPAY_KEY_SECRET secret in Secret Manager (Test Mode)...');
  const rzpSecret = 'rzp_test_secret_tnpsc99_staging_only';
  try {
    execSync(`gcloud secrets create RAZORPAY_KEY_SECRET --data-file=- --project=${PROJECT_ID}`, {
      input: rzpSecret,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (e) {
    execSync(`gcloud secrets versions add RAZORPAY_KEY_SECRET --data-file=- --project=${PROJECT_ID}`, {
      input: rzpSecret,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }

  console.log('4. Creating GEMINI_API_KEY secret in Secret Manager...');
  const geminiSecret = 'staging_ai_inference_disabled';
  try {
    execSync(`gcloud secrets create GEMINI_API_KEY --data-file=- --project=${PROJECT_ID}`, {
      input: geminiSecret,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (e) {
    execSync(`gcloud secrets versions add GEMINI_API_KEY --data-file=- --project=${PROJECT_ID}`, {
      input: geminiSecret,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }

  console.log('5. Granting secret accessor permissions to App Hosting and Cloud Build service accounts...');
  const serviceAccounts = [
    'firebase-app-hosting-compute@tnpsc99-staging.iam.gserviceaccount.com',
    '162149048616-compute@developer.gserviceaccount.com',
    '162149048616@cloudbuild.gserviceaccount.com',
    'service-162149048616@gcp-sa-firebaseapphosting.iam.gserviceaccount.com'
  ];

  for (const sa of serviceAccounts) {
    try {
      execSync(`gcloud projects add-iam-policy-binding ${PROJECT_ID} --member="serviceAccount:${sa}" --role="roles/secretmanager.secretAccessor"`, { stdio: 'ignore' });
      console.log(`Granted secretAccessor to ${sa}`);
    } catch (err) {
      console.warn(`Could not grant directly to ${sa} (might not exist yet or managed): ${err.message}`);
    }
  }

  console.log('Secrets setup completed successfully!');
} catch (err) {
  console.error('Failed to setup staging secrets:', err);
  process.exit(1);
}
