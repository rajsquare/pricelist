import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { downloadImage } from '../utils/cloudinaryUpload.js';

function GalleryImage({ image }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !image.imageUrl) {
    return <div className="broken-image">Image unavailable</div>;
  }

  return (
    <PhotoView src={image.imageUrl}>
      <button type="button" className="gallery-image-button" aria-label="View product image">
        <img src={image.imageUrl} alt="Product" onError={() => setHasError(true)} />
      </button>
    </PhotoView>
  );
}

function DownloadImageButton({ image }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      await downloadImage(image.imageUrl, image.fileName);
    } catch (error) {
      toast.error(error.message || 'Image download failed');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className="secondary-button image-download-button"
      type="button"
      disabled={isDownloading}
      onClick={handleDownload}
      aria-label="Download product image"
    >
      {isDownloading ? 'Downloading...' : 'Download'}
    </button>
  );
}

export default function ProductGallery({ images, isAdmin, deletingImageId, onDeleteImage }) {
  return (
    <section className="detail-section">
      <div className="section-heading">
        <h3>Gallery</h3>
        <span>{images.length} images</span>
      </div>

      {images.length === 0 ? <p className="admin-muted">No product images yet.</p> : null}

      {images.length > 0 ? (
        <PhotoProvider>
          <div className="product-gallery">
            {images.map((image) => (
              <div className="gallery-item" key={image.id}>
                <GalleryImage image={image} />
                <div className="gallery-item-actions">
                  <DownloadImageButton image={image} />
                  {isAdmin ? (
                    <button
                      className="danger-button image-delete-button"
                      type="button"
                      disabled={deletingImageId === image.id}
                      onClick={() => onDeleteImage(image)}
                    >
                      {deletingImageId === image.id ? 'Deleting...' : 'Delete'}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PhotoProvider>
      ) : null}
    </section>
  );
}
