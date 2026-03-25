import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, Shield, User as UserIcon, Share, Lock } from 'lucide-react-native';
import { Group, deleteGroup, leaveGroup, removeMember } from '../../services/groupService';
import { FirebaseAuth } from '../../services/firebase';

const GroupDetailScreen = ({ route, navigation }: any) => {
  const { group }: { group: Group } = route.params;
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    Clipboard.setString(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const members = Object.values(group.members);
  const currentUserUid = FirebaseAuth.currentUser?.uid;
  const isAdmin = group.createdBy === currentUserUid || group.members[currentUserUid || '']?.role === 'admin';

  const handleDeleteGroup = () => {
    Alert.alert('Delete Group', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteGroup(group.groupId);
            navigation.popToTop();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          try {
            await leaveGroup(group.groupId);
            navigation.popToTop();
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert('Remove Member', `Remove ${memberName} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await removeMember(group.groupId, memberId);
            Alert.alert('Success', 'Member removed. Go back and reopen to see changes.');
          } catch (e: any) { Alert.alert('Error', e.message); }
        }
      }
    ]);
  };

  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
      <ScrollView style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
            <ChevronLeft color="#3B82F6" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>{group.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Group Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Group Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Group ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {group.groupId}
            </Text>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Members</Text>
            <Text style={styles.infoValue}>{members.length}</Text>
          </View>

          <View style={styles.dividerLine} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[
              styles.infoValue,
              { color: group.isActive ? '#4CAF50' : '#3B82F6' }
            ]}>
              {group.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* QR Code Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scan to Join</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={group.qrData}
              size={180}
              backgroundColor="white"
              color="black"
            />
          </View>
          <Text style={styles.qrHint}>
            Other members can scan this QR code to join
          </Text>
        </View>

        {/* Invite Code Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite Code</Text>
          <TouchableOpacity
            style={styles.codeBox}
            onPress={copyInviteCode}
          >
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <Text style={styles.copyHint}>
              {copied ? '✅ Copied!' : 'Tap to copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Members List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Members ({members.length})
          </Text>
          {members.map((member) => (
            <View key={member.uid} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <View style={styles.metaRow}>
                  {member.role === 'admin' ? <Shield color="#888" size={12} /> : <UserIcon color="#888" size={12} />}
                  <Text style={styles.memberMeta}>
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  {member.sharingEnabled ? <Share color="#888" size={12} /> : <Lock color="#888" size={12} />}
                  <Text style={styles.memberMeta}>
                    {member.sharingEnabled ? 'Sharing' : 'Paused'}
                  </Text>
                </View>
              </View>
              {isAdmin && member.uid !== currentUserUid && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(member.uid, member.name)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
            <Text style={styles.leaveButtonText}>Leave Group</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteGroup}>
              <Text style={styles.deleteButtonText}>Delete Group</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButtonContainer: {
    width: 60,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    color: '#888',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#333',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  qrHint: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  inviteCode: {
    color: '#3B82F6',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 4,
  },
  copyHint: {
    color: '#888',
    fontSize: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    color: '#555',
    fontSize: 12,
    marginHorizontal: 4,
  },
  memberMeta: {
    color: '#888',
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  removeButtonText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dangerZone: {
    padding: 16,
    paddingBottom: 40,
    marginTop: 12,
  },
  leaveButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  leaveButtonText: {
    color: '#3B82F6',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default GroupDetailScreen;