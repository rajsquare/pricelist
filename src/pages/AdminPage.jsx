import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AuditTable from '../components/AuditTable.jsx';
import CSVExporter from '../components/CSVExporter.jsx';
import CSVImporter from '../components/CSVImporter.jsx';
import PasswordGate from '../components/PasswordGate.jsx';
import ProductEditor from '../components/ProductEditor.jsx';
import RestockQueue from '../components/RestockQueue.jsx';
import { adminConfig } from '../constants/config.js';
import { fetchAuditLogs } from '../services/auditService.js';
import { fetchProducts } from '../services/productService.js';
import { fetchRestockRequests } from '../services/restockService.js';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(adminConfig.storageKey) === 'true',
  );
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingRestock, setIsLoadingRestock] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const fetchedProducts = await fetchProducts();
      setProducts(fetchedProducts);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoadingAudit(true);
      const fetchedLogs = await fetchAuditLogs();
      setAuditLogs(fetchedLogs);
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  const loadRestockRequests = useCallback(async () => {
    try {
      setIsLoadingRestock(true);
      const fetchedRequests = await fetchRestockRequests();
      setRestockRequests(fetchedRequests);
    } finally {
      setIsLoadingRestock(false);
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    setLoadError('');

    try {
      await Promise.all([loadProducts(), loadAuditLogs(), loadRestockRequests()]);
    } catch (error) {
      setLoadError(error.message || 'Unable to load admin data.');
    }
  }, [loadAuditLogs, loadProducts, loadRestockRequests]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAdminData();
    }
  }, [isAuthenticated, refreshAdminData]);

  async function handleProductsChanged() {
    await Promise.all([loadProducts(), loadAuditLogs()]);
  }

  function handleLogout() {
    localStorage.removeItem(adminConfig.storageKey);
    setIsAuthenticated(false);
    setProducts([]);
    setAuditLogs([]);
    setRestockRequests([]);
    toast.success('Logged out');
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <section className="admin-page">
      <div className="admin-toolbar">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Frontend-only admin session</p>
        </div>
        <button className="danger-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loadError ? <div className="form-error">{loadError}</div> : null}
      {isLoadingProducts ? <div className="admin-card admin-muted">Loading products...</div> : null}

      <ProductEditor products={products} onProductsChanged={handleProductsChanged} />

      <div className="admin-grid">
        <CSVImporter onImported={handleProductsChanged} />
        <CSVExporter />
      </div>

      <AuditTable logs={auditLogs} isLoading={isLoadingAudit} />
      <RestockQueue requests={restockRequests} isLoading={isLoadingRestock} />
    </section>
  );
}
