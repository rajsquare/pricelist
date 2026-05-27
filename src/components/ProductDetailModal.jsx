import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminConfig } from '../constants/config.js';
import { deleteProductImage, fetchProductImages } from '../services/imageService.js';
import { fetchProductNote, saveProductNote } from '../services/noteService.js';
import ImageUploader from './ImageUploader.jsx';
import ProductGallery from './ProductGallery.jsx';
import RestockForm from './RestockForm.jsx';

export default function ProductDetailModal({ product, priceMode, onClose }) {
  const [images, setImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState('');
  const [deletingImageId, setDeletingImageId] = useState('');
  const [note, setNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isAdmin = localStorage.getItem(adminConfig.storageKey) === 'true';

  const loadImages = useCallback(async () => {
    if (!product?.sr) return;

    try {
      setIsLoadingImages(true);
      setImageError('');
      const fetchedImages = await fetchProductImages(product.sr);
      setImages(fetchedImages);
    } catch (error) {
      setImageError(error.message || 'Unable to load images.');
    } finally {
      setIsLoadingImages(false);
    }
  }, [product?.sr]);

  const loadNote = useCallback(async () => {
    if (!product?.sr) return;

    try {
      const existingNote = await fetchProductNote(product.sr);
      setNote(existingNote);
    } catch {
      setNote('');
    }
  }, [product?.sr]);

  useEffect(() => {
    loadImages();
    loadNote();
  }, [loadImages, loadNote]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleDeleteImage(image) {
    const confirmed = window.confirm('Delete this image from the product gallery?');

    if (!confirmed) return;

    try {
      setDeletingImageId(image.id);
      await deleteProductImage(image.id);
      toast.success('Image removed');
      await loadImages();
    } catch (error) {
      toast.error(error.message || 'Image delete failed');
    } finally {
      setDeletingImageId('');
    }
  }

  async function handleSaveNote() {
    const confirmed = window.confirm('Save changes to this product note?');

    if (!confirmed) return;

    try {
      setIsSavingNote(true);
      await saveProductNote(product.sr, note);
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="product-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close product detail"
          onClick={onClose}
        >
          x
        </button>

        <div className="detail-header">
          <h2 id="product-detail-title">{product.productName}</h2>
        </div>

        {isLoadingImages ? <p className="admin-muted">Loading images...</p> : null}
        {imageError ? <p className="form-error">{imageError}</p> : null}

        <ProductGallery
          images={images}
          isAdmin={isAdmin}
          deletingImageId={deletingImageId}
          onDeleteImage={handleDeleteImage}
        />

        <section className="detail-section">
          <div className="section-heading">
            <h3>Notes</h3>
          </div>

          <textarea
            className="detail-notes-input"
            value={note}
            rows="3"
            placeholder="Add product notes..."
            onChange={(event) => setNote(event.target.value)}
          />

          <button
            type="button"
            className="admin-button"
            disabled={isSavingNote}
            onClick={handleSaveNote}
          >
            {isSavingNote ? 'Saving...' : 'Save Note'}
          </button>
        </section>

        <ImageUploader sr={product.sr} imageCount={images.length} onUploaded={loadImages} />

        <RestockForm product={product} />
      </div>
    </div>
  );
}