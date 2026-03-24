const { RekognitionClient } = require('@aws-sdk/client-rekognition');

// Firebase now automatically loads environment variables from the .env file
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

if (!credentials.accessKeyId || !credentials.secretAccessKey) {
  console.error("AWS credentials missing! Please configure them in the .env file before deploying.");
}

const rekognition = new RekognitionClient({
  region: 'us-east-1', // Update if your AWS region is different
  credentials
});

const COLLECTION_ID = 'goGalleryLiveFaces';

module.exports = {
  rekognition,
  COLLECTION_ID
};
