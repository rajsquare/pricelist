import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCatalog } from '../contexts/CatalogContext.jsx';
import { productsToCsv } from '../utils/csvProducts.js';

export default function CSVExporter() {
  const { products } = useCatalog();
  const [isExporting, setIsExporting] = useState(false);

  function handleExport() {
    try {
      setIsExporting(true);
      const csv = productsToCsv(products);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'products-export.csv';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV export ready');
    } catch (error) {
      toast.error(error.message || 'CSV export failed');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>CSV Export</h3>
        <span>Strict schema</span>
      </div>
      <button className="secondary-button" type="button" disabled={isExporting} onClick={handleExport}>
        {isExporting ? 'Exporting...' : 'Export Products CSV'}
      </button>
    </section>
  );
}
