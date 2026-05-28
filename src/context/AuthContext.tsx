import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthReady: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      setLoading(true);
      const path = `users/${firebaseUser.uid}`;
      
      // Safety timeout for loading state
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
        setIsAuthReady(true);
      }, 10000); // 10 seconds safety timeout

      const unsubscribeUser = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (docSnap) => {
          clearTimeout(loadingTimeout);
          const isAdminEmail = firebaseUser.email?.toLowerCase().trim() === 'ideathonigirs@gmail.com';
          
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            // Fallback for admin email to ensure they always see the admin UI
            if (isAdminEmail) {
              setUser({
                ...data,
                role: 'admin',
                approvalStatus: 'approved'
              });
            } else {
              setUser(data);
            }
          } else {
            // If user exists in Auth but not in Firestore yet, 
            // initialize a basic profile for them
            const newUser: User = {
              uid: firebaseUser.uid,
              fullName: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              department: isAdminEmail ? 'Administration' : 'Pending Setup',
              year: 'N/A',
              role: isAdminEmail ? 'admin' : 'new',
              approvalStatus: isAdminEmail ? 'approved' : 'new',
              joinedAt: new Date(),
              lastSeen: new Date(),
              isOnline: true,
              profileImage: firebaseUser.photoURL || null
            };

            // Create the doc if it doesn't exist
            console.log('User profile not found in Firestore, creating new profile for:', firebaseUser.uid);
            setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUser,
              joinedAt: serverTimestamp(),
              lastSeen: serverTimestamp()
            }).then(() => {
              console.log('Successfully created user profile in Firestore for:', firebaseUser.uid);
            }).catch(err => {
              console.error('CRITICAL: Error creating user profile in Firestore:', err);
              handleFirestoreError(err, OperationType.WRITE, path);
            });
            
            setUser(newUser);
          }
          setLoading(false);
          setIsAuthReady(true);
        },
        (error) => {
          console.error('Firestore onSnapshot error for user profile:', error);
          handleFirestoreError(error, OperationType.GET, path);
          setLoading(false);
          setIsAuthReady(true);
        }
      );
      return () => unsubscribeUser();
    }
  }, [firebaseUser]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid issues in some iframe environments
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      console.log('Starting Google Sign-In...');
      const result = await signInWithPopup(auth, provider);
      console.log('Google Sign-In successful:', result.user.email);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // In some iframe environments, popups might be blocked or fail
      if (error instanceof Error && (error as any).code === 'auth/popup-blocked') {
        alert('Please allow popups for this site to sign in with Google.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isAuthReady, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

