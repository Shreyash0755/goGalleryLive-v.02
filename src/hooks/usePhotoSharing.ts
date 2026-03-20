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

interface QueueItem {
  path: string;
  timestamp: number;
}

export const usePhotoSharing = (
  groupId: string,
  sharingEnabled: boolean,
  uploaderName: string
): void => {
  const subscriptionRef = useRef<any>(null);
  const uploadQueueRef = useRef<QueueItem[]>([]);
  const isUploadingRef = useRef<boolean>(false);
  const groupIdRef = useRef<string>(groupId);
  const uploaderNameRef = useRef<string>(uploaderName);

  // Keep refs updated
  useEffect(() => {
    groupIdRef.current = groupId;
    uploaderNameRef.current = uploaderName;
  }, [groupId, uploaderName]);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'android') return false;

      if (Platform.Version >= 33) {
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

  const processQueue = async (): Promise<void> => {
    if (isUploadingRef.current) return;
    if (uploadQueueRef.current.length === 0) return;

    isUploadingRef.current = true;
    console.log('Processing queue...');

    while (uploadQueueRef.current.length > 0) {
      const item = uploadQueueRef.current.shift();
      if (!item) continue;

      const { path, timestamp } = item;
      const age = Date.now() - timestamp;

      console.log(`Photo age: ${age}ms`);
      console.log(`Path: ${path}`);

      // Skip photos older than 60 seconds
      if (age > 60000) {
        console.log('Skipping old photo');
        continue;
      }

      try {
        await uploadAndSharePhoto(
          path,
          groupIdRef.current,
          uploaderNameRef.current
        );
        console.log('✅ Upload success');
      } catch (error: any) {
        console.log('❌ Upload failed:', error.message);
        try {
          console.log('Retrying...');
          await new Promise<void>(resolve => setTimeout(resolve, 3000));
          await uploadAndSharePhoto(
            path,
            groupIdRef.current,
            uploaderNameRef.current
          );
          console.log('✅ Retry success');
        } catch (retryError: any) {
          console.log('❌ Retry failed:', retryError.message);
        }
      }

      await new Promise<void>(resolve => setTimeout(resolve, 1000));
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
      uploadQueueRef.current = [];
      isUploadingRef.current = false;
      return;
    }

    const startSharing = async (): Promise<void> => {
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
          uploadQueueRef.current.push({
            path: photoPath,
            timestamp: Date.now(),
          });
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