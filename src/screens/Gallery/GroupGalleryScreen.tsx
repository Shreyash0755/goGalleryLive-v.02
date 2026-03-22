import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Dimensions,
  Alert,
  PermissionsAndroid,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import RNFS from 'react-native-fs';
import { usePhotoSharing } from '../../hooks/usePhotoSharing';
import { listenToGroupPhotos, Photo } from '../../services/photoService';
import { FirebaseAuth } from '../../services/firebase';
import { Group } from '../../services/groupService';

const { width, height } = Dimensions.get('window');
const PHOTO_SIZE = width / 3 - 4;

const PhotoItem = ({
  item,
  onPress,
}: {
  item: Photo;
  onPress: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => {
        if (error) {
          setError(false);
          setLoading(true);
          setRetryCount(c => c + 1);
        } else {
          onPress();
        }
      }}
    >
      {!error ? (
        <Image
          source={{ uri: `${item.url}?retry=${retryCount}` }}
          style={styles.photo}
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </View>
      )}
      {loading && !error && (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color="#FF6B35" />
        </View>
      )}
      <Text style={styles.photoUploader} numberOfLines={1}>
        {item.uploaderName}
      </Text>
    </TouchableOpacity>
  );
};

const PhotoViewer = ({
  visible,
  photos,
  initialIndex,
  onClose,
  onDownload,
  downloading,
}: {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (photo: Photo) => void;
  downloading: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const currentPhoto = photos[currentIndex];

  const renderFullPhoto = ({ item }: { item: Photo }) => (
    <View style={styles.fullPhotoContainer}>
      <Image
        source={{
          uri: item.url.replace(
            '/image/upload/w_400,h_400,c_fill,q_70/',
            '/image/upload/w_1200,q_90/'
          )
        }}
        style={styles.fullPhoto}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.viewerContainer}>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderFullPhoto}
          keyExtractor={(item, index) => `viewer_${item.id}_${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / width
            );
            setCurrentIndex(index);
          }}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialScrollIndex={initialIndex}
        />

        <View style={styles.viewerFooter}>
          <Text style={styles.viewerUploader}>
            📷 {currentPhoto?.uploaderName || 'Unknown'}
          </Text>
          <TouchableOpacity
            style={[
              styles.downloadButton,
              downloading && styles.downloadButtonDisabled
            ]}
            onPress={() => currentPhoto && onDownload(currentPhoto)}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.downloadButtonText}>⬇ Download</Text>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const GroupGalleryScreen = ({ route, navigation }: any) => {
  const { group }: { group: Group } = route.params;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [receiveOnlyMyPhotos, setReceiveOnlyMyPhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const currentUser = FirebaseAuth.currentUser;
  const currentMember = group.members[currentUser?.uid || ''];

  usePhotoSharing(
    group.groupId,
    sharingEnabled,
    currentMember?.name || 'Unknown'
  );

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToGroupPhotos(
      group.groupId,
      (newPhotos) => {
        console.log('Photos received:', newPhotos.length);
        setPhotos([...newPhotos]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [group.groupId, refreshKey]);

  // Filter photos based on face detection
  const filteredPhotos = receiveOnlyMyPhotos
  ? photos.filter(p =>
      p.faces?.includes(currentUser?.uid || '')
    )
  : photos;

  const openPhoto = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const downloadPhoto = async (photo: Photo) => {
    try {
      setDownloading(true);

      if (Number(Platform.Version) < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission needed', 'Storage permission required');
          setDownloading(false);
          return;
        }
      }

      const originalUrl = photo.url.replace(
        '/image/upload/w_400,h_400,c_fill,q_70/',
        '/image/upload/'
      );

      const fileName = `GoGalleryLive_${Date.now()}.jpg`;
      const downloadPath = `${RNFS.PicturesDirectoryPath}/${fileName}`;

      const result = await RNFS.downloadFile({
        fromUrl: originalUrl,
        toFile: downloadPath,
      }).promise;

      if (result.statusCode === 200) {
        await RNFS.scanFile(downloadPath);
        Alert.alert('✅ Downloaded!', 'Photo saved to your gallery');
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      Alert.alert('Download Failed', error.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {group.name}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setRefreshKey(k => k + 1)}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('GroupDetail', { group })}
            style={styles.headerIconBtn}
          >
            <Text style={styles.headerIcon}>ℹ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sharing Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleLeft}>
          <Text style={styles.toggleTitle}>
            {sharingEnabled ? '📤 Sharing ON' : '📤 Sharing OFF'}
          </Text>
          <Text style={styles.toggleSubtitle}>
            {sharingEnabled
              ? 'Photos are being shared automatically'
              : 'Enable to share photos automatically'
            }
          </Text>
        </View>
        <Switch
          value={sharingEnabled}
          onValueChange={setSharingEnabled}
          trackColor={{ false: '#333', true: '#FF6B35' }}
          thumbColor={sharingEnabled ? '#fff' : '#888'}
        />
      </View>

      {/* Face Filter Toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleLeft}>
          <Text style={styles.toggleTitle}>
            {receiveOnlyMyPhotos ? '🎯 My Photos Only' : '👥 All Photos'}
          </Text>
          <Text style={styles.toggleSubtitle}>
            {receiveOnlyMyPhotos
              ? 'Showing photos you appear in'
              : 'Showing all group photos'
            }
          </Text>
        </View>
        <Switch
          value={receiveOnlyMyPhotos}
          onValueChange={setReceiveOnlyMyPhotos}
          trackColor={{ false: '#333', true: '#4CAF50' }}
          thumbColor={receiveOnlyMyPhotos ? '#fff' : '#888'}
        />
      </View>

      {/* Photo Count */}
      {filteredPhotos.length > 0 && (
        <Text style={styles.photoCount}>
          {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
          {receiveOnlyMyPhotos ? ' with you' : ' total'}
        </Text>
      )}

      {/* Photos Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : filteredPhotos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>
            {receiveOnlyMyPhotos ? '🎯' : '📷'}
          </Text>
          <Text style={styles.emptyText}>
            {receiveOnlyMyPhotos
              ? 'No photos with you yet'
              : 'No photos yet'
            }
          </Text>
          <Text style={styles.emptySubtext}>
            {receiveOnlyMyPhotos
              ? 'Photos where your face is detected will appear here'
              : 'Enable sharing and take a photo to get started'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          renderItem={({ item, index }) => (
            <PhotoItem
              item={item}
              onPress={() => openPhoto(index)}
            />
          )}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          extraData={filteredPhotos}
          removeClippedSubviews={false}
          onRefresh={() => setRefreshKey(k => k + 1)}
          refreshing={loading}
        />
      )}

      {/* Full Screen Viewer */}
      <PhotoViewer
        visible={viewerVisible}
        photos={filteredPhotos}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        onDownload={downloadPhoto}
        downloading={downloading}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    color: '#FF6B35',
    fontSize: 16,
    width: 60,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerIcon: {
    color: '#FF6B35',
    fontSize: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleLeft: {
    flex: 1,
  },
  toggleTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toggleSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  photoCount: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  photoGrid: {
    padding: 2,
    paddingTop: 8,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  loaderBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorText: {
    fontSize: 20,
  },
  retryText: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
  },
  photoUploader: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    color: '#fff',
    fontSize: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterContainer: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
  },
  fullPhotoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: width,
    height: height,
  },
  viewerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerUploader: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  downloadButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 12,
  },
  downloadButtonDisabled: {
    backgroundColor: '#888',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default GroupGalleryScreen;