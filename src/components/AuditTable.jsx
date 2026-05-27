function formatTimestamp(value) {
  if (!value) return '-';

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function formatObject(value) {
  if (!value) return '-';

  return JSON.stringify(value, null, 2);
}

export default function AuditTable({ logs, isLoading }) {
  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>Audit Logs</h3>
        <span>Newest first</span>
      </div>
      {isLoading ? <p className="admin-muted">Loading audit logs...</p> : null}
      {!isLoading && logs.length === 0 ? <p className="admin-muted">No audit logs yet.</p> : null}
      {logs.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Timestamp</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.action}</td>
                  <td>{formatTimestamp(log.createdAt)}</td>
                  <td>
                    <pre>{formatObject(log.before)}</pre>
                  </td>
                  <td>
                    <pre>{formatObject(log.after)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
