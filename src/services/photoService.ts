import { ref, push, onValue, get } from '@react-native-firebase/database';
import { FirebaseDatabase, FirebaseAuth, DBPaths } from './firebase';
import { uploadPhotoToCloudinary } from './cloudinaryService';

export interface Photo {
  id: string;
  url: string;
  uploadedBy: string;
  uploaderName: string;
  timestamp: number;
  groupId: string;
}

// UPLOAD AND SHARE PHOTO
export const uploadAndSharePhoto = async (
  photoPath: string,
  groupId: string,
  uploaderName: string
): Promise<void> => {
  const currentUser = FirebaseAuth.currentUser;
  if (!currentUser) throw new Error('Not logged in');

  console.log('=== UPLOAD START ===');
  console.log('Group ID:', groupId);

  const photoUrl = await uploadPhotoToCloudinary(photoPath);
  console.log('Cloudinary URL:', photoUrl);

  if (!photoUrl || !photoUrl.startsWith('https://')) {
    throw new Error('Invalid URL: ' + photoUrl);
  }

  const dbPath = `${DBPaths.PHOTOS}/${groupId}`;
  console.log('Saving to path:', dbPath);

  const photosRef = ref(FirebaseDatabase, dbPath);
  const result = await push(photosRef, {
    url: photoUrl,
    uploadedBy: currentUser.uid,
    uploaderName: uploaderName,
    timestamp: Date.now(),
    groupId: groupId,
  });

  console.log('Saved with key:', result.key);
  console.log('=== UPLOAD END ===');
};

// LISTEN FOR PHOTOS
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

      // Use val() to get all data at once
      const rawData = snapshot.val();
      console.log('Raw data keys:', Object.keys(rawData || {}));
      console.log('Total entries:', Object.keys(rawData || {}).length);

      const photos: Photo[] = [];

      // Convert object to array manually
      Object.entries(rawData).forEach(([key, value]: [string, any]) => {
        console.log('Processing key:', key, 'url:', value?.url);
        if (value && value.url) {
          photos.push({
            id: key,
            url: value.url,
            uploadedBy: value.uploadedBy || '',
            uploaderName: value.uploaderName || 'Unknown',
            timestamp: value.timestamp || 0,
            groupId: value.groupId || groupId,
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