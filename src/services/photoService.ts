import { ref, push, onValue } from '@react-native-firebase/database';
import { FirebaseDatabase, FirebaseAuth, DBPaths } from './firebase';
import { uploadPhotoToCloudinary } from './cloudinaryService';
import { findUsersInPhoto } from './faceService';

export interface Photo {
  id: string;
  url: string;
  uploadedBy: string;
  uploaderName: string;
  timestamp: number;
  groupId: string;
  faces?: string[];
  faceProcessed?: boolean;
  faceCount?: number;
}

const getOptimizedUrl = (url: string): string => {
  return url.replace(
    '/image/upload/',
    '/image/upload/w_400,h_400,c_fill,q_70/'
  );
};

export const uploadAndSharePhoto = async (
  photoPath: string,
  groupId: string,
  uploaderName: string
): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  console.log('=== UPLOAD START ===');
  console.log('Group ID:', groupId);
  console.log('Photo path:', photoPath);

  // Step 1 — Upload to Cloudinary
  const photoUrl = await uploadPhotoToCloudinary(photoPath);

  if (!photoUrl || !photoUrl.startsWith('https://')) {
    throw new Error('Invalid URL: ' + photoUrl);
  }

  console.log('Cloudinary URL:', photoUrl);

  // Step 2 — Detect faces
  console.log('=== FACE DETECTION START ===');
  console.log('Photo path for detection:', photoPath);
  console.log('Full URI:', `file://${photoPath}`);

  let detectedUsers: string[] = [];

  try {
    detectedUsers = await findUsersInPhoto(
      `file://${photoPath}`,
      groupId
    );
    console.log('Detection complete');
    console.log('Detected users:', JSON.stringify(detectedUsers));
    console.log('Detected count:', detectedUsers.length);
  } catch (faceError: any) {
    console.log('Face detection failed:', faceError.message);
  }

  console.log('=== FACE DETECTION END ===');

  // Step 3 — Save to Firebase
  const dbPath = `${DBPaths.PHOTOS}/${groupId}`;
  const photosRef = ref(FirebaseDatabase, dbPath);

  const result = await push(photosRef, {
    url: photoUrl,
    uploadedBy: currentUser.uid,
    uploaderName: uploaderName,
    timestamp: Date.now(),
    groupId: groupId,
    faces: detectedUsers,
    faceProcessed: true,
    faceCount: detectedUsers.length,
  });

  console.log('✅ Saved with key:', result.key);
  console.log('Faces saved:', JSON.stringify(detectedUsers));
  console.log('=== UPLOAD END ===');
};

export const listenToGroupPhotos = (
  groupId: string,
  onPhotos: (photos: Photo[]) => void
): (() => void) => {
  const dbPath = `${DBPaths.PHOTOS}/${groupId}`;
  console.log('Listening to path:', dbPath);

  const photosRef = ref(FirebaseDatabase, dbPath);

  const unsubscribe = onValue(
    photosRef,
    (snapshot) => {
      console.log('Snapshot received, exists:', snapshot.exists());

      if (!snapshot.exists()) {
        console.log('No photos found');
        onPhotos([]);
        return;
      }

      const rawData = snapshot.val();
      console.log('Total entries:', Object.keys(rawData || {}).length);

      const photos: Photo[] = [];

      Object.entries(rawData).forEach(([key, value]: [string, any]) => {
        if (value && value.url) {
          photos.push({
            id: key,
            url: getOptimizedUrl(value.url),
            uploadedBy: value.uploadedBy || '',
            uploaderName: value.uploaderName || 'Unknown',
            timestamp: value.timestamp || 0,
            groupId: value.groupId || groupId,
            faces: value.faces || [],
            faceProcessed: value.faceProcessed || false,
            faceCount: value.faceCount || 0,
          });
        }
      });

      console.log('Photos processed:', photos.length);
      photos.sort((a, b) => b.timestamp - a.timestamp);
      onPhotos(photos);
    },
    (error) => {
      console.log('Listener error:', error);
      onPhotos([]);
    }
  );

  return unsubscribe;
};