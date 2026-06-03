import { useState } from 'react';
import toast from 'react-hot-toast';
import { addProductImage, getProductImageCount } from '../services/imageService.js';
import { uploadProductImage, validateImageFile } from '../utils/cloudinaryUpload.js';

const MAX_IMAGES = 5;

export default function ImageUploader({ sr, imageCount, onUploaded }) {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setError('');
    setProgress(0);

    if (imageCount >= MAX_IMAGES) {
      setError('This product already has 5 images.');
      event.target.value = '';
      return;
    }

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }

    try {
      setIsUploading(true);

      if (imageCount >= 4) {
        const latestImageCount = await getProductImageCount(sr);

        if (latestImageCount >= MAX_IMAGES) {
          throw new Error('This product already has 5 images.');
        }
      }

      const imageUrl = await uploadProductImage(file, setProgress);

      await addProductImage(sr, imageUrl);

      toast.success('Image uploaded');
      await onUploaded();
    } catch (uploadError) {
      setError(uploadError.message || 'Image upload failed.');
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  }

  return (
    <section className="detail-section">
      <div className="section-heading">
        <h3>Upload Image</h3>
        <span>{imageCount}/5 images</span>
      </div>

      <label className="file-control">
        Choose image
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          disabled={isUploading || imageCount >= MAX_IMAGES}
          onChange={handleFileChange}
        />
      </label>

      {imageCount >= MAX_IMAGES ? (
        <p className="admin-muted">
          Image limit reached. Remove an image before uploading another.
        </p>
      ) : null}

      {isUploading ? (
        <div className="upload-progress">
          <div style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}