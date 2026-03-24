const { IndexFacesCommand, CreateCollectionCommand, ResourceAlreadyExistsException } = require('@aws-sdk/client-rekognition');
const { rekognition, COLLECTION_ID } = require('./awsConfig');

async function ensureCollectionExists() {
  try {
    const command = new CreateCollectionCommand({ CollectionId: COLLECTION_ID });
    await rekognition.send(command);
    console.log(`Created collection: ${COLLECTION_ID}`);
  } catch (error) {
    if (error.name !== 'ResourceAlreadyExistsException') {
      console.error('Error creating collection:', error);
      throw error;
    }
  }
}

async function registerFaceAngle(userId, photoUrl) {
  await ensureCollectionExists();

  const faceDataBytes = await fetch(photoUrl).then((res) => res.arrayBuffer());

  const command = new IndexFacesCommand({
    CollectionId: COLLECTION_ID,
    Image: {
      Bytes: Buffer.from(faceDataBytes),
    },
    ExternalImageId: userId, // We tag the face with the user's Firebase UID
    DetectionAttributes: ['ALL'],
  });

  try {
    const response = await rekognition.send(command);
    const faceRecords = response.FaceRecords;
    
    if (faceRecords.length === 0) {
      return { success: false, message: 'No face detected in the given photo.' };
    }

    if (faceRecords.length > 1) {
      return { success: false, message: 'Multiple faces detected. Please upload a solo photo.' };
    }

    const faceId = faceRecords[0].Face.FaceId;
    console.log(`Successfully registered user ${userId} with FaceId ${faceId}`);

    return { success: true, message: 'Face successfully registered.', faceId };
  } catch (error) {
    console.error('Rekognition IndexFaces Error:', error);
    throw new Error('Failed to register face with AWS Rekognition.');
  }
}

module.exports = {
  registerFaceAngle
};
