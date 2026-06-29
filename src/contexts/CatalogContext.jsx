import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase.js';
import { prepareProductsForSearch } from '../utils/searchEngine.js';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [version, setVersion] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'catalog/current'),
      (snap) => {
        if (!snap.exists()) {
          setProducts([]);
          setVersion(null);
          setUpdatedAt(null);
          setStatus('success');
          return;
        }

        const data = snap.data();
        const sorted = [...(data.products ?? [])].sort(
          (a, b) => (Number(a.sr) || 0) - (Number(b.sr) || 0),
        );
        const prepared = prepareProductsForSearch(sorted);

        setProducts(prepared);
        setVersion(data.version ?? null);
        setUpdatedAt(data.updatedAt ?? null);
        setStatus('success');
        setError(null);
      },
      (err) => {
        setError(err.message || 'Unable to load catalog.');
        setStatus('error');
      },
    );

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ products, version, updatedAt, status, error }),
    [products, version, updatedAt, status, error],
  );

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
}
