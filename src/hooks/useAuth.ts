import { useState, useEffect } from 'react';
import { FirebaseAuth, FirebaseFirestore, Collections } from '../services/firebase';
import { User } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDoc: () => void;

    // Listen for auth state changes
    // This persists login session automatically
    const unsubscribeAuth = FirebaseAuth.onAuthStateChanged((firebaseUser) => {
      try {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }

        if (firebaseUser) {
          unsubscribeDoc = FirebaseFirestore
            .collection(Collections.USERS)
            .doc(firebaseUser.uid)
            .onSnapshot(
              (userDoc: any) => {
                if (userDoc.exists()) {
                  console.log('useAuth successfully fetched user profile:', userDoc.data()?.email);
                  setUser(userDoc.data() as User);
                } else {
                  console.log('useAuth could not find user profile in Firestore (waiting for creation)');
                }
                setLoading(false);
              },
              (e: any) => {
                console.log('useAuth snapshot error:', e.message);
                setUser(null);
                setLoading(false);
              }
            );
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (e: any) {
        console.log('useAuth error:', e.message);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  return { user, loading };
};