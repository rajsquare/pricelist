import { useMemo, useState } from 'react';
import MaterialFilter from '../components/MaterialFilter.jsx';
import PriceToggle from '../components/PriceToggle.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductDetailModal from '../components/ProductDetailModal.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { useCatalog } from '../contexts/CatalogContext.jsx';
import { searchProducts } from '../utils/searchEngine.js';

export default function HomePage() {
  const { products, status, error } = useCatalog();
  const [query, setQuery] = useState('');
  const [priceMode, setPriceMode] = useState('W');
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

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
        <div className="catalog-state" role="status" aria-live="polite">Loading products...</div>
      ) : null}

      {status === 'error' ? (
        <div className="catalog-state catalog-state-error" role="alert">
          <strong>Could not load products.</strong>
          <span>{error}</span>
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
        <div className="catalog-state" role="status">No matching products found.</div>
      ) : null}

      {results.length > 0 ? (
        <div className="results-list" aria-live="polite" aria-label="Search results">
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
