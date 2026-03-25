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
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { joinGroupByCode } from '../../services/groupService';

const JoinGroupScreen = ({ navigation }: any) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  const device = useCameraDevice('back');

  // QR Code scanner handler
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: async (codes) => {
      if (scanned || loading) return;
      if (codes.length > 0) {
        const scannedValue = codes[0].value;
        console.log('Scanned QR:', scannedValue);

        // Extract invite code from QR data
        // QR format: orca://join/XXXXXX
        if (scannedValue?.startsWith('orca://join/')) {
          const extractedCode = scannedValue.replace('orca://join/', '');
          setScanned(true);
          setShowScanner(false);
          await handleJoin(extractedCode);
        } else {
          Alert.alert('Invalid QR', 'This QR code is not for Orca');
        }
      }
    }
  });

  const handleJoin = async (code: string) => {
    setLoading(true);
    try {
      const group = await joinGroupByCode(code);
      Alert.alert(
        'Success! 🎉',
        `You joined "${group.name}" successfully!`,
        [{ text: 'OK', onPress: () => navigation.replace('GroupList') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter invite code');
      return;
    }
    await handleJoin(inviteCode);
  };

  const requestCameraAndScan = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'granted') {
      setShowScanner(true);
      setScanned(false);
    } else {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to scan QR codes',
        [{ text: 'OK' }]
      );
    }
  };

  // QR Scanner View
  if (showScanner) {
    if (!device) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>Camera not available</Text>
          <TouchableOpacity onPress={() => setShowScanner(false)}>
            <Text style={styles.link}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />

        {/* Scanner Overlay */}
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.scannerHint}>
            Point camera at the Orca QR code
          </Text>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowScanner(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Joining group...</Text>
          </View>
        )}
      </View>
    );
  }

  // Normal Join Screen
  return (
    <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={styles.container}>
      <Text style={styles.title}>Join a Group</Text>
      <Text style={styles.subtitle}>
        Enter the invite code or scan QR code
      </Text>

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

      {/* QR Scanner Button */}
      <TouchableOpacity
        style={styles.qrButton}
        onPress={requestCameraAndScan}
        disabled={loading}
      >
        <Text style={styles.qrButtonText}>📷 Scan QR Code</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60, // Adjust for header
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButtonContainer: {
    width: 60,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  title: { // This style is now unused for the main title, but kept for other potential uses or if it was intended for the scanner title.
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
    color: '#3B82F6',
    fontSize: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
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
    borderColor: '#3B82F6',
  },
  qrButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#888',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  scannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scannerHint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  cancelButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    padding: 16,
    paddingHorizontal: 40,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});

export default JoinGroupScreen;