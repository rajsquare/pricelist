import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createProduct, deleteProduct, updateProduct } from '../services/productService.js';
import { MATERIAL_OPTIONS, validateProductInput } from '../utils/csvProducts.js';

const EMPTY_FORM = {
  sr: '',
  productName: '',
  wPrice: '',
  rPrice: '',
  priceType: 'KG',
  material: 'Brass',
};

function productToForm(product) {
  return {
    sr: product.sr ?? '',
    productName: product.productName ?? '',
    wPrice: product.wPrice ?? '',
    rPrice: product.rPrice ?? '',
    priceType: product.priceType ?? '',
    material: product.material ?? 'Brass',
  };
}

export default function ProductEditor({ products, onProductsChanged }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const filteredProducts = useMemo(() => {
    const clean = filter.trim().toLowerCase();

    if (!clean) return products.slice(0, 80);

    return products
      .filter((product) => {
        return `${product.sr} ${product.productName} ${product.material}`.toLowerCase().includes(clean);
      })
      .slice(0, 80);
  }, [filter, products]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validateProductInput(form);

    setErrors(validation.errors);

    if (validation.errors.length > 0) return;

    try {
      setIsSaving(true);

      if (editingId) {
        await updateProduct(editingId, validation.product);
        toast.success('Product updated');
      } else {
        await createProduct(validation.product);
        toast.success('Product created');
      }

      resetForm();
      await onProductsChanged();
    } catch (error) {
      toast.error(error.message || 'Product save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete product ${product.sr}. ${product.productName}?`);

    if (!confirmed) return;

    try {
      setIsSaving(true);
      await deleteProduct(product.id);
      toast.success('Product deleted');
      if (editingId === product.id) resetForm();
      await onProductsChanged();
    } catch (error) {
      toast.error(error.message || 'Product delete failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-card product-editor">
      <div className="section-heading">
        <h3>Product CRUD</h3>
        <span>{products.length} products</span>
      </div>

      <form className="admin-form product-form" onSubmit={handleSubmit}>
        <label>
          SR
          <input value={form.sr} inputMode="numeric" onChange={(event) => updateField('sr', event.target.value)} />
        </label>
        <label>
          Product Name
          <input value={form.productName} onChange={(event) => updateField('productName', event.target.value)} />
        </label>
        <label>
          W Price
          <input value={form.wPrice} inputMode="decimal" onChange={(event) => updateField('wPrice', event.target.value)} />
        </label>
        <label>
          R Price
          <input value={form.rPrice} inputMode="decimal" onChange={(event) => updateField('rPrice', event.target.value)} />
        </label>
        <label>
          Price Type
          <input value={form.priceType} onChange={(event) => updateField('priceType', event.target.value)} />
        </label>
        <label>
          Material
          <select value={form.material} onChange={(event) => updateField('material', event.target.value)}>
            {MATERIAL_OPTIONS.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </label>

        {errors.length > 0 ? (
          <div className="form-error">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        ) : null}

        <div className="button-row">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {editingId ? 'Update Product' : 'Add Product'}
          </button>
          {editingId ? (
            <button className="secondary-button" type="button" disabled={isSaving} onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list-tools">
        <input
          value={filter}
          placeholder="Filter products..."
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>

      <div className="admin-product-list">
        {filteredProducts.map((product) => (
          <div className="admin-product-row" key={product.id}>
            <div>
              <strong>
                {product.sr}. {product.productName}
              </strong>
              <span>
                {product.wPrice ?? '-'} / {product.rPrice ?? '-'} · {product.priceType} · {product.material}
              </span>
            </div>
            <div className="row-actions">
              <button className="secondary-button" type="button" onClick={() => {
                setEditingId(product.id);
                setForm(productToForm(product));
                setErrors([]);
              }} disabled={isSaving}>
                Edit
              </button>
              <button className="danger-button" type="button" disabled={isSaving} onClick={() => handleDelete(product)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
