import BackgroundJob from 'react-native-background-actions';
import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid, Alert } from 'react-native';
import { uploadAndSharePhoto } from './photoService';

const { PhotoDetectionModule } = NativeModules;

const sleep = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

interface QueueItem {
  path: string;
  timestamp: number;
}

class BackgroundSharingService {
  private queue: QueueItem[] = [];
  private isUploading = false;
  private groupId = '';
  private uploaderName = '';
  private subscription: any = null;

  private async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return false;

      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.log('Permission error:', error);
      return false;
    }
  }

  private processQueue = async (): Promise<void> => {
    if (this.isUploading) return;
    if (this.queue.length === 0) return;

    this.isUploading = true;
    console.log('Processing background photo queue...');

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      const { path, timestamp } = item;
      const age = Date.now() - timestamp;

      // Skip photos older than 60 seconds
      if (age > 60000) continue;

      try {
        await uploadAndSharePhoto(path, this.groupId, this.uploaderName);
        console.log('✅ Background upload success');
      } catch (error: any) {
        console.log('❌ Background upload failed, retrying...', error.message);
        try {
          await sleep(3000);
          await uploadAndSharePhoto(path, this.groupId, this.uploaderName);
          console.log('✅ Retry background success');
        } catch (retryError) {
          console.log('❌ Retry background failed');
        }
      }

      await sleep(1000);
    }

    this.isUploading = false;
  };

  private taskRandom = async (taskDataArguments: any) => {
    const { groupId, uploaderName } = taskDataArguments;
    this.groupId = groupId;
    this.uploaderName = uploaderName;

    if (!PhotoDetectionModule) {
      console.warn('BackgroundSharing: PhotoDetectionModule not found');
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Clear old state
    this.queue = [];
    this.isUploading = false;

    // Start Native Observer
    PhotoDetectionModule.startService();
    const emitter = new NativeEventEmitter(PhotoDetectionModule);
    
    if (this.subscription) {
      this.subscription.remove();
    }

    this.subscription = emitter.addListener('NewPhotoDetected', (photoPath: string) => {
      console.log('📸 Background detected new photo:', photoPath);
      this.queue.push({
        path: photoPath,
        timestamp: Date.now(),
      });
      this.processQueue();
    });

    // Keep the task infinite loop alive
    await new Promise(async (resolve) => {
      while (BackgroundJob.isRunning()) {
        await sleep(1000);
      }
      resolve(null);
    });
  };

  public async startSharing(groupId: string, uploaderName: string) {
    if (BackgroundJob.isRunning()) {
      return; // Already running
    }

    console.log('Starting Persistent Foreground Sharing Service...');
    
    const options = {
      taskName: 'PhotoSharingTask',
      taskTitle: 'Orca Sharing Active',
      taskDesc: 'Looking for new photos to securely upload',
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#3B82F6',
      linkingURI: 'orca://',
      parameters: {
        groupId,
        uploaderName,
      },
    };

    try {
      await BackgroundJob.start(this.taskRandom, options);
    } catch (e) {
      console.log('Error starting BackgroundJob', e);
    }
  }

  public async stopSharing() {
    console.log('Stopping Persistent Foreground Sharing Service...');
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    if (PhotoDetectionModule) {
      PhotoDetectionModule.stopService();
    }
    
    if (BackgroundJob.isRunning()) {
      await BackgroundJob.stop();
    }
  }
}

export const backgroundSharingService = new BackgroundSharingService();
