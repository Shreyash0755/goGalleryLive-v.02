import FaceDetection from '@react-native-ml-kit/face-detection';
import {
  doc,
  updateDoc,
  getDoc,
} from '@react-native-firebase/firestore';
import { FirebaseFirestore, FirebaseAuth, Collections } from './firebase';

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

// DETECT FACES
export const detectFaces = async (photoUri: string): Promise<any[]> => {
  try {
    const uri = photoUri.startsWith('file://')
      ? photoUri
      : `file://${photoUri}`;

    console.log('=== ML KIT DETECTION ===');
    console.log('Input URI:', photoUri);
    console.log('Using URI:', uri);

    const faces = await FaceDetection.detect(uri, {
      landmarkMode: 'all',
      contourMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.05,
      performanceMode: 'accurate',
    } as any);

    console.log('ML Kit faces found:', faces.length);
    if (faces.length > 0) {
      console.log('First face keys:', Object.keys(faces[0]));
      console.log('First face landmarks keys:', Object.keys(faces[0].landmarks || {}));
      console.log('First face raw:', JSON.stringify(faces[0]));
    }
    return faces;

  } catch (error: any) {
    console.log('ML Kit error:', error.message);
    console.log('ML Kit full error:', JSON.stringify(error));
    return [];
  }
};

// EXTRACT LANDMARKS — handles both key formats
export const extractLandmarks = (face: any): FaceLandmarks => {
  const lm = face.landmarks || {};

  console.log('=== EXTRACTING LANDMARKS ===');
  console.log('All landmark keys:', Object.keys(lm));
  console.log('Raw landmarks:', JSON.stringify(lm));

  // Helper to extract point from different formats
  const getPoint = (landmark: any): { x: number; y: number } | null => {
    if (!landmark) return null;

    // Format 1: {position: {x, y}} — what library actually returns
    if (landmark.position) {
      console.log('Using position format:', landmark.position);
      return {
        x: landmark.position.x,
        y: landmark.position.y
      };
    }

    // Format 2: {x, y} — direct values
    if (landmark.x !== undefined && landmark.y !== undefined) {
      console.log('Using direct format:', landmark.x, landmark.y);
      return { x: landmark.x, y: landmark.y };
    }

    console.log('Unknown landmark format:', JSON.stringify(landmark));
    return null;
  };

  const result: FaceLandmarks = {
    leftEye: getPoint(lm.leftEye || lm.LEFT_EYE),
    rightEye: getPoint(lm.rightEye || lm.RIGHT_EYE),
    nose: getPoint(lm.noseBase || lm.NOSE_BASE),
    leftMouth: getPoint(lm.mouthLeft || lm.LEFT_MOUTH),
    rightMouth: getPoint(lm.mouthRight || lm.RIGHT_MOUTH),
    leftCheek: getPoint(lm.leftCheek || lm.LEFT_CHEEK),
    rightCheek: getPoint(lm.rightCheek || lm.RIGHT_CHEEK),
    bottomMouth: getPoint(lm.mouthBottom || lm.BOTTOM_MOUTH),
  };

  console.log('Extracted landmarks result:', JSON.stringify(result));
  const nonNullCount = Object.values(result).filter(v => v !== null).length;
  console.log('Non-null landmarks:', nonNullCount, '/ 8');

  return result;
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

  console.log('=== NORMALIZING ===');
  console.log('Face frame:', JSON.stringify(faceFrame));
  console.log('faceWidth:', faceWidth, 'faceHeight:', faceHeight);

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
      const normX = (point.x - faceX) / faceWidth;
      const normY = (point.y - faceY) / faceHeight;
      features.push(normX, normY);
    } else {
      features.push(-1, -1);
    }
  }

  console.log('Normalized features count:', features.length);
  console.log('Normalized features:', JSON.stringify(features));
  return features;
};

// CALCULATE SIMILARITY
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

  if (magnitude1 === 0 || magnitude2 === 0) {
    console.log('Zero magnitude detected!');
    console.log('features1 sample:', features1.slice(0, 5));
    console.log('features2 sample:', features2.slice(0, 5));
    return 0;
  }

  const similarity = dotProduct / (magnitude1 * magnitude2);
  return similarity;
};

// REGISTER FACE ANGLE
export const registerFaceAngle = async (
  photoUri: string,
  angleName: string
): Promise<{ success: boolean; message: string }> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  try {
    console.log(`=== REGISTER FACE: ${angleName} ===`);
    console.log('URI:', photoUri);
    console.log('User:', currentUser.uid);

    const faces = await detectFaces(photoUri);
    console.log('Faces found during registration:', faces.length);

    if (faces.length === 0) {
      return {
        success: false,
        message: 'No face detected. Make sure your face is clearly visible and well lit.',
      };
    }

    if (faces.length > 1) {
      return {
        success: false,
        message: 'Multiple faces detected. Please take a solo photo.',
      };
    }

    const face = faces[0];
    console.log('Processing face for registration...');

    const landmarks: FaceLandmarks = extractLandmarks(face);
    const normalizedFeatures: number[] = normalizeLandmarks(
      landmarks,
      face.frame
    );

    console.log('Features for storage:', normalizedFeatures.length);
    console.log('Non-zero features:', normalizedFeatures.filter(f => f !== -1).length);

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

    const filteredData: FaceAngleData[] = existingFaceData.filter(
      (f: FaceAngleData) => f.angle !== angleName
    );

    filteredData.push({ angle: angleName, landmarks });
    existingFeatures[angleName] = normalizedFeatures;

    const totalAngles: number = filteredData.length;
    const isComplete: boolean = totalAngles >= 5;

    await updateDoc(userRef, {
      faceData: filteredData,
      faceFeatures: existingFeatures,
      faceRegistered: isComplete,
      faceAnglesCount: totalAngles,
    });

    console.log(`✅ Registered ${angleName}`);
    console.log(`Total angles: ${totalAngles}/5`);
    console.log(`Registration complete: ${isComplete}`);

    return {
      success: true,
      message: isComplete
        ? 'Face registration complete!'
        : `${angleName} saved successfully`,
    };

  } catch (error: any) {
    console.log('Register face error:', error.message);
    return { success: false, message: error.message };
  }
};

// FIND USERS IN PHOTO
export const findUsersInPhoto = async (
  photoUri: string,
  groupId: string
): Promise<string[]> => {
  try {
    console.log('=== FIND USERS IN PHOTO ===');
    console.log('URI:', photoUri);
    console.log('Group:', groupId);

    const faces = await detectFaces(photoUri);
    console.log('Faces found in shared photo:', faces.length);

    if (faces.length === 0) {
      console.log('No faces detected — returning empty');
      return [];
    }

    const groupRef = doc(FirebaseFirestore, Collections.GROUPS, groupId);
    const groupDoc = await getDoc(groupRef);
    const groupData = groupDoc.data();

    if (!groupData?.members) {
      console.log('No members in group');
      return [];
    }

    const memberIds: string[] = Object.keys(groupData.members);
    console.log('Total members to check:', memberIds.length);
    const matchedUsers: string[] = [];

    for (const memberId of memberIds) {
      const userRef = doc(
        FirebaseFirestore,
        Collections.USERS,
        memberId
      );
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      console.log(`--- Checking member: ${memberId} ---`);
      console.log('faceRegistered:', userData?.faceRegistered);
      console.log('faceAnglesCount:', userData?.faceAnglesCount);

      if (!userData?.faceRegistered || !userData?.faceFeatures) {
        console.log('Skipping — no face registered');
        continue;
      }

      const storedFeatures: { [angle: string]: number[] } =
        userData.faceFeatures;

      const angleNames = Object.keys(storedFeatures);
      console.log('Stored angles:', angleNames);

      // Check first stored angle features
      const firstAngle = angleNames[0];
      if (firstAngle) {
        console.log(
          'First angle feature count:',
          storedFeatures[firstAngle]?.length
        );
        console.log(
          'First angle sample values:',
          storedFeatures[firstAngle]?.slice(0, 6)
        );
      }

      let userMatched = false;

      for (const detectedFace of faces) {
        if (userMatched) break;

        console.log('Extracting features from detected face...');
        const detectedFeatures: number[] = normalizeLandmarks(
          extractLandmarks(detectedFace),
          detectedFace.frame
        );

        console.log('Detected features count:', detectedFeatures.length);
        console.log('Detected sample values:', detectedFeatures.slice(0, 6));

        for (const angleName of angleNames) {
          const storedAngleFeatures: number[] = storedFeatures[angleName];
          const similarity: number = calculateSimilarity(
            detectedFeatures,
            storedAngleFeatures
          );

          console.log(
            `Similarity ${memberId} vs ${angleName}: ${similarity.toFixed(4)}`
          );

          if (similarity > 0.82) {
            console.log(`✅ MATCH: ${memberId} at ${angleName}`);
            userMatched = true;
            break;
          }
        }
      }

      if (userMatched) {
        matchedUsers.push(memberId);
        console.log(`Added ${memberId} to matches`);
      } else {
        console.log(`No match for ${memberId}`);
      }
    }

    console.log('=== FINAL MATCHED USERS ===');
    console.log(matchedUsers);
    return matchedUsers;

  } catch (error: any) {
    console.log('Find users error:', error.message);
    return [];
  }
};
