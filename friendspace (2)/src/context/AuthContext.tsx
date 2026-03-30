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
      const unsubscribeUser = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            // Fallback for admin email to ensure they always see the admin UI
            if (firebaseUser.email?.toLowerCase() === 'ideathonigirs@gmail.com') {
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
              department: firebaseUser.email?.toLowerCase() === 'ideathonigirs@gmail.com' ? 'Administration' : 'Pending Setup',
              year: 'N/A',
              role: firebaseUser.email?.toLowerCase() === 'ideathonigirs@gmail.com' ? 'admin' : 'new',
              approvalStatus: firebaseUser.email?.toLowerCase() === 'ideathonigirs@gmail.com' ? 'approved' : 'new',
              joinedAt: new Date(),
              lastSeen: new Date(),
              isOnline: true,
              profileImage: firebaseUser.photoURL || undefined
            };

            // Create the doc if it doesn't exist
            setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUser,
              joinedAt: serverTimestamp(),
              lastSeen: serverTimestamp()
            }).catch(err => handleFirestoreError(err, OperationType.WRITE, path));
            
            setUser(newUser);
          }
          setLoading(false);
          setIsAuthReady(true);
        },
        (error) => {
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
    try {
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      
      // The profile initialization is handled by the onSnapshot listener
      // in the useEffect above, which will detect if the user doc exists or not.
    } catch (error) {
      console.error('Error signing in with Google:', error);
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

