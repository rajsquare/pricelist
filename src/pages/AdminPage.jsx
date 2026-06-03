import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AuditTable from '../components/AuditTable.jsx';
import CSVExporter from '../components/CSVExporter.jsx';
import CSVImporter from '../components/CSVImporter.jsx';
import PasswordGate from '../components/PasswordGate.jsx';
import PriceRequestQueue from '../components/PriceRequestQueue.jsx';
import ProductEditor from '../components/ProductEditor.jsx';
import RestockQueue from '../components/RestockQueue.jsx';
import { adminConfig } from '../constants/config.js';
import { fetchAuditLogs } from '../services/auditService.js';
import { fetchPendingPriceRequests } from '../services/priceRequestService.js';
import SyncButton from '../components/SyncButton.jsx';
import { fetchCatalog } from '../services/productService.js';
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
  const [priceRequests, setPriceRequests] = useState([]);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingRestock, setIsLoadingRestock] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const fetched = await fetchCatalog();
      setProducts(fetched);
    } catch (error) {
      // Propagate so caller can handle
      throw error;
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

  const loadPriceRequests = useCallback(async () => {
    const requests = await fetchPendingPriceRequests();
    setPriceRequests(requests);
  }, []);

  const refreshAdminData = useCallback(async () => {
    setLoadError('');
    try {
      await Promise.all([
        loadProducts(),
        loadAuditLogs(),
        loadRestockRequests(),
        loadPriceRequests(),
      ]);
    } catch (error) {
      setLoadError(error.message || 'Unable to load admin data.');
    }
  }, [loadAuditLogs, loadProducts, loadRestockRequests, loadPriceRequests]);

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
    setActiveRequests([]);
    setCompletedRequests([]);
    setPriceRequests([]);
    toast.success('Logged out');
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <section className="admin-page">
      {/* ── Toolbar ── */}
      <div className="admin-toolbar">
        <div>
          <h2>Admin</h2>
          <p>Inventory management</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <SyncButton />
          <button className="danger-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="form-error" role="alert">{loadError}</div>
      ) : null}

      {/* ── 1. Price Change Requests (highest priority) ── */}
      <PriceRequestQueue requests={priceRequests} onChanged={loadPriceRequests} />

      {/* ── 2. Restock Queue ── */}
      <RestockQueue
        activeRequests={activeRequests}
        completedRequests={completedRequests}
        isLoading={isLoadingRestock}
        onChanged={loadRestockRequests}
      />

      {/* ── 3. Product Management ── */}
      {isLoadingProducts ? (
        <div className="admin-card admin-muted" style={{ padding: '14px' }}>
          Loading products...
        </div>
      ) : null}

      <ProductEditor products={products} onProductsChanged={handleProductsChanged} />

      {/* ── 4. CSV tools ── */}
      <div className="admin-grid">
        <CSVImporter onImported={handleProductsChanged} />
        <CSVExporter />
      </div>

      {/* ── 5. Audit Log (collapsible, lowest priority) ── */}
      <AuditTable logs={auditLogs} isLoading={isLoadingAudit} />
    </section>
  );
}
