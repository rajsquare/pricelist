export default function SearchBar({ query, onQueryChange, onClear }) {
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-wrapper">
      <input
        id="searchInput"
        type="text"
        value={query}
        placeholder="Search product..."
        autoComplete="off"
        onChange={(event) => onQueryChange(event.target.value)}
      />
      {hasQuery ? (
        <button
          className="clear-search"
          type="button"
          aria-label="Clear search"
          onClick={onClear}
        >
          <span aria-hidden="true">x</span>
        </button>
      ) : null}
    </div>
  );
}
