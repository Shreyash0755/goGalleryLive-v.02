import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { joinGroupByCode } from '../../services/groupService';

const JoinGroupScreen = ({ navigation }: any) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter invite code');
      return;
    }

    setLoading(true);
    try {
      const group = await joinGroupByCode(inviteCode);
      Alert.alert(
        'Success! 🎉',
        `You joined "${group.name}" successfully!`,
        [{ text: 'OK', onPress: () => navigation.replace('GroupList') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Group</Text>
      <Text style={styles.subtitle}>
        Enter the invite code shared by the group admin
      </Text>

      {/* Invite Code Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter Invite Code"
        placeholderTextColor="#888"
        value={inviteCode}
        onChangeText={(text) => setInviteCode(text.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleJoinByCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Join Group</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* QR Scanner — Coming Soon */}
      <TouchableOpacity
        style={styles.qrButton}
        onPress={() => Alert.alert(
          'Coming Soon',
          'QR Scanner will be added next!'
        )}
      >
        <Text style={styles.qrButtonText}>📷 Scan QR Code</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    color: '#FF6B35',
    fontSize: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#888',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  qrButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});

export default JoinGroupScreen;