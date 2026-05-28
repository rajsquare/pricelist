import { useState } from 'react';
import toast from 'react-hot-toast';

import {
  approvePriceRequest,
  rejectPriceRequest,
} from '../services/priceRequestService.js';

export default function PriceRequestQueue({
  requests,
  onChanged,
}) {
  const [processingId, setProcessingId] =
    useState('');

  async function handleApprove(request) {
    try {
      setProcessingId(request.id);

      await approvePriceRequest(request);

      toast.success(
        'Price request approved',
      );

      await onChanged();
    } catch (error) {
      console.error(error);

      toast.error(
        'Approval failed',
      );
    } finally {
      setProcessingId('');
    }
  }

  async function handleReject(requestId) {
    try {
      setProcessingId(requestId);

      await rejectPriceRequest(requestId);

      toast.success(
        'Request rejected',
      );

      await onChanged();
    } catch (error) {
      console.error(error);

      toast.error(
        'Reject failed',
      );
    } finally {
      setProcessingId('');
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>
          Price Change Requests
        </h3>

        <span>
          {requests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="admin-muted">
          No pending requests
        </p>
      ) : null}

      {requests.map(request => (
        <div
          key={request.id}
          className="restock-item"
        >
          <div>
            <strong>
              {request.productName}
            </strong>

            <p>
              Current W:
              {' '}
              ₹
              {request.currentWPrice}
              {' | '}
              Requested W:
              {' '}
              ₹
              {request.requestedWPrice}
            </p>

            <p>
              Current R:
              {' '}
              ₹
              {request.currentRPrice}
              {' | '}
              Requested R:
              {' '}
              ₹
              {request.requestedRPrice}
            </p>

            <p>
              Requested By:
              {' '}
              {request.requestedBy}
            </p>

            {request.note ? (
              <p>
                Note:
                {' '}
                {request.note}
              </p>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            <button
              type="button"
              className="admin-button"
              disabled={
                processingId === request.id
              }
              onClick={() =>
                handleApprove(request)
              }
            >
              Approve
            </button>

            <button
              type="button"
              className="danger-button"
              disabled={
                processingId === request.id
              }
              onClick={() =>
                handleReject(request.id)
              }
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
