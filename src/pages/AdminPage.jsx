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
import {
  fetchActiveRestockRequests,
  fetchCompletedRestockRequests,
} from '../services/restockService.js';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(adminConfig.storageKey) === 'true',
  );
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingRestock, setIsLoadingRestock] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      setProducts(await fetchProducts());
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      setIsLoadingAudit(true);
      setAuditLogs(await fetchAuditLogs());
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  const loadRestockRequests = useCallback(async () => {
    try {
      setIsLoadingRestock(true);
      const [active, completed] = await Promise.all([
        fetchActiveRestockRequests(),
        fetchCompletedRestockRequests(),
      ]);
      setActiveRequests(active);
      setCompletedRequests(completed);
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
    if (isAuthenticated) refreshAdminData();
  }, [isAuthenticated, refreshAdminData]);

  async function handleProductsChanged() {
    await Promise.all([loadProducts(), loadAuditLogs()]);
  }

  function handleLogout() {
    localStorage.removeItem(adminConfig.storageKey);
    setIsAuthenticated(false);
    setProducts([]);
    setAuditLogs([]);
    setActiveRequests([]);
    setCompletedRequests([]);
    toast.success('Logged out');
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <section className="admin-page">
      <div className="admin-toolbar">
        <div>
          <h2>Admin</h2>
          <p>Inventory management</p>
        </div>
        <button className="danger-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loadError ? <div className="form-error">{loadError}</div> : null}
      {isLoadingProducts ? (
        <div className="admin-card admin-muted" style={{ padding: '14px' }}>
          Loading products...
        </div>
      ) : null}

      <ProductEditor products={products} onProductsChanged={handleProductsChanged} />

      <div className="admin-grid">
        <CSVImporter onImported={handleProductsChanged} />
        <CSVExporter />
      </div>

      <AuditTable logs={auditLogs} isLoading={isLoadingAudit} />

      <RestockQueue
        activeRequests={activeRequests}
        completedRequests={completedRequests}
        isLoading={isLoadingRestock}
        onChanged={loadRestockRequests}
      />
    </section>
  );
}
