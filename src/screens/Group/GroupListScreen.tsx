import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getUserGroups, Group } from '../../services/groupService';
import { logoutUser } from '../../services/authService';

const GroupListScreen = ({ navigation }: any) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

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

  const renderGroup = ({ item }: { item: Group }) => (
  <TouchableOpacity
    style={styles.groupCard}
    onPress={() => navigation.navigate('GroupGallery', { group: item })}
  >
    <View style={styles.groupInfo}>
      <Text style={styles.groupName}>{item.name}</Text>
      <Text style={styles.groupMeta}>
        {Object.keys(item.members).length} members
        • Code: {item.inviteCode}
      </Text>
    </View>
    <Text style={styles.arrow}>→</Text>
  </TouchableOpacity>
);
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <TouchableOpacity onPress={() => logoutUser()}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF6B35"
          style={styles.loader}
        />
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No groups yet</Text>
          <Text style={styles.emptySubtext}>
            Create or join a group to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item.groupId}
          contentContainerStyle={styles.list}
          onRefresh={loadGroups}
          refreshing={loading}
        />
      )}

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, styles.joinButton]}
          onPress={() => navigation.navigate('JoinGroup')}
        >
          <Text style={styles.bottomButtonText}>Join Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomButton, styles.createButton]}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.bottomButtonText}>+ Create Group</Text>
        </TouchableOpacity>
      </View>

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
    padding: 24,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  logout: {
    color: '#888',
    fontSize: 14,
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
  list: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupMeta: {
    color: '#888',
    fontSize: 12,
  },
  arrow: {
    color: '#FF6B35',
    fontSize: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  bottomButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  createButton: {
    backgroundColor: '#FF6B35',
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GroupListScreen;