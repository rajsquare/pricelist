import { cloudinaryConfig } from '../constants/config.js';

export const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;
export const CLOUDINARY_UPLOAD_PRESET = cloudinaryConfig.uploadPreset;
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file) {
  if (!file) {
    return 'Choose an image to upload.';
  }

  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension) || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, JPEG, PNG, and WEBP images are allowed.';
  }

  return '';
}

export function uploadProductImage(file, onProgress = () => {}) {
  const validationError = validateImageFile(file);

  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    request.open('POST', uploadUrl);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        const response = JSON.parse(request.responseText);
        const originalFileName = response.original_filename
          ? `${response.original_filename}${response.format ? `.${response.format}` : ''}`
          : '';
        resolve({ url: response.secure_url, fileName: originalFileName });
        return;
      }

      reject(new Error('Cloudinary upload failed.'));
    };

    request.onerror = () => {
      reject(new Error('Cloudinary upload failed.'));
    };

    request.send(formData);
  });
}

export async function downloadImage(imageUrl, fileName) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error('Image download failed.');
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const derivedName = imageUrl.split('/').pop()?.split('?')[0] || 'product-image';

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || derivedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
