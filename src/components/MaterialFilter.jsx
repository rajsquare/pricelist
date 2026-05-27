import { MATERIAL_FILTERS } from '../utils/searchEngine.js';

export default function MaterialFilter({ activeMaterial, isVisible, onMaterialChange }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="material-filter">
      <div className="filter-label">Filter by material</div>
      <div className="filter-buttons">
        {MATERIAL_FILTERS.map((material) => {
          const isActive = activeMaterial === material;

          return (
            <button
              key={material}
              className={`filter-btn ${isActive ? `active-${material.toLowerCase()}` : ''}`}
              type="button"
              onClick={() => onMaterialChange(isActive ? null : material)}
            >
              {material}
            </button>
          );
        })}
      </div>
    </div>
  );
}
