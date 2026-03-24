const { SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { rekognition, COLLECTION_ID } = require('./awsConfig');

async function matchFacesInPhoto(photoUrl, memberUids) {
  try {
    const faceDataBytes = await fetch(photoUrl).then((res) => res.arrayBuffer());

    const command = new SearchFacesByImageCommand({
      CollectionId: COLLECTION_ID,
      Image: {
        Bytes: Buffer.from(faceDataBytes),
      },
      FaceMatchThreshold: 85, // 85% similarity threshold
      MaxFaces: 10, // Max faces to detect and match in the group photo
    });

    const response = await rekognition.send(command);
    console.log(`AWS matched ${response.FaceMatches.length} faces based on 85% threshold.`);

    // ExternalImageId holds the user's Firebase UID since we used it during IndexFaces
    const matchedUids = response.FaceMatches.map(match => match.Face.ExternalImageId);
    console.log('AWS Matched UIDs:', matchedUids);
    console.log('Group Member UIDs:', memberUids);

    // Filter to only include users who are actually in the specified group
    const validMatches = matchedUids.filter(uid => memberUids.includes(uid));
    console.log('Valid Matches after filtering:', validMatches);

    // Remove duplicates just in case
    return [...new Set(validMatches)];
  } catch (error) {
    // If no faces are found in the image, AWS throws an error: InvalidParameterException: There are no faces in the image.
    if (error.name === 'InvalidParameterException' && error.message.includes('no faces')) {
      console.log('No faces found in photo.');
      return [];
    }

    console.error('Rekognition SearchFacesByImage Error:', error);
    throw new Error('Failed to match faces with AWS Rekognition.');
  }
}

module.exports = {
  matchFacesInPhoto
};
