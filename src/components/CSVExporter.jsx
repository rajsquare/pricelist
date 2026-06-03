import toast from 'react-hot-toast';
import { productsToCsv } from '../utils/csvProducts.js';

export default function CSVExporter({ products }) {
  function handleExport() {
    try {
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
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>CSV Export</h3>
        <span>Strict schema</span>
      </div>
      <button className="secondary-button" type="button" onClick={handleExport}>
        Export Products CSV
      </button>
    </section>
  );
}
