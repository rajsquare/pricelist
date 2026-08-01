import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createProduct,
  deleteProduct,
  peekNextSr,
  resolveProductId,
  updateProduct,
} from '../services/productService.js';
import { MATERIAL_OPTIONS, validateProductInput } from '../utils/csvProducts.js';

const EMPTY_FORM = {
  productName: '',
  wPrice: '',
  rPrice: '',
  priceType: 'KG',
  material: 'Brass',
};

function productToForm(product) {
  return {
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
  const [editingSr, setEditingSr] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [nextSrPreview, setNextSrPreview] = useState('…');

  useEffect(() => {
    if (addOpen && !editingId) {
      peekNextSr()
        .then((n) => setNextSrPreview(n))
        .catch(() => setNextSrPreview('?'));
    }
  }, [addOpen, editingId]);

  const filteredProducts = useMemo(() => {
    const clean = filter.trim().toLowerCase();
    if (!clean) return [];
    return products
      .filter((p) =>
        `${p.sr} ${p.productName} ${p.material}`.toLowerCase().includes(clean),
      )
      .slice(0, 80);
  }, [filter, products]);

  function updateField(field, value) {
    setForm((cur) => ({ ...cur, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setEditingSr(null);
    setForm(EMPTY_FORM);
    setErrors([]);
  }

  async function handleStartEdit(product) {
    let productId = product.id;

    // Legacy catalog-snapshot entries can be missing `id`. Resolve the real
    // Firestore document id via sr instead of silently treating this as a
    // new product (which would create a duplicate on save).
    if (!productId) {
      try {
        productId = await resolveProductId(product);
      } catch {
        productId = null;
      }

      if (!productId) {
        toast.error("Couldn't locate this product's record. Please try again or contact support.");
        return;
      }
    }

    setEditingId(productId);
    setEditingSr(product.sr);
    setForm(productToForm(product));
    setErrors([]);
    setAddOpen(true);
    // Use requestAnimationFrame for smooth scroll after render
    requestAnimationFrame(() => {
      document.querySelector('.product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleToggleAccordion() {
    if (addOpen) {
      setAddOpen(false);
      resetForm();
    } else {
      setAddOpen(true);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const srForValidation = editingId ? editingSr : 1;
    const validation = validateProductInput({ ...form, sr: srForValidation });
    setErrors(validation.errors);
    if (validation.errors.length > 0) return;

    try {
      setIsSaving(true);
      if (editingId) {
        await updateProduct(editingId, { ...validation.product, sr: editingSr });
        toast.success('Product updated');
      } else {
        const created = await createProduct(validation.product);
        toast.success(`Product created · SR ${created.sr}`);
      }
      resetForm();
      setAddOpen(false);
      await onProductsChanged();
      peekNextSr().then(setNextSrPreview).catch(() => {});
    } catch (error) {
      toast.error(error.message || 'Product save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete "${product.productName}"? This cannot be undone.`);
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
        <h3>Products</h3>
        <span>{products.length} total</span>
      </div>

      {/* ── Collapsible Add / Edit form ── */}
      <div className="accordion">
        <button
          className={`accordion-trigger ${addOpen ? 'accordion-trigger-open' : ''}`}
          type="button"
          aria-expanded={addOpen}
          aria-controls="product-editor-form"
          onClick={handleToggleAccordion}
        >
          <span>
            {editingId ? `Editing SR ${editingSr}` : `Add Product · next SR: ${nextSrPreview}`}
          </span>
          <span className="accordion-chevron" aria-hidden="true">{addOpen ? '▲' : '▼'}</span>
        </button>

        {addOpen ? (
          <div id="product-editor-form" className="accordion-body">
            <form className="admin-form product-form" onSubmit={handleSubmit} noValidate>
              {editingId ? (
                <label className="sr-readonly-label">
                  SR No.
                  <div className="sr-readonly-value">{editingSr}</div>
                </label>
              ) : (
                <label className="sr-readonly-label">
                  SR No. (auto-assigned)
                  <div className="sr-readonly-value sr-auto">{nextSrPreview}</div>
                </label>
              )}

              <label>
                Product Name
                <input
                  value={form.productName}
                  aria-required="true"
                  onChange={(e) => updateField('productName', e.target.value)}
                />
              </label>
              <label>
                W Price
                <input
                  value={form.wPrice}
                  inputMode="decimal"
                  onChange={(e) => updateField('wPrice', e.target.value)}
                />
              </label>
              <label>
                R Price
                <input
                  value={form.rPrice}
                  inputMode="decimal"
                  onChange={(e) => updateField('rPrice', e.target.value)}
                />
              </label>
              <label>
                Price Type
                <input
                  value={form.priceType}
                  aria-required="true"
                  onChange={(e) => updateField('priceType', e.target.value)}
                />
              </label>
              <label>
                Material
                <select
                  value={form.material}
                  onChange={(e) => updateField('material', e.target.value)}
                >
                  {MATERIAL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              {errors.length > 0 ? (
                <div className="form-error" role="alert">
                  {errors.map((e) => <div key={e}>{e}</div>)}
                </div>
              ) : null}

              <div className="button-row">
                <button className="primary-button" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingId ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => { resetForm(); setAddOpen(false); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {/* ── Search-on-demand product list ── */}
      <div className="admin-list-tools">
        <label className="sr-only" htmlFor="product-editor-search">Search products to edit or delete</label>
        <input
          id="product-editor-search"
          value={filter}
          placeholder="Search products to edit or delete…"
          onChange={(e) => setFilter(e.target.value)}
          type="search"
          autoComplete="off"
        />
      </div>

      {filter.trim() && filteredProducts.length === 0 ? (
        <p className="admin-muted">No products match "{filter}".</p>
      ) : null}

      {filteredProducts.length > 0 ? (
        <div className="admin-product-list" role="list" aria-label="Product search results">
          {filteredProducts.map((product) => (
            <div className="admin-product-row" key={product.id} role="listitem">
              <div className="admin-product-info">
                <strong>{product.sr}. {product.productName}</strong>
                <span>
                  W {product.wPrice ?? '-'} · R {product.rPrice ?? '-'} · {product.priceType} · {product.material}
                </span>
              </div>
              <div className="row-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleStartEdit(product)}
                  disabled={isSaving}
                  aria-label={`Edit ${product.productName}`}
                >
                  Edit
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleDelete(product)}
                  aria-label={`Delete ${product.productName}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
