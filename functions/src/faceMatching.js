const { SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { IndexFacesCommand, SearchFacesCommand, DeleteFacesCommand } = require('@aws-sdk/client-rekognition');
const { rekognition, COLLECTION_ID } = require('./awsConfig');

async function matchFacesInPhoto(photoUrl, memberUids) {
  try {
    const faceDataBytes = await fetch(photoUrl).then((res) => res.arrayBuffer());

    // 1. Index the group photo to extract ALL faces into a temporary bucket.
    // We do NOT attach an ExternalImageId, so we know these are temporary group photo faces.
    const indexCommand = new IndexFacesCommand({
      CollectionId: COLLECTION_ID,
      Image: { Bytes: Buffer.from(faceDataBytes) },
      MaxFaces: 15, // Detect up to 15 faces in the group photo
    });

    const indexResponse = await rekognition.send(indexCommand);
    const tempFaceIds = indexResponse.FaceRecords.map(record => record.Face.FaceId);

    console.log(`Detected ${tempFaceIds.length} faces in the group photo.`);

    if (tempFaceIds.length === 0) {
      return [];
    }

    const matchedUids = new Set();

    // 2. For each detected face in the group photo, search our reference collection.
    // This allows AWS to analyze every individual face, not just the single largest one!
    for (const faceId of tempFaceIds) {
      try {
        const searchCommand = new SearchFacesCommand({
          CollectionId: COLLECTION_ID,
          FaceId: faceId,
          FaceMatchThreshold: 85,
          MaxFaces: 10,
        });

        const searchResponse = await rekognition.send(searchCommand);

        // Look at the matches AWS found in our GO_GALLERY collection
        for (const match of searchResponse.FaceMatches) {
          const registeredUid = match.Face.ExternalImageId;

          // Only tag the photo if the matched user is ACTUALLY in this group!
          if (registeredUid && memberUids.includes(registeredUid)) {
            matchedUids.add(registeredUid);
          }
        }
      } catch (err) {
        console.error(`Error searching face ${faceId}:`, err);
      }
    }

    // 3. Clean up: Delete the temporary group photo faces from the AWS collection 
    // so we don't accidentally match against random backgrounds in the future.
    try {
      const deleteCommand = new DeleteFacesCommand({
        CollectionId: COLLECTION_ID,
        FaceIds: tempFaceIds,
      });
      await rekognition.send(deleteCommand);
      console.log(`Cleaned up ${tempFaceIds.length} temporary faces.`);
    } catch (err) {
      console.error('Failed to delete temporary faces:', err);
    }

    const finalMatches = [...matchedUids];
    console.log('Final detected group members:', finalMatches);
    return finalMatches;

  } catch (error) {
    console.error('Rekognition Multi-Face Search Error:', error);
    throw new Error('Failed to match faces with AWS Rekognition.');
  }
}

module.exports = {
  matchFacesInPhoto
};
