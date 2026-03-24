import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getDatabase } from '@react-native-firebase/database';
import { getFunctions } from '@react-native-firebase/functions';

const app = getApp();

export const FirebaseAuth = getAuth(app);
export const FirebaseFirestore = getFirestore(app);
export const FirebaseDatabase = getDatabase(app);
export const FirebaseFunctions = getFunctions(app);

export const Collections = {
  USERS: 'users',
  GROUPS: 'groups',
  INVITE_CODES: 'inviteCodes',
};

export const DBPaths = {
  PHOTOS: 'photos',
};