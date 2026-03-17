import { FirebaseAuth, FirebaseFirestore, Collections } from './firebase';

// User interface — matches your Firestore structure exactly
export interface User {
  uid: string;
  name: string;
  email: string;
  createdAt: number;
}

// REGISTER
export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<User> => {
  try {
    // Step 1 — Create auth account
    const userCredential = await FirebaseAuth.createUserWithEmailAndPassword(
      email,
      password
    );

    const uid = userCredential.user.uid;

    // Step 2 — Save user profile to Firestore
    const userData: User = {
      uid,
      name,
      email,
      createdAt: Date.now(),
    };

    await FirebaseFirestore
      .collection(Collections.USERS)
      .doc(uid)
      .set(userData);

    return userData;

  } catch (error: any) {
    throw new Error(getAuthError(error.code));
  }
};

// LOGIN
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    // Step 1 — Login with Firebase Auth
    const userCredential = await FirebaseAuth.signInWithEmailAndPassword(
      email,
      password
    );

    const uid = userCredential.user.uid;

    // Step 2 — Fetch user profile from Firestore
    const userDoc = await FirebaseFirestore
      .collection(Collections.USERS)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new Error('User profile not found');
    }

    return userDoc.data() as User;

  } catch (error: any) {
    throw new Error(getAuthError(error.code));
  }
};

// LOGOUT
export const logoutUser = async (): Promise<void> => {
  await FirebaseAuth.signOut();
};

// GET CURRENT USER
export const getCurrentUser = () => {
  return FirebaseAuth.currentUser;
};

// HUMAN READABLE ERROR MESSAGES
const getAuthError = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email is already registered';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later';
    default:
      return 'Something went wrong. Try again';
  }
};