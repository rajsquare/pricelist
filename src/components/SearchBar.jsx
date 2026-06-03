import { useRef } from 'react';

export default function SearchBar({ query, onQueryChange, onClear }) {
  const inputRef = useRef(null);
  const hasQuery = query.trim().length > 0;

  function handleClear() {
    onClear();
    // Return focus to input after clearing
    inputRef.current?.focus();
  }

  return (
    <div className="search-wrapper" role="search">
      <label htmlFor="searchInput" className="sr-only">Search products</label>
      <input
        ref={inputRef}
        id="searchInput"
        type="search"
        value={query}
        placeholder="Search product..."
        autoComplete="off"
        aria-label="Search products"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {hasQuery ? (
        <button
          className="clear-search"
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
