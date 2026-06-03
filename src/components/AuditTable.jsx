const ACTION_LABELS = {
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  CSV_IMPORT_REPLACED: 'CSV Import',
};

function formatTimestamp(value) {
  if (!value) return '-';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function ProductSnapshot({ data, label }) {
  if (!data) return null;

  // CSV import events store { count } — render a simple summary
  if (typeof data.count === 'number') {
    return (
      <div className="audit-snapshot">
        <div className="audit-snapshot-label">{label}</div>
        <div className="audit-snapshot-row">
          <span className="audit-field">Products</span>
          <span className="audit-value">{data.count}</span>
        </div>
      </div>
    );
  }

  const fields = [
    { key: 'sr', label: 'SR No.' },
    { key: 'productName', label: 'Product Name' },
    { key: 'wPrice', label: 'W Price' },
    { key: 'rPrice', label: 'R Price' },
    { key: 'priceType', label: 'Price Type' },
    { key: 'material', label: 'Material' },
  ];

  return (
    <div className="audit-snapshot">
      <div className="audit-snapshot-label">{label}</div>
      {fields.map(({ key, label: fieldLabel }) => {
        const val = data[key];
        if (val === undefined) return null;
        return (
          <div className="audit-snapshot-row" key={key}>
            <span className="audit-field">{fieldLabel}</span>
            <span className="audit-value">{val === null || val === '' ? '—' : String(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

function AuditCard({ log }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
  const isUpdate = log.action === 'PRODUCT_UPDATED';
  const isCreate = log.action === 'PRODUCT_CREATED';
  const isDelete = log.action === 'PRODUCT_DELETED';
  const isCsv = log.action === 'CSV_IMPORT_REPLACED';

  return (
    <div className={`audit-card audit-card-${log.action.toLowerCase().replace(/_/g, '-')}`}>
      <div className="audit-card-header">
        <span className="audit-action-badge">{actionLabel}</span>
        <span className="audit-timestamp">{formatTimestamp(log.createdAt)}</span>
      </div>

      <div className="audit-card-body">
        {isUpdate ? (
          <div className="audit-diff">
            <ProductSnapshot data={log.before} label="Before" />
            <div className="audit-diff-arrow">→</div>
            <ProductSnapshot data={log.after} label="After" />
          </div>
        ) : null}

        {isCreate ? <ProductSnapshot data={log.after} label="New Product" /> : null}
        {isDelete ? <ProductSnapshot data={log.before} label="Deleted Product" /> : null}

        {isCsv ? (
          <div className="audit-diff">
            <ProductSnapshot data={log.before} label="Removed" />
            <div className="audit-diff-arrow">→</div>
            <ProductSnapshot data={log.after} label="Imported" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditTable({ logs, isLoading }) {
  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>Audit Log</h3>
        <span>Last 50 events</span>
      </div>
      {isLoading ? <p className="admin-muted">Loading...</p> : null}
      {!isLoading && logs.length === 0 ? <p className="admin-muted">No audit events yet.</p> : null}
      {logs.length > 0 ? (
        <div className="audit-list">
          {logs.map((log) => <AuditCard key={log.id} log={log} />)}
        </div>
      ) : null}
    </section>
  );
}
