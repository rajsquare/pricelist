import { useState } from 'react';
import toast from 'react-hot-toast';
import { approvePriceRequest, rejectPriceRequest } from '../services/priceRequestService.js';

function formatTimestamp(value) {
  if (!value) return '—';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function PriceDiff({ label, current, requested }) {
  const changed = current !== requested;
  return (
    <div className="price-diff-row">
      <span className="price-diff-label">{label}</span>
      <span className="price-diff-current">
        {current != null ? `₹${current}` : '—'}
      </span>
      <span className="price-diff-arrow">→</span>
      <span className={`price-diff-requested ${changed ? 'price-diff-changed' : ''}`}>
        {requested != null ? `₹${requested}` : '—'}
      </span>
    </div>
  );
}

function RequestCard({ request, onApprove, onReject, isProcessing }) {
  return (
    <div className="price-req-card" aria-busy={isProcessing}>
      <div className="price-req-card-header">
        <div>
          <span className="price-req-product-name">{request.productName}</span>
          <span className="price-req-by">by {request.requestedBy}</span>
        </div>
        <span className="price-req-time">{formatTimestamp(request.createdAt)}</span>
      </div>

      <div className="price-diff-block">
        <PriceDiff
          label="W"
          current={request.currentWPrice}
          requested={request.requestedWPrice}
        />
        <PriceDiff
          label="R"
          current={request.currentRPrice}
          requested={request.requestedRPrice}
        />
      </div>

      {request.note ? (
        <p className="price-req-note">{request.note}</p>
      ) : null}

      <div className="price-req-actions">
        <button
          type="button"
          className="primary-button price-req-btn"
          disabled={isProcessing}
          onClick={() => onApprove(request)}
          aria-label={`Approve price change for ${request.productName}`}
        >
          {isProcessing ? '…' : 'Approve'}
        </button>
        <button
          type="button"
          className="danger-button price-req-btn"
          disabled={isProcessing}
          onClick={() => onReject(request.id)}
          aria-label={`Reject price change for ${request.productName}`}
        >
          {isProcessing ? '…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export default function PriceRequestQueue({ requests, onChanged }) {
  const [processingId, setProcessingId] = useState('');

  async function handleApprove(request) {
    try {
      setProcessingId(request.id);
      await approvePriceRequest(request);
      toast.success('Price approved & updated');
      await onChanged();
    } catch (error) {
      toast.error(error.message || 'Approval failed');
    } finally {
      setProcessingId('');
    }
  }

  async function handleReject(requestId) {
    try {
      setProcessingId(requestId);
      await rejectPriceRequest(requestId);
      toast.success('Request rejected');
      await onChanged();
    } catch (error) {
      toast.error(error.message || 'Reject failed');
    } finally {
      setProcessingId('');
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>Price Change Requests</h3>
        <span className={requests.length > 0 ? 'badge-pending' : ''}>
          {requests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="admin-muted">No pending price change requests.</p>
      ) : (
        <div className="price-req-list" role="list" aria-label="Price change requests">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={processingId === request.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
