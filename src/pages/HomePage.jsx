import { useEffect, useMemo, useRef, useState } from 'react';
import MaterialFilter from '../components/MaterialFilter.jsx';
import PriceToggle from '../components/PriceToggle.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductDetailModal from '../components/ProductDetailModal.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { fetchCatalogWithCache } from '../services/productService.js';
import { subscribeToCatalogUpdates } from '../services/syncService.js';
import { prepareProductsForSearch, searchProducts } from '../utils/searchEngine.js';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [priceMode, setPriceMode] = useState('W');
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Track whether initial load is done — ignore the first onSnapshot
  // event that fires immediately on subscription (it would duplicate
  // the initial fetch and waste a render).
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setStatus('loading');
        const fetchedProducts = await fetchCatalogWithCache();

        if (!isMounted) return;

        setProducts(prepareProductsForSearch(fetchedProducts));
        setStatus('success');
        initialLoadDone.current = true;
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(error.message || 'Unable to load products.');
        setStatus('error');
      }
    }

    loadProducts();

    // Subscribe to real-time catalog updates pushed by the admin Sync button.
    // The onSnapshot callback delivers the full updated catalog payload — zero
    // extra Firestore reads on the client side.
    const unsubscribe = subscribeToCatalogUpdates((freshProducts) => {
      if (!isMounted) return;

      // Skip the first snapshot event that fires on initial subscription
      // if the manual fetch hasn't completed yet — it will arrive shortly
      // and is handled above.
      if (!initialLoadDone.current) return;

      console.info(`[HomePage] Received sync update — refreshing ${freshProducts.length} products.`);
      setProducts(prepareProductsForSearch(freshProducts));
      setStatus('success');
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const results = useMemo(
    () => searchProducts(products, query, activeMaterial),
    [products, query, activeMaterial],
  );

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery);

    if (!nextQuery.trim()) {
      setActiveMaterial(null);
    }
  }

  function handleClearSearch() {
    setQuery('');
    setActiveMaterial(null);
  }

  const hasQuery = query.trim().length > 0;
  const showNoMatches = status === 'success' && hasQuery && results.length === 0;

  return (
    <section className="catalog-page">
      <div className="search-container">
        <div className="catalog-header-row">
          <PriceToggle mode={priceMode} onModeChange={setPriceMode} />
        </div>

        <SearchBar query={query} onQueryChange={handleQueryChange} onClear={handleClearSearch} />

        <MaterialFilter
          activeMaterial={activeMaterial}
          isVisible={hasQuery}
          onMaterialChange={setActiveMaterial}
        />
      </div>

      {status === 'loading' ? (
        <div className="catalog-state">Loading products...</div>
      ) : null}

      {status === 'error' ? (
        <div className="catalog-state catalog-state-error">
          <strong>Could not load products.</strong>
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {status === 'success' && products.length === 0 ? (
        <div className="catalog-state">No products available.</div>
      ) : null}

      {status === 'success' && !hasQuery && products.length > 0 ? (
        <div className="catalog-state">
          <strong>{products.length} products loaded.</strong>
          <span>Search to view matching products.</span>
        </div>
      ) : null}

      {showNoMatches ? (
        <div className="catalog-state">No matching products found.</div>
      ) : null}

      {results.length > 0 ? (
        <div className="results-list" aria-live="polite">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              priceMode={priceMode}
              onOpen={setSelectedProduct}
            />
          ))}
        </div>
      ) : null}

      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          priceMode={priceMode}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </section>
  );
}
