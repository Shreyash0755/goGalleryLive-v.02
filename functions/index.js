const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const { registerFaceAngle } = require('./src/faceEnrollment');
const { matchFacesInPhoto } = require('./src/faceMatching');

// Export functions as Callables
exports.registerFace = functions.https.onCall(async (data, context) => {
  // Check auth
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { photoUrl } = data;
  if (!photoUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing photoUrl.');
  }

  try {
    const result = await registerFaceAngle(context.auth.uid, photoUrl);
    return result;
  } catch (error) {
    console.error('Register face error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Face registration failed');
  }
});

exports.matchImageFaces = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { photoUrl, memberUids } = data;
  if (!photoUrl || !memberUids || !Array.isArray(memberUids)) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing photoUrl or memberUids.');
  }

  try {
    const matchedUsers = await matchFacesInPhoto(photoUrl, memberUids);
    return { matchedUsers };
  } catch (error) {
    console.error('Match faces error:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Face matching failed');
  }
});
