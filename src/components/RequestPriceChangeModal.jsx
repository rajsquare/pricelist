import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { submitPriceChangeRequest } from '../services/priceRequestService.js';

function parseNumericInput(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return NaN;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

export default function RequestPriceChangeModal({ product, onClose }) {
  const [requestedWPrice, setRequestedWPrice] = useState(
    product.wPrice != null ? String(product.wPrice) : '',
  );
  const [requestedRPrice, setRequestedRPrice] = useState(
    product.rPrice != null ? String(product.rPrice) : '',
  );
  const [requestedBy, setRequestedBy] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function validate() {
    const errs = [];
    if (Number.isNaN(parseNumericInput(requestedWPrice)))
      errs.push('W Price must be a valid number.');
    if (Number.isNaN(parseNumericInput(requestedRPrice)))
      errs.push('R Price must be a valid number.');
    if (!requestedBy.trim()) errs.push('Requested By is required.');
    return errs;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;

    try {
      setIsSubmitting(true);
      await submitPriceChangeRequest({
        product,
        requestedWPrice: parseNumericInput(requestedWPrice),
        requestedRPrice: parseNumericInput(requestedRPrice),
        requestedBy,
        note,
      });
      toast.success('Price change request submitted');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop price-request-backdrop"
      role="presentation"
      onMouseDown={onClose}
      aria-hidden="true"
    >
      <div
        className="price-request-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-request-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="price-request-header">
          <div>
            <h3 id="price-request-title">Request Price Change</h3>
            <p className="price-request-subtitle">{product.productName}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="modal-close"
            type="button"
            aria-label="Close price request"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="price-request-current">
          <span className="price-req-label">Current</span>
          <span className="price-req-pair">
            W: <strong>{product.wPrice ?? '—'}</strong>
          </span>
          <span className="price-req-sep">·</span>
          <span className="price-req-pair">
            R: <strong>{product.rPrice ?? '—'}</strong>
          </span>
        </div>

        <form className="price-request-form" onSubmit={handleSubmit} noValidate>
          <div className="price-req-row">
            <label className="price-req-field">
              <span>Requested W Price</span>
              <input
                type="number"
                step="any"
                value={requestedWPrice}
                inputMode="decimal"
                aria-required="true"
                onChange={(e) => setRequestedWPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </label>
            <label className="price-req-field">
              <span>Requested R Price</span>
              <input
                type="number"
                step="any"
                value={requestedRPrice}
                inputMode="decimal"
                aria-required="true"
                onChange={(e) => setRequestedRPrice(e.target.value)}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className="price-req-field">
            <span>Requested By</span>
            <input
              type="text"
              value={requestedBy}
              placeholder="Your name"
              aria-required="true"
              onChange={(e) => setRequestedBy(e.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="price-req-field">
            <span>Reason / Note <em className="price-req-optional">(optional)</em></span>
            <textarea
              value={note}
              rows={3}
              placeholder="Reason for price change..."
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </label>

          {errors.length > 0 ? (
            <div className="form-error" role="alert">
              {errors.map((e) => <div key={e}>{e}</div>)}
            </div>
          ) : null}

          <div className="price-request-footer">
            <button
              type="submit"
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
