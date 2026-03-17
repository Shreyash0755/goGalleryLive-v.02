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
import { Group } from '../../services/groupService';

const GroupDetailScreen = ({ route, navigation }: any) => {
  const { group }: { group: Group } = route.params;
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    Clipboard.setString(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const members = Object.values(group.members);

  return (
    <ScrollView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
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
            { color: group.isActive ? '#4CAF50' : '#f44336' }
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
              <Text style={styles.memberMeta}>
                {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
                {' • '}
                {member.sharingEnabled ? '📤 Sharing ON' : '📤 Sharing OFF'}
              </Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
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
  },
  backButton: {
    color: '#FF6B35',
    fontSize: 16,
    width: 60,
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
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  inviteCode: {
    color: '#FF6B35',
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
    backgroundColor: '#FF6B35',
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
    fontWeight: '500',
    marginBottom: 2,
  },
  memberMeta: {
    color: '#888',
    fontSize: 12,
  },
});

export default GroupDetailScreen;