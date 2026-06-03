import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { adminConfig } from '../constants/config.js';
import { deleteProductImage, fetchProductImages } from '../services/imageService.js';
import { fetchProductNote, saveProductNote } from '../services/noteService.js';
import ImageUploader from './ImageUploader.jsx';
import ProductGallery from './ProductGallery.jsx';
import RequestPriceChangeModal from './RequestPriceChangeModal.jsx';
import RestockForm from './RestockForm.jsx';

// Material badge chip used in the header
function MetaPill({ children, variant }) {
  return (
    <span className={`detail-meta-pill detail-meta-pill--${variant ?? 'default'}`}>
      {children}
    </span>
  );
}

// A single label + value row in the product info table
function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="detail-info-row">
      <span className="detail-info-label">{label}</span>
      <span className="detail-info-value">{value}</span>
    </div>
  );
}

export default function ProductDetailModal({ product, priceMode, onClose }) {
  const [images, setImages] = useState([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState('');
  const [deletingImageId, setDeletingImageId] = useState('');
  const [note, setNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
  const [showRestockForm, setShowRestockForm] = useState(false);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const isAdmin = localStorage.getItem(adminConfig.storageKey) === 'true';

  // ── Focus management ──────────────────────────────────────
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      previousFocusRef.current?.focus();
    };
  }, []);

  // ── Data loading ──────────────────────────────────────────
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

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !showPriceRequestModal) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showPriceRequestModal]);

  // ── Body scroll lock ──────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────
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

  const activePrice = priceMode === 'W' ? product.wPrice : product.rPrice;
  const priceLabel = priceMode === 'W' ? 'W Price' : 'R Price';
  const priceBadgeClass = priceMode === 'W'
    ? 'detail-price-badge--w'
    : 'detail-price-badge--r';

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={onClose}
        aria-hidden="true"
      >
        <div
          className="product-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {/* ── Close ── */}
          <button
            ref={closeButtonRef}
            className="modal-close"
            type="button"
            aria-label="Close product detail"
            onClick={onClose}
          >
            ×
          </button>

          {/* ══ 1. HEADER ════════════════════════════════════ */}
          <div className="detail-header">
            <h2 id="product-detail-title">{product.productName}</h2>
            <div className="detail-header-meta">
              {product.sr ? (
                <span className="detail-sr-badge">SR {product.sr}</span>
              ) : null}
              {product.material && product.material !== '-' ? (
                <MetaPill variant={product.material.toLowerCase()}>
                  {product.material}
                </MetaPill>
              ) : null}
              {product.priceType ? (
                <MetaPill variant={product.priceType === 'PP' ? 'pp' : 'default'}>
                  {product.priceType}
                </MetaPill>
              ) : null}
            </div>
          </div>

          {/* ══ 2. ACTION BAR ════════════════════════════════ */}
          <div className="detail-action-bar">
            <button
              type="button"
              className={`detail-action-btn detail-action-restock${showRestockForm ? ' detail-action-btn--active' : ''}`}
              onClick={() => setShowRestockForm((v) => !v)}
              aria-expanded={showRestockForm}
            >
              <span className="detail-action-icon" aria-hidden="true">↻</span>
              Request Restock
            </button>
            <button
              type="button"
              className="detail-action-btn detail-action-price"
              onClick={() => setShowPriceRequestModal(true)}
            >
              <span className="detail-action-icon" aria-hidden="true">₹</span>
              Request Price Change
            </button>
          </div>

          {/* Inline restock form */}
          {showRestockForm ? (
            <div className="detail-restock-inline">
              <RestockForm
                product={product}
                onSubmitted={() => setShowRestockForm(false)}
              />
            </div>
          ) : null}

          {/* ══ 3. IMAGES ════════════════════════════════════ */}
          <div className="detail-images-section">
            {isLoadingImages ? (
              <div className="detail-images-loading" aria-label="Loading images" role="status">
                <span className="detail-loading-dot" />
                <span className="detail-loading-dot" />
                <span className="detail-loading-dot" />
              </div>
            ) : null}
            {imageError ? (
              <p className="form-error" role="alert">{imageError}</p>
            ) : null}

            <ProductGallery
              images={images}
              isAdmin={isAdmin}
              deletingImageId={deletingImageId}
              onDeleteImage={handleDeleteImage}
            />

            {isAdmin ? (
              <ImageUploader
                sr={product.sr}
                imageCount={images.length}
                onUploaded={loadImages}
              />
            ) : null}
          </div>

          {/* ══ 4. PRODUCT INFO ══════════════════════════════ */}
          <div className="detail-info-card">
            <div className="detail-info-header">
              <span className="detail-info-title">Product Details</span>
              {activePrice != null ? (
                <span className={`detail-price-badge ${priceBadgeClass}`}>
                  {priceLabel}: ₹{activePrice}
                </span>
              ) : null}
            </div>
            <div className="detail-info-table">
              <InfoRow label="SR No." value={product.sr} />
              <InfoRow label="Name" value={product.productName} />
              <InfoRow
                label="W Price"
                value={product.wPrice != null ? `₹${product.wPrice}` : null}
              />
              <InfoRow
                label="R Price"
                value={product.rPrice != null ? `₹${product.rPrice}` : null}
              />
              <InfoRow label="Price Type" value={product.priceType} />
              <InfoRow
                label="Material"
                value={product.material && product.material !== '-' ? product.material : null}
              />
            </div>
          </div>

          {/* ══ 5. NOTES ═════════════════════════════════════ */}
          <div className="detail-notes-card">
            <div className="detail-notes-header">
              <span className="detail-notes-title">Notes</span>
              {note.trim() ? (
                <span className="detail-notes-hint">Shared with all users</span>
              ) : null}
            </div>
            <textarea
              className="detail-notes-input"
              value={note}
              rows="3"
              placeholder="Add product notes…"
              aria-label="Product notes"
              onChange={(event) => setNote(event.target.value)}
            />
            <button
              type="button"
              className="secondary-button detail-notes-save"
              disabled={isSavingNote}
              onClick={handleSaveNote}
            >
              {isSavingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>

      {showPriceRequestModal ? (
        <RequestPriceChangeModal
          product={product}
          onClose={() => setShowPriceRequestModal(false)}
        />
      ) : null}
    </>
  );
}
