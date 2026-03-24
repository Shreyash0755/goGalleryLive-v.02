import { FirebaseFunctions, FirebaseFirestore, Collections, FirebaseAuth } from './firebase';
import { uploadPhotoToCloudinary } from './cloudinaryService';
import { doc, getDoc, updateDoc } from '@react-native-firebase/firestore';

export interface FaceAngleData {
  angle: string;
}

export const registerFaceAngle = async (
  photoUri: string,
  angleName: string
): Promise<{ success: boolean; message: string }> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  try {
    console.log(`=== REGISTER FACE via AWS: ${angleName} ===`);
    
    // Upload image to a public URL so our backend can process it.
    const photoUrl = await uploadPhotoToCloudinary(photoUri);
    console.log('Uploaded registration image to:', photoUrl);

    // Invoke Cloud Function
    const registerFace = FirebaseFunctions.httpsCallable('registerFace');
    const responseData = await registerFace({ photoUrl });
    const response = responseData.data as { success: boolean; message: string; faceId?: string };

    if (!response.success) {
      return response;
    }

    // Maintain face status tracking in Firestore for the UI
    const userRef = doc(FirebaseFirestore, Collections.USERS, currentUser.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    const existingFaceData: FaceAngleData[] = userData?.faceData || [];
    const filteredData = existingFaceData.filter(f => f.angle !== angleName);
    filteredData.push({ angle: angleName });
    
    const totalAngles = filteredData.length;
    const isComplete = true; // AWS only needs 1 good photo!

    await updateDoc(userRef, {
      faceData: filteredData,
      faceRegistered: isComplete,
      faceAnglesCount: totalAngles,
      // faceFeatures array is no longer needed but kept format identical to not break UI logic
    });

    return {
      success: true,
      message: isComplete
        ? 'Face registration complete!'
        : `${angleName} saved successfully`,
    };
  } catch (error: any) {
    console.error('Register face error:', error);
    return { success: false, message: error.message || 'Verification failed.' };
  }
};


export const findUsersInPhoto = async (
  photoUrl: string,
  groupId: string
): Promise<string[]> => {
  try {
    console.log('=== FIND USERS IN PHOTO via AWS ===');
    
    const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();

    if (!groupData?.members) {
      return [];
    }

    const memberUids = Object.keys(groupData.members);
    
    const matchImageFaces = FirebaseFunctions.httpsCallable('matchImageFaces');
    const result = await matchImageFaces({ photoUrl, memberUids });
    
    const matchedUsers: string[] = (result.data as any).matchedUsers || [];
    console.log('Matched users:', matchedUsers);
    return matchedUsers;
  } catch (error: any) {
    console.error('Find users error:', error);
    return [];
  }
};
