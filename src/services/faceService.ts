import FaceDetection from '@react-native-ml-kit/face-detection';
import {
  doc,
  updateDoc,
  getDoc,
} from '@react-native-firebase/firestore';
import { FirebaseFirestore, FirebaseAuth, Collections } from './firebase';

// Types
export interface FaceLandmarks {
  leftEye: { x: number; y: number } | null;
  rightEye: { x: number; y: number } | null;
  nose: { x: number; y: number } | null;
  leftMouth: { x: number; y: number } | null;
  rightMouth: { x: number; y: number } | null;
  leftCheek: { x: number; y: number } | null;
  rightCheek: { x: number; y: number } | null;
  bottomMouth: { x: number; y: number } | null;
}

export interface FaceAngleData {
  angle: string;
  landmarks: FaceLandmarks;
}

export interface FaceDetectionOptions {
  landmarkMode?: number;
  contourMode?: number;
  classificationMode?: number;
  minFaceSize?: number;
  performanceMode?: number;
}

// DETECT FACES in a photo
export const detectFaces = async (photoUri: string): Promise<any[]> => {
  try {
    const uri = photoUri.startsWith('file://')
      ? photoUri
      : `file://${photoUri}`;

    console.log('Detecting faces, URI:', uri);

    const faces = await FaceDetection.detect(uri, {
      landmarkMode: 'all',
      contourMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.05,
      performanceMode: 'accurate',
    } as any);

    console.log('Faces detected:', faces.length);
    console.log('Raw result:', JSON.stringify(faces));
    return faces;

  } catch (error: any) {
    console.log('Face detection error:', error.message);
    return [];
  }
};
// EXTRACT LANDMARKS from detected face
export const extractLandmarks = (face: any): FaceLandmarks => {
  return {
    leftEye: face.landmarks?.LEFT_EYE
      ? { x: face.landmarks.LEFT_EYE.x, y: face.landmarks.LEFT_EYE.y }
      : null,
    rightEye: face.landmarks?.RIGHT_EYE
      ? { x: face.landmarks.RIGHT_EYE.x, y: face.landmarks.RIGHT_EYE.y }
      : null,
    nose: face.landmarks?.NOSE_BASE
      ? { x: face.landmarks.NOSE_BASE.x, y: face.landmarks.NOSE_BASE.y }
      : null,
    leftMouth: face.landmarks?.LEFT_MOUTH
      ? { x: face.landmarks.LEFT_MOUTH.x, y: face.landmarks.LEFT_MOUTH.y }
      : null,
    rightMouth: face.landmarks?.RIGHT_MOUTH
      ? { x: face.landmarks.RIGHT_MOUTH.x, y: face.landmarks.RIGHT_MOUTH.y }
      : null,
    leftCheek: face.landmarks?.LEFT_CHEEK
      ? { x: face.landmarks.LEFT_CHEEK.x, y: face.landmarks.LEFT_CHEEK.y }
      : null,
    rightCheek: face.landmarks?.RIGHT_CHEEK
      ? { x: face.landmarks.RIGHT_CHEEK.x, y: face.landmarks.RIGHT_CHEEK.y }
      : null,
    bottomMouth: face.landmarks?.BOTTOM_MOUTH
      ? { x: face.landmarks.BOTTOM_MOUTH.x, y: face.landmarks.BOTTOM_MOUTH.y }
      : null,
  };
};

// NORMALIZE LANDMARKS relative to face size
const normalizeLandmarks = (
  landmarks: FaceLandmarks,
  faceFrame: any
): number[] => {
  const features: number[] = [];
  const faceWidth: number = faceFrame?.width || 1;
  const faceHeight: number = faceFrame?.height || 1;
  const faceX: number = faceFrame?.left || 0;
  const faceY: number = faceFrame?.top || 0;

  const points: Array<{ x: number; y: number } | null> = [
    landmarks.leftEye,
    landmarks.rightEye,
    landmarks.nose,
    landmarks.leftMouth,
    landmarks.rightMouth,
    landmarks.leftCheek,
    landmarks.rightCheek,
    landmarks.bottomMouth,
  ];

  for (const point of points) {
    if (point) {
      features.push((point.x - faceX) / faceWidth);
      features.push((point.y - faceY) / faceHeight);
    } else {
      features.push(-1, -1);
    }
  }

  return features;
};

// CALCULATE SIMILARITY between two feature vectors
export const calculateSimilarity = (
  features1: number[],
  features2: number[]
): number => {
  if (features1.length === 0 || features2.length === 0) return 0;

  const minLength: number = Math.min(features1.length, features2.length);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < minLength; i++) {
    if (features1[i] === -1 || features2[i] === -1) continue;
    dotProduct += features1[i] * features2[i];
    magnitude1 += features1[i] * features1[i];
    magnitude2 += features2[i] * features2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
};

// REGISTER FACE for current user
export const registerFaceAngle = async (
  photoUri: string,
  angleName: string
): Promise<{ success: boolean; message: string }> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  try {
    console.log(`Registering ${angleName} angle for:`, currentUser.uid);

    const faces = await detectFaces(photoUri);

    if (faces.length === 0) {
      return {
        success: false,
        message: 'No face detected. Make sure your face is clearly visible.',
      };
    }

    if (faces.length > 1) {
      return {
        success: false,
        message: 'Multiple faces detected. Please take a solo photo.',
      };
    }

    const face = faces[0];
    const landmarks: FaceLandmarks = extractLandmarks(face);
    const normalizedFeatures: number[] = normalizeLandmarks(
      landmarks,
      face.frame
    );

    const userRef = doc(
      FirebaseFirestore,
      Collections.USERS,
      currentUser.uid
    );
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    const existingFaceData: FaceAngleData[] = userData?.faceData || [];
    const existingFeatures: { [key: string]: number[] } =
      userData?.faceFeatures || {};

    // Remove existing entry for this angle
    const filteredData: FaceAngleData[] = existingFaceData.filter(
      (f: FaceAngleData) => f.angle !== angleName
    );

    // Add new angle data
    filteredData.push({
      angle: angleName,
      landmarks: landmarks,
    });

    // Add normalized features
    existingFeatures[angleName] = normalizedFeatures;

    const totalAngles: number = filteredData.length;
    const isComplete: boolean = totalAngles >= 5;

    await updateDoc(userRef, {
      faceData: filteredData,
      faceFeatures: existingFeatures,
      faceRegistered: isComplete,
      faceAnglesCount: totalAngles,
    });

    console.log(`${angleName} saved. Total: ${totalAngles}/5`);

    return {
      success: true,
      message: isComplete
        ? 'Face registration complete!'
        : `${angleName} saved successfully`,
    };

  } catch (error: any) {
    console.log('Register face error:', error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

// FIND WHICH USERS appear in a photo
export const findUsersInPhoto = async (
  photoUri: string,
  groupId: string
): Promise<string[]> => {
  try {
    console.log('Finding users in photo...');

    const faces = await detectFaces(photoUri);

    if (faces.length === 0) {
      console.log('No faces in photo');
      return [];
    }

    console.log(`Found ${faces.length} faces in photo`);

    const groupRef = doc(
      FirebaseFirestore,
      Collections.GROUPS,
      groupId
    );
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();

    if (!groupData?.members) return [];

    const memberIds: string[] = Object.keys(groupData.members);
    const matchedUsers: string[] = [];

    for (const memberId of memberIds) {
      const userRef = doc(
        FirebaseFirestore,
        Collections.USERS,
        memberId
      );
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData?.faceRegistered || !userData?.faceFeatures) {
        continue;
      }

      const storedFeatures: { [angle: string]: number[] } =
        userData.faceFeatures;

      let userMatched = false;

      for (const detectedFace of faces) {
        if (userMatched) break;

        const detectedFeatures: number[] = normalizeLandmarks(
          extractLandmarks(detectedFace),
          detectedFace.frame
        );

        for (const angleName of Object.keys(storedFeatures)) {
          const storedAngleFeatures: number[] = storedFeatures[angleName];
          const similarity: number = calculateSimilarity(
            detectedFeatures,
            storedAngleFeatures
          );

          console.log(
            `${memberId} ${angleName} similarity: ${similarity.toFixed(3)}`
          );

          if (similarity > 0.82) {
            console.log(`✅ Match: ${memberId} at ${angleName}`);
            userMatched = true;
            break;
          }
        }
      }

      if (userMatched) {
        matchedUsers.push(memberId);
      }
    }

    console.log('Matched users:', matchedUsers);
    return matchedUsers;

  } catch (error: any) {
    console.log('Find users error:', error.message);
    return [];
  }
};