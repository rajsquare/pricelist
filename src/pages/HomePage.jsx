import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import MaterialFilter from '../components/MaterialFilter.jsx';
import PriceToggle from '../components/PriceToggle.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductDetailModal from '../components/ProductDetailModal.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { fetchCatalogWithCache } from '../services/productService.js';
import { onSyncSignalChange } from '../services/syncService.js';
import { prepareProductsForSearch, searchProducts } from '../utils/searchEngine.js';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [priceMode, setPriceMode] = useState('W');
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const isFirstCallback = useRef(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setStatus('loading');
        const fetchedProducts = await fetchCatalogWithCache();

        if (!isMounted) return;

        setProducts(prepareProductsForSearch(fetchedProducts));
        setStatus('success');
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(error.message || 'Unable to load products.');
        setStatus('error');
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSyncSignalChange(async () => {
      if (isFirstCallback.current) {
        isFirstCallback.current = false;
        return;
      }
      localStorage.removeItem('pricelist_catalog_cache');
      const freshProducts = await fetchCatalogWithCache();
      setProducts(prepareProductsForSearch(freshProducts));
      toast('Prices updated', { icon: '\u{1F504}' });
    });

    return unsubscribe;
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
