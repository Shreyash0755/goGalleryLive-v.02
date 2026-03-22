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
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { registerFaceAngle } from '../../services/faceService';

const { width } = Dimensions.get('window');

const FACE_ANGLES = [
    {
        id: 'front',
        title: 'Look Straight',
        instruction: 'Face the camera directly with good lighting',
        emoji: '😐',
    },
    {
        id: 'left',
        title: 'Turn Left',
        instruction: 'Turn your head slightly to the left',
        emoji: '😶',
    },
    {
        id: 'right',
        title: 'Turn Right',
        instruction: 'Turn your head slightly to the right',
        emoji: '😶',
    },
    {
        id: 'up',
        title: 'Look Up',
        instruction: 'Tilt your head slightly upward',
        emoji: '🙂',
    },
    {
        id: 'smile',
        title: 'Smile',
        instruction: 'Look straight and smile naturally',
        emoji: '😊',
    },
];

const FaceRegistrationScreen = ({ navigation }: any) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);
    const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

    const currentAngle = FACE_ANGLES[currentStep];
    const isComplete = completedSteps.length === FACE_ANGLES.length;

    const capturePhoto = async () => {
        try {
            const result = await launchCamera({
                mediaType: 'photo',
                cameraType: 'front',
                quality: 1.0,
                saveToPhotos: false,
                includeBase64: false,
            });

            if (result.didCancel) {
                console.log('Camera cancelled');
                return;
            }

            if (result.errorCode) {
                Alert.alert('Camera Error', result.errorMessage || 'Unknown error');
                return;
            }

            if (!result.assets?.[0]?.uri) {
                Alert.alert('Error', 'Failed to capture photo');
                return;
            }

            const photoUri = result.assets[0].uri;
            console.log('=== FACE CAPTURE ===');
            console.log('Photo URI:', photoUri);
            console.log('Width:', result.assets[0].width);
            console.log('Height:', result.assets[0].height);
            console.log('File size:', result.assets[0].fileSize);

            setLastPhotoUri(photoUri);
            setLoading(true);

            // Pass URI directly — image-picker already includes file:// prefix
            const response = await registerFaceAngle(photoUri, currentAngle.id);
            console.log('Registration response:', JSON.stringify(response));

            if (!response.success) {
                Alert.alert('Try Again', response.message);
                return;
            }

            const newCompleted = [...completedSteps, currentAngle.id];
            setCompletedSteps(newCompleted);

            if (newCompleted.length === FACE_ANGLES.length) {
                Alert.alert(
                    '🎉 Face Registration Complete!',
                    'Your face has been registered successfully.',
                    [{
                        text: 'Go to App',
                        onPress: () => {
                            // useAuth hook will automatically navigate to GroupList
                            // since user is already logged in
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'GroupList' }],
                            });
                        }
                    }]
                );

            } else {
                setCurrentStep(s => s + 1);
                Alert.alert(
                    '✅ Captured!',
                    `${currentAngle.title} saved. ${FACE_ANGLES.length - newCompleted.length} more to go.`
                );
            }

        } catch (error: any) {
            console.log('Capture error:', error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const skipRegistration = () => {
        Alert.alert(
            'Skip Face Registration?',
            'Without registration you will receive ALL photos.',
            [
                { text: 'Continue Registration', style: 'cancel' },
                {
                    text: 'Skip for Now',
                    style: 'destructive',
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'GroupList' }],
                        });
                    }
                }
            ]
        );
    };


    return (
        <View style={styles.container}>

            {/* Header */}
            <Text style={styles.title}>Register Your Face</Text>
            <Text style={styles.subtitle}>
                We need 5 photos from different angles for accurate recognition
            </Text>

            {/* Progress Steps */}
            <View style={styles.stepsContainer}>
                {FACE_ANGLES.map((angle, index) => (
                    <View key={angle.id} style={styles.stepItem}>
                        <View style={[
                            styles.stepDot,
                            completedSteps.includes(angle.id) && styles.stepDotComplete,
                            index === currentStep &&
                            !completedSteps.includes(angle.id) &&
                            styles.stepDotActive,
                        ]}>
                            <Text style={styles.stepDotText}>
                                {completedSteps.includes(angle.id) ? '✓' : angle.emoji}
                            </Text>
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            index === currentStep && styles.stepLabelActive,
                        ]}>
                            {angle.title}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Current Step Card */}
            {!isComplete && (
                <View style={styles.currentStepCard}>
                    <Text style={styles.currentStepEmoji}>
                        {currentAngle.emoji}
                    </Text>
                    <Text style={styles.currentStepTitle}>
                        Step {currentStep + 1}: {currentAngle.title}
                    </Text>
                    <Text style={styles.currentStepInstruction}>
                        {currentAngle.instruction}
                    </Text>
                </View>
            )}

            {/* Last Photo Preview */}
            {lastPhotoUri && (
                <View style={styles.previewContainer}>
                    <Image
                        source={{ uri: lastPhotoUri }}
                        style={styles.previewImage}
                    />
                    <Text style={styles.previewLabel}>
                        ✅ Last captured
                    </Text>
                </View>
            )}

            {/* Tips */}
            {!isComplete && (
                <View style={styles.tipsContainer}>
                    <Text style={styles.tipText}>💡 Good lighting</Text>
                    <Text style={styles.tipText}>💡 No glasses</Text>
                    <Text style={styles.tipText}>💡 Face visible</Text>
                </View>
            )}

            {/* Capture Button */}
            {!isComplete && (
                <TouchableOpacity
                    style={[
                        styles.captureButton,
                        loading && styles.captureButtonDisabled
                    ]}
                    onPress={capturePhoto}
                    disabled={loading}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.loadingText}>Processing...</Text>
                        </View>
                    ) : (
                        <Text style={styles.captureButtonText}>
                            📸 Capture Photo {currentStep + 1}/5
                        </Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Skip Button */}
            {!isComplete && (
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={skipRegistration}
                    disabled={loading}
                >
                    <Text style={styles.skipButtonText}>Skip for now</Text>
                </TouchableOpacity>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
        paddingHorizontal: 16,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    stepItem: {
        alignItems: 'center',
        flex: 1,
    },
    stepDot: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepDotActive: {
        borderColor: '#FF6B35',
    },
    stepDotComplete: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    stepDotText: {
        fontSize: 16,
    },
    stepLabel: {
        color: '#555',
        fontSize: 9,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: '#FF6B35',
        fontWeight: 'bold',
    },
    currentStepCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FF6B35',
    },
    currentStepEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },
    currentStepTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    currentStepInstruction: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    previewContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    previewImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    previewLabel: {
        color: '#4CAF50',
        fontSize: 12,
        marginTop: 4,
    },
    tipsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    tipText: {
        color: '#555',
        fontSize: 11,
    },
    captureButton: {
        backgroundColor: '#FF6B35',
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        marginBottom: 12,
    },
    captureButtonDisabled: {
        backgroundColor: '#888',
    },
    captureButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
    },
    skipButton: {
        padding: 12,
        alignItems: 'center',
    },
    skipButtonText: {
        color: '#555',
        fontSize: 14,
    },
});

export default FaceRegistrationScreen;
