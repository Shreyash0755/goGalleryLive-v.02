import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  deleteField,
} from '@react-native-firebase/firestore';
import { FirebaseFirestore, FirebaseAuth, Collections } from './firebase';

export interface GroupMember {
  uid: string;
  name: string;
  role: 'admin' | 'member';
  sharingEnabled: boolean;
  receiveAll: boolean;
  joinedAt: number;
}

export interface Group {
  groupId: string;
  name: string;
  inviteCode: string;
  qrData: string;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  sharingEnabled: boolean;
  members: { [userId: string]: GroupMember };
}

// Generate 6 character invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Ensure invite code is unique
const getUniqueInviteCode = async (): Promise<string> => {
  let code = generateInviteCode();
  let exists = true;

  while (exists) {
    console.log('Checking invite code uniqueness:', code);
    const codeRef = doc(FirebaseFirestore, Collections.INVITE_CODES, code);
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      exists = false;
    } else {
      code = generateInviteCode();
    }
  }
  console.log('Unique invite code found:', code);
  return code;
};

// CREATE GROUP
export const createGroup = async (groupName: string): Promise<Group> => {
  console.log('createGroup called with:', groupName);

  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');
  console.log('Current user uid:', currentUser.uid);

  // Get user profile
  console.log('Fetching user profile...');
  const userRef = doc(FirebaseFirestore, Collections.USERS, currentUser.uid);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  console.log('User data:', userData);

  // Generate unique invite code
  console.log('Generating invite code...');
  const inviteCode = await getUniqueInviteCode();

  // Create group reference with auto ID
  const groupRef = doc(collection(FirebaseFirestore, Collections.GROUPS));
  const groupId = groupRef.id;
  const qrData = `orca://join/${inviteCode}`;
  console.log('Group ID:', groupId);

  const groupData: Group = {
    groupId,
    name: groupName,
    inviteCode,
    qrData,
    createdBy: currentUser.uid,
    createdAt: Date.now(),
    isActive: true,
    sharingEnabled: true,
    members: {
      [currentUser.uid]: {
        uid: currentUser.uid,
        name: userData?.name || 'Unknown',
        role: 'admin',
        sharingEnabled: true,
        receiveAll: true,
        joinedAt: Date.now(),
      }
    }
  };

  // Save group
  console.log('Saving group to Firestore...');
  await setDoc(groupRef, groupData);
  console.log('Group saved!');

  // Save invite code
  console.log('Saving invite code...');
  await setDoc(
    doc(FirebaseFirestore, Collections.INVITE_CODES, inviteCode),
    {
      groupId,
      createdAt: Date.now(),
      isActive: true,
    }
  );
  console.log('Invite code saved!');

  return groupData;
};

// JOIN GROUP BY INVITE CODE
export const joinGroupByCode = async (inviteCode: string): Promise<Group> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  const cleanCode = inviteCode.trim().toUpperCase();
  console.log('Joining group with code:', cleanCode);

  // Find group from invite code
  const codeRef = doc(FirebaseFirestore, Collections.INVITE_CODES, cleanCode);
  const codeDoc = await getDoc(codeRef);

  if (!codeDoc.exists()) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  const codeData = codeDoc.data();
  if (!codeData?.isActive) {
    throw new Error('This invite code has been deactivated.');
  }

  // Get group
  const groupRef = doc(FirebaseFirestore, Collections.GROUPS, codeData.groupId);
  const groupDoc = await getDoc(groupRef);

  if (!groupDoc.exists()) {
    throw new Error('Group not found.');
  }

  const groupData = groupDoc.data() as Group;

  // Check already member
  if (groupData.members[currentUser.uid]) {
    throw new Error('You are already a member of this group.');
  }

  // Get user profile
  const userRef = doc(FirebaseFirestore, Collections.USERS, currentUser.uid);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();

  // Add member to group
  await updateDoc(groupRef, {
    [`members.${currentUser.uid}`]: {
      uid: currentUser.uid,
      name: userData?.name || 'Unknown',
      role: 'member',
      sharingEnabled: true,
      receiveAll: true,
      joinedAt: Date.now(),
    }
  });

  console.log('Joined group successfully!');
  return groupData;
};

// GET USER GROUPS
export const getUserGroups = async (): Promise<Group[]> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  console.log('Fetching groups for user:', currentUser.uid);

  const groupsRef = collection(FirebaseFirestore, Collections.GROUPS);
  const q = query(
    groupsRef,
    where(`members.${currentUser.uid}.uid`, '==', currentUser.uid)
  );

  const snapshot = await getDocs(q);
  console.log('Groups found:', snapshot.docs.length);
  return snapshot.docs.map((d: any) => d.data() as Group);

};

// TOGGLE SHARING
export const toggleSharing = async (
  groupId: string,
  enabled: boolean
): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
  await updateDoc(groupRef, {
    [`members.${currentUser.uid}.sharingEnabled`]: enabled
  });
};

// DELETE GROUP (Admin only)
export const deleteGroup = async (groupId: string): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) throw new Error('Group not found');

  const data = groupDoc.data() as Group;
  if (data.createdBy !== currentUser.uid && data.members[currentUser.uid]?.role !== 'admin') {
    throw new Error('Only the admin can delete the group');
  }

  await deleteDoc(groupRef);
};

// LEAVE GROUP (For member/admin)
export const leaveGroup = async (groupId: string): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
  
  await updateDoc(groupRef, {
    [`members.${currentUser.uid}`]: deleteField()
  });
};

// REMOVE MEMBER (Admin only)
export const removeMember = async (groupId: string, memberId: string): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) throw new Error('Group not found');

  const data = groupDoc.data() as Group;
  if (data.createdBy !== currentUser.uid && data.members[currentUser.uid]?.role !== 'admin') {
    throw new Error('Only the admin can remove members');
  }

  if (memberId === currentUser.uid) {
    throw new Error('You cannot remove yourself. Use Leave Group instead.');
  }

  await updateDoc(groupRef, {
    [`members.${memberId}`]: deleteField()
  });
};