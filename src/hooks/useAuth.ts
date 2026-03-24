import { useState, useEffect } from 'react';
import { FirebaseAuth, FirebaseFirestore, Collections } from '../services/firebase';
import { User } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    // This persists login session automatically
    const unsubscribe = FirebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await FirebaseFirestore
            .collection(Collections.USERS)
            .doc(firebaseUser.uid)
            .get();

          if (userDoc.exists()) {
            console.log('useAuth successfully fetched user profile:', userDoc.data()?.email);
            setUser(userDoc.data() as User);
          } else {
            console.log('useAuth could not find user profile in Firestore');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (e: any) {
        console.log('useAuth error:', e.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};