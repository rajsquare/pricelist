import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { addProductImage, getProductImageCount, MAX_PRODUCT_IMAGES } from '../services/imageService.js';
import { uploadProductImage, validateImageFile } from '../utils/cloudinaryUpload.js';

const MAX_IMAGES = MAX_PRODUCT_IMAGES;

export default function ImageUploader({ sr, imageCount, onUploaded }) {
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const remainingSlots = MAX_IMAGES - imageCount;
  const limitReached = remainingSlots <= 0;

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);

    setError('');
    setProgress(0);

    if (files.length === 0) return;

    if (limitReached) {
      setError(`This product already has ${MAX_IMAGES} images.`);
      return;
    }

    if (imageCount + files.length > MAX_IMAGES) {
      setError(
        `You selected ${files.length} image(s), but only ${remainingSlots} slot(s) remain (max ${MAX_IMAGES} images). No images were uploaded.`,
      );
      return;
    }

    try {
      setIsUploading(true);

      // Re-check against the server in case images were added elsewhere since this component loaded.
      const latestImageCount = await getProductImageCount(sr);

      if (latestImageCount + files.length > MAX_IMAGES) {
        throw new Error(`Uploading these images would exceed the ${MAX_IMAGES} image limit.`);
      }

      let successCount = 0;
      const failures = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const validationError = validateImageFile(file);

        if (validationError) {
          failures.push(`${file.name}: ${validationError}`);
          continue;
        }

        try {
          const fileProgress = (percent) => {
            setProgress(Math.round(((index + percent / 100) / files.length) * 100));
          };

          const { url: imageUrl, fileName } = await uploadProductImage(file, fileProgress);
          await addProductImage(sr, imageUrl, fileName);
          successCount += 1;
        } catch (uploadError) {
          failures.push(`${file.name}: ${uploadError.message || 'Upload failed.'}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} image${successCount > 1 ? 's' : ''} uploaded`);
        await onUploaded();
      }

      if (failures.length > 0) {
        setError(failures.join(' '));
        toast.error(
          successCount > 0 ? 'Some images failed to upload' : 'Image upload failed',
        );
      }
    } catch (uploadError) {
      setError(uploadError.message || 'Image upload failed.');
      toast.error('Image upload failed');
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileChange(event) {
    handleFiles(event.target.files);
  }

  function handleDragEnter(event) {
    event.preventDefault();
    if (limitReached || isUploading) return;
    dragCounterRef.current += 1;
    setIsDragOver(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (limitReached || isUploading) return;
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event) {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (limitReached || isUploading) return;
    handleFiles(event.dataTransfer.files);
  }

  return (
    <section className="detail-section">
      <div className="section-heading">
        <h3>Upload Images</h3>
        <span>{imageCount}/{MAX_IMAGES} Images</span>
      </div>

      {!limitReached ? (
        <label
          className={`file-control image-dropzone${isDragOver ? ' image-dropzone--active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver ? 'Drop images to upload' : 'Drag & drop images here, or click to choose'}
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            disabled={isUploading}
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <p className="admin-muted">
          Image limit reached ({MAX_IMAGES}/{MAX_IMAGES}). Remove an image before uploading another.
        </p>
      )}

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
