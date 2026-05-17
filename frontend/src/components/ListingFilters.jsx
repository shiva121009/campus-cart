import "./ListingFilters.css";

function ListingFilters({ sort, minPrice, maxPrice, onChange, onApply }) {
  return (
    <div className="listing-filters">
      <select
        value={sort}
        onChange={(e) => onChange({ sort: e.target.value })}
        className="listing-filters-select"
        aria-label="Sort by"
      >
        <option value="newest">Newest</option>
        <option value="price_low">Price: low to high</option>
        <option value="price_high">Price: high to low</option>
        <option value="popular">Most viewed</option>
      </select>
      <input
        type="number"
        min="0"
        placeholder="Min ₹"
        value={minPrice}
        onChange={(e) => onChange({ minPrice: e.target.value })}
        className="listing-filters-input"
        aria-label="Minimum price"
      />
      <input
        type="number"
        min="0"
        placeholder="Max ₹"
        value={maxPrice}
        onChange={(e) => onChange({ maxPrice: e.target.value })}
        className="listing-filters-input"
        aria-label="Maximum price"
      />
      <button type="button" className="listing-filters-apply" onClick={onApply}>
        Apply
      </button>
    </div>
  );
}

export default ListingFilters;
