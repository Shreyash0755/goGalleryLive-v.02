import { useEffect, useRef } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { uploadAndSharePhoto } from '../services/photoService';

const { PhotoDetectionModule } = NativeModules;

export const usePhotoSharing = (
  groupId: string,
  sharingEnabled: boolean,
  uploaderName: string
) => {
  const subscriptionRef = useRef<any>(null);
  const uploadQueueRef = useRef<string[]>([]);
  const isUploadingRef = useRef<boolean>(false);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Number(Platform.Version) >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo Access Permission',
            message: 'GoGalleryLive needs access to your photos.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'GoGalleryLive needs storage access.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.log('Permission error:', error);
      return false;
    }
  };

  const processQueue = async () => {
    if (isUploadingRef.current) return;
    if (uploadQueueRef.current.length === 0) return;

    isUploadingRef.current = true;
    console.log('Processing upload queue...');

    while (uploadQueueRef.current.length > 0) {
      const photoPath = uploadQueueRef.current.shift();
      if (!photoPath) continue;

      console.log(`Uploading: ${photoPath}`);
      console.log(`Queue remaining: ${uploadQueueRef.current.length}`);

      try {
        await uploadAndSharePhoto(photoPath, groupId, uploaderName);
        console.log('✅ Upload success');
      } catch (error: any) {
        console.log('❌ Upload failed:', error.message);
        try {
          console.log('Retrying in 3 seconds...');
          await new Promise(resolve => setTimeout(() => resolve(undefined), 3000));
          await uploadAndSharePhoto(photoPath, groupId, uploaderName);
          console.log('✅ Retry success');
        } catch (retryError: any) {
          console.log('❌ Retry failed:', retryError.message);
        }
      }

      // Delay between uploads
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));
    }

    isUploadingRef.current = false;
    console.log('Queue complete');
  };

  useEffect(() => {
    console.log('Sharing:', sharingEnabled, 'Group:', groupId);

    if (!sharingEnabled || !groupId) {
      subscriptionRef.current?.remove();
      if (PhotoDetectionModule) {
        PhotoDetectionModule.stopService();
      }
      return;
    }

    const startSharing = async () => {
      if (!PhotoDetectionModule) {
        Alert.alert('Error', 'Native module not found. Please rebuild app.');
        return;
      }

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow photo access to enable auto sharing.'
        );
        return;
      }

      console.log('Starting service...');
      PhotoDetectionModule.startService();
      console.log('Service started!');

      const emitter = new NativeEventEmitter(PhotoDetectionModule);
      subscriptionRef.current = emitter.addListener(
        'NewPhotoDetected',
        (photoPath: string) => {
          console.log('📸 New photo detected:', photoPath);
          uploadQueueRef.current.push(photoPath);
          processQueue();
        }
      );

      console.log('✅ Photo sharing active!');
    };

    startSharing();

    return () => {
      console.log('Stopping sharing...');
      subscriptionRef.current?.remove();
      if (PhotoDetectionModule) {
        PhotoDetectionModule.stopService();
      }
    };
  }, [sharingEnabled, groupId]);
};