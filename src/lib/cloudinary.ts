const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo-cloud";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "demo-preset";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export const uploadToCloudinary = async (
  file: File,
  folder?: string
): Promise<CloudinaryUploadResult> => {
  try {
    console.log('Uploading file to Cloudinary:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folder,
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    // Set resource_type for videos
    if (file.type.startsWith('video/')) {
      formData.append('resource_type', 'video');
    } else {
      formData.append('resource_type', 'auto');
    }
    
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Upload failed: ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();
    console.log('Cloudinary upload successful:', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    });

    return result;
  } catch (error: any) {
    console.error('Error in uploadToCloudinary:', error);
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }
};

export const uploadMultipleImages = async (
  files: File[],
  folder?: string
): Promise<string[]> => {
  try {
    console.log(`Uploading ${files.length} file(s) to Cloudinary...`);
    const uploadPromises = files.map((file, index) => {
      console.log(`Starting upload ${index + 1}/${files.length}: ${file.name}`);
      return uploadToCloudinary(file, folder);
    });
    
    const results = await Promise.all(uploadPromises);
    const urls = results.map(result => result.secure_url);
    
    console.log(`Successfully uploaded ${urls.length} file(s):`, urls);
    return urls;
  } catch (error: any) {
    console.error('Error in uploadMultipleImages:', error);
    throw error;
  }
};
