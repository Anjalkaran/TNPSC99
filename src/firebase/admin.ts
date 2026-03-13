
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // When deployed to a Firebase or Google Cloud environment, the SDK will
    // automatically discover the service account credentials.
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase admin initialization error', e);
    // For local development, you might need to set GOOGLE_APPLICATION_CREDENTIALS
    // See: https://firebase.google.com/docs/admin/setup#initialize-sdk
    console.log('For local script execution, ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set.');
  }
}

export const db = admin.firestore();
export default admin;
