import { memo } from 'react';

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '-';
  return value;
}

function getMaterialClass(material) {
  if (material === 'Brass') return 'material-brass';
  if (material === 'Copper') return 'material-copper';
  if (material === 'Kansa') return 'material-kansa';
  return '';
}

const ProductCard = memo(function ProductCard({ product, priceMode, onOpen }) {
  const activePrice = priceMode === 'W' ? product.wPrice : product.rPrice;
  const priceClass = priceMode === 'W' ? 'price-w-full' : 'price-r-full';
  const materialClass = getMaterialClass(product.material);

  function handleOpen() {
    onOpen(product);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(product);
    }
  }

  return (
    <article
      className="product-card product-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`${product.productName}, SR ${product.sr}`}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="product-title">
        {product.sr}. {product.productName}
      </div>

      <div className="price-row">
        <div className={priceClass}>{formatPrice(activePrice)}</div>
      </div>

      <div className="bottom-row">
        <div className="meta-row">
          <div className={`unit ${product.priceType === 'PP' ? 'unit-pp' : ''}`}>
            {product.priceType || ''}
          </div>

          {product.material && product.material !== '-' ? (
            <div className={`unit material-badge ${materialClass}`}>{product.material}</div>
          ) : null}
        </div>
      </div>
    </article>
  );
});

export default ProductCard;
