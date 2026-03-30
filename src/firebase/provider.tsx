import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  pendingSessionConflict: boolean;
  isSessionLoading: boolean;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  pendingSessionConflict: boolean;
  isSessionLoading: boolean;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  pendingSessionConflict: boolean;
  isSessionLoading: boolean;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('fb_session_id');
      if (stored) return stored;
      const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('fb_session_id', newId);
      return newId;
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  });

  const [pendingSessionConflict, setPendingSessionConflict] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const claimedSessionRef = useRef(false);

  // Single device login restriction
  useEffect(() => {
    if (!userAuthState.user || !firestore || !auth) {
        setIsSessionLoading(false);
        return;
    }

    const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
    let unsubscribe: (() => void) | undefined;

    const startListening = () => {
      unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.currentSessionId && data.currentSessionId !== sessionId) {
            console.log(`[Session] Conflict detected! Current: ${sessionId}, New: ${data.currentSessionId}`);
            // Another session has started!
            signOut(auth).then(() => {
              window.location.href = '/login?reason=multi_device';
            });
          }
        }
      });
    };

    const claimSession = () => {
      console.log(`[Session] Claiming session: ${sessionId}`);
      setDoc(userDocRef, { currentSessionId: sessionId }, { merge: true }).then(() => {
        claimedSessionRef.current = true;
        startListening();
        setIsSessionLoading(false);
      }).catch(err => {
        console.warn("FirebaseProvider: Failed to claim session:", err);
        setIsSessionLoading(false);
      });
    };

    if (!claimedSessionRef.current) {
        setIsSessionLoading(true);
        // First check if another session exists
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // If there's an active session completely different from ours
            if (data.currentSessionId && data.currentSessionId !== sessionId && data.currentSessionId !== 'logged_out') {
                setPendingSessionConflict(true);
                setIsSessionLoading(false);
            } else {
                claimSession();
            }
          } else {
            claimSession();
          }
        }).catch(err => {
           console.warn("Failed to check session", err);
           claimSession();
        });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userAuthState.user, firestore, auth, sessionId]);

  const handleConfirmLogin = () => {
      setPendingSessionConflict(false);
      if (!userAuthState.user || !firestore || !auth) return;
      const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
      setDoc(userDocRef, { currentSessionId: sessionId }, { merge: true }).then(() => {
          // Setting the doc will trigger the other device's onSnapshot to log them out automatically
          claimedSessionRef.current = true;
           // Start listening manually since we missed the initial hook setup
           onSnapshot(userDocRef, (snapshot) => {
             if (snapshot.exists()) {
               const data = snapshot.data();
               if (data.currentSessionId && data.currentSessionId !== sessionId) {
                 signOut(auth).then(() => {
                   window.location.href = '/login?reason=multi_device';
                 });
               }
             }
           });
      });
  };

  const handleCancelLogin = () => {
      setPendingSessionConflict(false);
      if (auth) {
          signOut(auth).then(() => {
              window.location.href = '/login';
          });
      }
  };

  // Presence Heartbeat
  useEffect(() => {
    if (!userAuthState.user || !firestore) return;

    const userDocRef = doc(firestore, 'users', userAuthState.user.uid);
    
    // Immediate update on mount/login
    setDoc(userDocRef, { lastSeen: new Date().toISOString() }, { merge: true }).catch(err => {
        console.warn("FirebaseProvider: Failed to update initial presence:", err);
    });

    const updateHeartbeat = () => {
      setDoc(userDocRef, { lastSeen: new Date().toISOString() }, { merge: true }).catch(err => {
        console.warn("FirebaseProvider: Failed to update heartbeat:", err);
      });
    };

    // Set up heartbeat for online status
    // Runs immediately, then every 1 minute
    updateHeartbeat();
    const heartbeatInterval = setInterval(updateHeartbeat, 60 * 1000);

    return () => clearInterval(heartbeatInterval);
  }, [userAuthState.user, firestore]);

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth]); // Depends on the auth instance

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      pendingSessionConflict,
      isSessionLoading,
    };
  }, [firebaseApp, firestore, auth, userAuthState, pendingSessionConflict, isSessionLoading]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {pendingSessionConflict && (
        <AlertDialog open={pendingSessionConflict}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Account in Use</AlertDialogTitle>
              <AlertDialogDescription>
                You are currently logged in on another device or browser. To continue here, we will log you out of the other session. Would you like to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelLogin}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmLogin}>Yes, continue here</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    pendingSessionConflict: context.pendingSessionConflict,
    isSessionLoading: context.isSessionLoading,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const { user, isUserLoading, userError, pendingSessionConflict, isSessionLoading } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError, pendingSessionConflict, isSessionLoading };
};