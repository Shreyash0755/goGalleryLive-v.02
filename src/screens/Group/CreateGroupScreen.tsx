import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft, PartyPopper } from 'lucide-react-native';
import { createGroup, Group } from '../../services/groupService';

const CreateGroupScreen = ({ navigation }: any) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  const handleCreateGroup = async () => {
  if (!groupName.trim()) {
    Alert.alert('Error', 'Please enter a group name');
    return;
  }

  setLoading(true);
  try {
    console.log('Step 1: Starting group creation...');
    console.log('Group name:', groupName);
    
    const group = await createGroup(groupName.trim());
    
    console.log('Step 2: Group created successfully!', group);
    setCreatedGroup(group);
  } catch (error: any) {
    console.log('Step 2: Error creating group:', error.message);
    console.log('Error code:', error.code);
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
  // Show created group with QR and invite code
  if (createdGroup) {
    return (
      <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.successHeader}>
            <Text style={styles.successTitle}>Group Created!</Text>
            <PartyPopper color="#4CAF50" size={32} />
          </View>
          <Text style={styles.groupName}>{createdGroup.name}</Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Text style={styles.label}>Scan QR Code to Join</Text>
          <View style={styles.qrBox}>
            <QRCode
              value={createdGroup.qrData}
              size={200}
              backgroundColor="white"
              color="black"
            />
          </View>
        </View>

        {/* Invite Code */}
        <View style={styles.codeContainer}>
          <Text style={styles.label}>Or Share Invite Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.inviteCode}>{createdGroup.inviteCode}</Text>
          </View>
          <Text style={styles.codeHint}>
            Share this code with people you want to invite
          </Text>
        </View>

        {/* Go to Group Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('GroupList')}
        >
          <Text style={styles.buttonText}>Go to My Groups</Text>
        </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    );
  }

  // Show create group form
  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <ChevronLeft color="#3B82F6" size={28} />
        </TouchableOpacity>
        <Text style={styles.title}>New Group</Text>
        <View style={{ width: 60 }} />
      </View>
      <Text style={styles.subtitle}>
        A unique invite code and QR code will be generated automatically
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Group Name (e.g. Goa Trip 2024)"
        placeholderTextColor="#888"
        value={groupName}
        onChangeText={setGroupName}
        maxLength={50}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateGroup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create Group</Text>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButtonContainer: {
    width: 60,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    // marginTop: 60, // Removed
    // marginBottom: 12, // Removed
    paddingHorizontal: 0, // Adjusted
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 60,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupName: {
    fontSize: 20,
    color: '#3B82F6',
    marginBottom: 32,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  qrBox: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  codeContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  inviteCode: {
    color: '#3B82F6',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  codeHint: {
    color: '#555',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginHorizontal: 24,
    width: '90%',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    width: '90%',
    marginHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
});

export default CreateGroupScreen;