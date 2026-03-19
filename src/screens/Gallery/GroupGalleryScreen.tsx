import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { usePhotoSharing } from '../../hooks/usePhotoSharing';
import { listenToGroupPhotos, Photo } from '../../services/photoService';
import { FirebaseAuth } from '../../services/firebase';
import { Group } from '../../services/groupService';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 3 - 4;

const PhotoItem = ({ item }: { item: Photo }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => {
        if (error) {
          console.log('Retrying image:', item.url);
          setError(false);
          setLoading(true);
          setRetryCount(c => c + 1);
        }
      }}
    >
      {!error ? (
        <Image
          source={{
            uri: `${item.url}?retry=${retryCount}`,
            cache: 'reload',
          }}
          style={styles.photo}
          resizeMode="cover"
          onLoadEnd={() => {
            console.log('✅ Image loaded:', item.url);
            setLoading(false);
          }}
          onError={(e) => {
            console.log('❌ Image failed:', item.url);
            console.log('Error:', e.nativeEvent.error);
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

const GroupGalleryScreen = ({ route, navigation }: any) => {
  const { group }: { group: Group } = route.params;
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentUser = FirebaseAuth.currentUser;
  const currentMember = group.members[currentUser?.uid || ''];

  usePhotoSharing(
    group.groupId,
    sharingEnabled,
    currentMember?.name || 'Unknown'
  );

  useEffect(() => {
    console.log('Starting listener, key:', refreshKey);
    setLoading(true);

    const unsubscribe = listenToGroupPhotos(
      group.groupId,
      (newPhotos) => {
        console.log('Photos received:', newPhotos.length);
        newPhotos.forEach((p, i) =>
          console.log(`Photo ${i + 1}:`, p.id, p.url)
        );
        setPhotos([...newPhotos]);
        setLoading(false);
      }
    );

    return () => {
      console.log('Stopping listener');
      unsubscribe();
    };
  }, [group.groupId, refreshKey]);

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
        <TouchableOpacity onPress={() => setRefreshKey(k => k + 1)}>
          <Text style={styles.refreshButton}>↻</Text>
        </TouchableOpacity>
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

      {/* Photo Count */}
      {photos.length > 0 && (
        <Text style={styles.photoCount}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Photos Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>
            Enable sharing and take a photo to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={({ item }) => <PhotoItem item={item} />}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          extraData={photos}
          removeClippedSubviews={false}
          onRefresh={() => setRefreshKey(k => k + 1)}
          refreshing={loading}
        />
      )}

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
  refreshButton: {
    color: '#FF6B35',
    fontSize: 24,
    width: 60,
    textAlign: 'right',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 12,
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
    paddingBottom: 8,
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
});

export default GroupGalleryScreen;