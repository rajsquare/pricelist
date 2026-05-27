function formatTimestamp(value) {
  if (!value) return '-';

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export default function RestockQueue({ requests, isLoading }) {
  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>Restock Queue</h3>
        <span>Read only</span>
      </div>
      {isLoading ? <p className="admin-muted">Loading restock requests...</p> : null}
      {!isLoading && requests.length === 0 ? <p className="admin-muted">No restock requests.</p> : null}
      {requests.length > 0 ? (
        <div className="admin-product-list">
          {requests.map((request) => (
            <div className="admin-product-row" key={request.id}>
              <div>
                <strong>
                  {request.sr ?? '-'} · {request.productName ?? '-'}
                </strong>
                <span>{request.note || 'No note'}</span>
              </div>
              <span className="admin-muted">{formatTimestamp(request.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
