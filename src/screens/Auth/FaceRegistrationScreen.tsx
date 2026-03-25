import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Image,
    Dimensions,
    SafeAreaView
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { registerFaceAngle } from '../../services/faceService';

const { width } = Dimensions.get('window');

const FaceRegistrationScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(false);
    const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

    const capturePhoto = async () => {
        try {
            const result = await launchCamera({
                mediaType: 'photo',
                cameraType: 'front',
                quality: 1.0,
                saveToPhotos: false,
                includeBase64: false,
            });

            if (result.didCancel) return;

            if (result.errorCode) {
                Alert.alert('Camera Error', result.errorMessage || 'Unknown error');
                return;
            }

            if (!result.assets?.[0]?.uri) {
                Alert.alert('Error', 'Failed to capture photo');
                return;
            }

            const photoUri = result.assets[0].uri;
            setLastPhotoUri(photoUri);
            setLoading(true);

            // Register face with AWS via Firebase
            const response = await registerFaceAngle(photoUri, 'front');

            if (!response.success) {
                Alert.alert('Registration Failed', response.message);
                setLastPhotoUri(null); // Clear preview on failure
                return;
            }

            Alert.alert(
                '🎉 Success!',
                'Your face has been securely registered.',
                [{
                    text: 'Continue to Gallery',
                    onPress: () => {
                        try {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('GroupList');
                            }
                        } catch (e) {
                            console.log('Handled by AppNavigator');
                        }
                    }
                }]
            );

        } catch (error: any) {
            console.log('Capture error:', error.message);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const skipRegistration = () => {
        Alert.alert(
            'Skip Face Registration?',
            'Without registration, you will not be automatically filtered in group photos.',
            [
                { text: 'Register Now', style: 'cancel' },
                {
                    text: 'Skip',
                    style: 'destructive',
                    onPress: () => {
                        try {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('GroupList');
                            }
                        } catch (e) {
                            console.log('Handled by AppNavigator');
                        }
                    }
                }
            ]
        );
    };

    return (
        <LinearGradient
            colors={['#0f2027', '#203a43', '#2c5364']}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.glassCard}>

                    <Text style={styles.emoji}>👤</Text>

                    <Text style={styles.title}>Face Registration</Text>

                    <Text style={styles.subtitle}>
                        Take a clear, well-lit photo of your face so we can automatically deliver photos you are in.
                    </Text>

                    {lastPhotoUri ? (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: lastPhotoUri }} style={styles.previewImage} />
                        </View>
                    ) : (
                        <View style={styles.tipsContainer}>
                            <View style={styles.tipBadge}><Text style={styles.tipText}>✨ Good Lighting</Text></View>
                            <View style={styles.tipBadge}><Text style={styles.tipText}>👓 No Glasses</Text></View>
                            <View style={styles.tipBadge}><Text style={styles.tipText}>Look Straight</Text></View>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.captureButton, loading && styles.captureButtonDisabled]}
                        onPress={capturePhoto}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#3B82F6', '#F54EA2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            {loading ? (
                                <View style={styles.row}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.captureButtonText}>Uploading...</Text>
                                </View>
                            ) : (
                                <View style={styles.row}>
                                    <Text style={styles.btnIcon}>📸</Text>
                                    <Text style={styles.captureButtonText}>Enable Smart Face Match</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={skipRegistration}
                        disabled={loading}
                    >
                        <Text style={styles.skipButtonText}>Skip for now</Text>
                    </TouchableOpacity>

                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    glassCard: {
        backgroundColor: 'rgba(30, 30, 46, 0.65)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 5,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#A0AEC0',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    previewContainer: {
        marginBottom: 30,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    previewImage: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: '#3B82F6',
    },
    tipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 30,
    },
    tipBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    tipText: {
        color: '#E2E8F0',
        fontSize: 12,
        fontWeight: '500',
    },
    captureButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    captureButtonDisabled: {
        opacity: 0.7,
    },
    gradientButton: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    btnIcon: {
        fontSize: 20,
    },
    captureButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    skipButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    skipButtonText: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default FaceRegistrationScreen;
