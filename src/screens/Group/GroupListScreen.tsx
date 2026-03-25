import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getUserGroups, Group } from '../../services/groupService';
import { useAuth } from '../../hooks/useAuth';

const GroupListScreen = ({ navigation }: any) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // If the user has explicitly skipped or finished, it evaluates to true.
    // If the account was just created, it is undefined. Both undefined and false will trigger the redirect!
    if (user && !user.faceRegistered) {
      navigation.navigate('FaceRegistration');
    } else {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      const userGroups = await getUserGroups();
      setGroups(userGroups);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : 'G';
    const memberCount = Object.keys(item.members).length;

    return (
      <TouchableOpacity
        style={styles.glassCard}
        onPress={() => navigation.navigate('GroupGallery', { group: item })}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={['#3B82F6', '#8B5CF6']} 
          style={styles.groupAvatar}
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        >
          <Text style={styles.groupAvatarText}>{initial}</Text>
        </LinearGradient>
        
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>👥 {memberCount} Members</Text>
            </View>
            <View style={styles.statBadge}>
              <Text style={styles.statBadgeText}>🔑 ID: {item.inviteCode}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'There'} 👋</Text>
          <Text style={styles.tagline}>Ready to dive into your memories?</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#3B82F6"
          style={styles.loader}
        />
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyLogoContainer}>
            <Image 
              source={require('../../assets/logo1.png')} 
              style={styles.emptyLogo} 
              resizeMode="contain" 
            />
          </View>
          <Text style={styles.emptyText}>No groups yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to create or join your first group
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item.groupId}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.list}
          onRefresh={loadGroups}
          refreshing={loading}
        />
      )}

      {/* FAB Overlay */}
      {showFabMenu && (
        <TouchableOpacity 
          style={styles.fabOverlay} 
          activeOpacity={1} 
          onPress={() => setShowFabMenu(false)}
        >
          <View style={styles.fabMenu}>
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => { setShowFabMenu(false); navigation.navigate('CreateGroup'); }}
            >
              <Text style={styles.fabMenuText}>Create New Group</Text>
              <View style={styles.fabMenuIconBox}><Text style={styles.fabMenuIcon}>➕</Text></View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fabMenuItem}
              onPress={() => { setShowFabMenu(false); navigation.navigate('JoinGroup'); }}
            >
              <Text style={styles.fabMenuText}>Scan to Join</Text>
              <View style={styles.fabMenuIconBox}><Text style={styles.fabMenuIcon}>📷</Text></View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Main FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowFabMenu(!showFabMenu)}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={['#3B82F6', '#2563EB']} 
          style={styles.fabGradient}
        >
          <Text style={[styles.fabIcon, showFabMenu && styles.fabIconRotate]}>＋</Text>
        </LinearGradient>
      </TouchableOpacity>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#888',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  profileIcon: {
    fontSize: 20,
  },
  loader: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptyLogoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyLogo: {
    width: 80,
    height: 80,
    opacity: 0.8,
  },
  list: {
    padding: 8,
    paddingBottom: 100, // padding for FAB
  },
  rowWrapper: {
    justifyContent: 'space-between',
  },
  glassCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    aspectRatio: 0.85,
  },
  groupInfo: {
    alignItems: 'center',
    width: '100%',
  },
  groupName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  groupAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statBadgeText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingRight: 24,
  },
  fabMenu: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fabMenuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fabMenuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  fabMenuIcon: {
    fontSize: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
  },
  fabIconRotate: {
    transform: [{ rotate: '45deg' }],
  },
});

export default GroupListScreen;