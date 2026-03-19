const CLOUD_NAME = 'dknuxlyhy'; // ← Replace with yours
const UPLOAD_PRESET = 'gogallerylive';

export const uploadPhotoToCloudinary = async (
  photoPath: string
): Promise<string> => {
  console.log('Uploading photo to Cloudinary:', photoPath);

  const formData = new FormData();
  formData.append('file', {
    uri: `file://${photoPath}`,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const data = await response.json();
  console.log('Cloudinary response:', data);

  if (data.secure_url) {
    return data.secure_url;
  }

  throw new Error('Upload failed: ' + JSON.stringify(data));
};