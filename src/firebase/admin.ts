import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

if (!getApps().length) {
  const hasCredentials = 
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (hasCredentials) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // The optional chaining here is important in case the variable is present but empty.
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    } catch (e: any) {
      console.error("Firebase Admin SDK initialization failed:", e.message);
      // adminApp remains undefined
    }
  } else {
    // This is a normal case in development if admin features aren't set up.
    // The error will be surfaced when the action is called.
  }
} else {
  adminApp = getApps()[0];
}

// Export the firestore instance, which may be null if initialization failed.
export const adminDb = adminApp ? getFirestore() : null;
