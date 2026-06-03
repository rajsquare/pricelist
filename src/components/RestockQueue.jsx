import { useState } from 'react';
import toast from 'react-hot-toast';
import { completeRestockRequest, deleteRestockRequest } from '../services/restockService.js';

function formatTimestamp(value) {
  if (!value) return '-';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function ActiveItem({ request, onComplete }) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete() {
    try {
      setCompleting(true);
      await onComplete(request.id);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="restock-item restock-item-active">
      <div className="restock-item-main">
        <div className="restock-sr-name">
          <span className="restock-sr">SR {request.sr ?? '-'}</span>
          <span className="restock-name">{request.productName ?? '-'}</span>
        </div>
        <p className="restock-note">{request.note || 'No note'}</p>
        <span className="restock-timestamp">{formatTimestamp(request.createdAt)}</span>
      </div>
      <button
        className="restock-complete-btn"
        type="button"
        title="Mark as completed"
        disabled={completing}
        onClick={handleComplete}
      >
        {completing ? '…' : '✓'}
      </button>
    </div>
  );
}

function CompletedItem({ request, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm('Delete this completed restock request permanently?');
    if (!confirmed) return;
    try {
      setDeleting(true);
      await onDelete(request.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="restock-item restock-item-completed">
      <div className="restock-item-main">
        <div className="restock-sr-name">
          <span className="restock-sr">SR {request.sr ?? '-'}</span>
          <span className="restock-name">{request.productName ?? '-'}</span>
        </div>
        <p className="restock-note restock-note-muted">{request.note || 'No note'}</p>
        <div className="restock-timestamps">
          <span className="restock-timestamp">Requested: {formatTimestamp(request.createdAt)}</span>
          {request.completedAt ? (
            <span className="restock-timestamp">Completed: {formatTimestamp(request.completedAt)}</span>
          ) : null}
        </div>
      </div>
      <button
        className="restock-delete-btn"
        type="button"
        title="Delete permanently"
        disabled={deleting}
        onClick={handleDelete}
      >
        {deleting ? '…' : '🗑'}
      </button>
    </div>
  );
}

export default function RestockQueue({ activeRequests, completedRequests, isLoading, onChanged }) {
  async function handleComplete(id) {
    try {
      await completeRestockRequest(id);
      toast.success('Marked as completed');
      onChanged();
    } catch (error) {
      toast.error(error.message || 'Could not complete request');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteRestockRequest(id);
      toast.success('Request deleted');
      onChanged();
    } catch (error) {
      toast.error(error.message || 'Could not delete request');
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>Restock Queue</h3>
        <span>{activeRequests.length} pending</span>
      </div>

      {isLoading ? <p className="admin-muted">Loading...</p> : null}

      {!isLoading && activeRequests.length === 0 ? (
        <p className="admin-muted">No pending restock requests.</p>
      ) : null}

      {activeRequests.length > 0 ? (
        <div className="restock-list">
          {activeRequests.map((r) => (
            <ActiveItem key={r.id} request={r} onComplete={handleComplete} />
          ))}
        </div>
      ) : null}

      {completedRequests.length > 0 ? (
        <>
          <div className="section-heading" style={{ marginTop: '8px' }}>
            <h3>Completed</h3>
            <span>{completedRequests.length} items</span>
          </div>
          <div className="restock-list">
            {completedRequests.map((r) => (
              <CompletedItem key={r.id} request={r} onDelete={handleDelete} />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
