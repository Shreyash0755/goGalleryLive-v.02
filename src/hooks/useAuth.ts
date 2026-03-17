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
      if (firebaseUser) {
        // User is logged in — fetch their profile
        const userDoc = await FirebaseFirestore
          .collection(Collections.USERS)
          .doc(firebaseUser.uid)
          .get();

        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        // User is logged out
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};