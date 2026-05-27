import { useState } from 'react';
import toast from 'react-hot-toast';
import { createRestockRequest } from '../services/restockService.js';

export default function RestockForm({ product, onSubmitted }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedNote = note.trim();

    if (!trimmedNote) {
      setError('Note is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await createRestockRequest({
        sr: product.sr,
        productName: product.productName,
        note: trimmedNote,
      });
      setNote('');
      toast.success('Restock request submitted');
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError.message || 'Restock request failed.');
      toast.error('Restock request failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="detail-section">
      <div className="section-heading">
        <h3>Request Restock</h3>
        <span>Public submission</span>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Note
          <textarea
            value={note}
            rows="3"
            placeholder="Size, quantity, or other details"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={isSubmitting || !note.trim()}>
          {isSubmitting ? 'Submitting...' : 'Submit Restock Request'}
        </button>
      </form>
    </section>
  );
}
