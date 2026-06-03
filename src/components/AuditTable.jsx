import { useState } from 'react';

const ACTION_LABELS = {
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  CSV_IMPORT_REPLACED: 'CSV Import',
};

function formatTimestamp(value) {
  if (!value) return '—';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function FieldRow({ label, value }) {
  if (value === undefined) return null;
  const display = value === null || value === '' ? '—' : String(value);
  return (
    <div className="audit-snapshot-row">
      <span className="audit-field">{label}</span>
      <span className="audit-value">{display}</span>
    </div>
  );
}

function ProductSnapshot({ data, label }) {
  if (!data) return null;

  if (typeof data.count === 'number') {
    return (
      <div className="audit-snapshot">
        <div className="audit-snapshot-label">{label}</div>
        <FieldRow label="Products" value={data.count} />
      </div>
    );
  }

  const fields = [
    { key: 'sr', label: 'SR' },
    { key: 'productName', label: 'Name' },
    { key: 'wPrice', label: 'W' },
    { key: 'rPrice', label: 'R' },
    { key: 'priceType', label: 'Type' },
    { key: 'material', label: 'Material' },
  ];

  return (
    <div className="audit-snapshot">
      <div className="audit-snapshot-label">{label}</div>
      {fields.map(({ key, label: fieldLabel }) => (
        <FieldRow key={key} label={fieldLabel} value={data[key]} />
      ))}
    </div>
  );
}

function AuditCard({ log }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
  const isUpdate = log.action === 'PRODUCT_UPDATED';
  const isCreate = log.action === 'PRODUCT_CREATED';
  const isDelete = log.action === 'PRODUCT_DELETED';
  const isCsv = log.action === 'CSV_IMPORT_REPLACED';

  const badgeClass = isUpdate
    ? 'audit-badge-update'
    : isCreate
    ? 'audit-badge-create'
    : isDelete
    ? 'audit-badge-delete'
    : 'audit-badge-csv';

  return (
    <div className="audit-card">
      <div className="audit-card-header">
        <span className={`audit-action-badge ${badgeClass}`}>{actionLabel}</span>
        <span className="audit-timestamp">{formatTimestamp(log.createdAt)}</span>
      </div>
      <div className="audit-card-body">
        {isUpdate ? (
          <div className="audit-diff">
            <ProductSnapshot data={log.before} label="Before" />
            <div className="audit-diff-arrow" aria-hidden="true">→</div>
            <ProductSnapshot data={log.after} label="After" />
          </div>
        ) : null}
        {isCreate ? <ProductSnapshot data={log.after} label="New Product" /> : null}
        {isDelete ? <ProductSnapshot data={log.before} label="Deleted" /> : null}
        {isCsv ? (
          <div className="audit-diff">
            <ProductSnapshot data={log.before} label="Removed" />
            <div className="audit-diff-arrow" aria-hidden="true">→</div>
            <ProductSnapshot data={log.after} label="Imported" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditTable({ logs, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="admin-card audit-accordion-card">
      <div className="accordion">
        <button
          className={`accordion-trigger ${isOpen ? 'accordion-trigger-open' : ''}`}
          type="button"
          aria-expanded={isOpen}
          aria-controls="audit-accordion-body"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span>Audit Log ({logs.length} events)</span>
          <span className="accordion-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen ? (
          <div
            id="audit-accordion-body"
            className="accordion-body audit-accordion-body"
            role="region"
            aria-label="Audit log entries"
          >
            {isLoading ? <p className="admin-muted">Loading...</p> : null}
            {!isLoading && logs.length === 0 ? (
              <p className="admin-muted">No audit events yet.</p>
            ) : null}
            {logs.length > 0 ? (
              <div className="audit-list">
                {logs.map((log) => (
                  <AuditCard key={log.id} log={log} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
