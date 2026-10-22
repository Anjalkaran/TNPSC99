import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'studio-5029416251-928dd',
    });
  } else {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey || 
          clientEmail === 'your-firebase-admin-sdk-email' || 
          privateKey === 'your-firebase-private-key-with-newlines-as-\\n') {
         console.error('CRITICAL: Firebase Admin credentials are not set correctly in .env');
         console.log('Detected placeholder values for clientEmail or privateKey. Please update .env with real service account credentials.');
         throw new Error('Firebase Admin SDK: Credentials not configured. Please see .env file instructions.');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e: any) {
      console.error('Firebase admin initialization error', e);
      if (process.env.NODE_ENV === 'production') {
        try { admin.initializeApp(); } catch(err) { console.error('Fall-back init failed', err); }
      } else {
        console.log('Local development requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env');
        if (!admin.apps.length) {
          try {
            admin.initializeApp({
              projectId: process.env.FIREBASE_PROJECT_ID || 'studio-5029416251-928dd',
            });
          } catch (initErr) {
            console.warn('Fallback app init failed:', initErr);
          }
        }
      }
    }
  }
}

export const db = admin.apps.length ? admin.firestore() : (null as unknown as admin.firestore.Firestore);
export const adminAuth = admin.apps.length ? admin.auth() : (null as unknown as admin.auth.Auth);
export default admin;
