import { useState } from 'react';
import toast from 'react-hot-toast';

import {
  submitPriceChangeRequest,
} from '../services/priceRequestService.js';

export default function RequestPriceChangeModal({
  product,
  onClose,
}) {
  const [requestedWPrice, setRequestedWPrice] =
    useState(product.wPrice || '');

  const [requestedRPrice, setRequestedRPrice] =
    useState(product.rPrice || '');

  const [requestedBy, setRequestedBy] =
    useState('');

  const [note, setNote] =
    useState('');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      await submitPriceChangeRequest({
        product,
        requestedWPrice,
        requestedRPrice,
        requestedBy,
        note,
      });

      toast.success(
        'Price change request submitted',
      );

      onClose();
    } catch (error) {
      console.error(error);

      toast.error(
        'Failed to submit request',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Request Price Change</h3>

        <p>
          {product.productName}
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Requested W Price
          </label>

          <input
            type="number"
            value={requestedWPrice}
            onChange={e =>
              setRequestedWPrice(
                e.target.value,
              )
            }
            required
          />

          <label>
            Requested R Price
          </label>

          <input
            type="number"
            value={requestedRPrice}
            onChange={e =>
              setRequestedRPrice(
                e.target.value,
              )
            }
            required
          />

          <label>
            Requested By
          </label>

          <input
            type="text"
            value={requestedBy}
            onChange={e =>
              setRequestedBy(
                e.target.value,
              )
            }
            required
          />

          <label>
            Reason / Note
          </label>

          <textarea
            value={note}
            onChange={e =>
              setNote(
                e.target.value,
              )
            }
          />

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '16px',
            }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
            >
              Submit Request
            </button>

            <button
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
