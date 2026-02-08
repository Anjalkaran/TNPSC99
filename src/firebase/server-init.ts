import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// A server-side only initialization function for build scripts
export function initializeFirebaseServer() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return {
      firestore: getFirestore(firebaseApp),
    };
  } else {
    const firebaseApp = getApp();
    return {
      firestore: getFirestore(firebaseApp),
    };
  }
}
