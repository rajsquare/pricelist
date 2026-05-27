import { useState } from 'react';
import toast from 'react-hot-toast';
import { replaceAllProducts } from '../services/productService.js';
import { parseProductsCsv } from '../utils/csvProducts.js';

export default function CSVImporter({ onImported }) {
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setStatus('');

    if (!file) {
      setFileName('');
      return;
    }

    setFileName(file.name);

    try {
      const csvText = await file.text();
      const products = parseProductsCsv(csvText);
      const confirmed = window.confirm(
        `This will delete all existing products and import ${products.length} CSV rows. Continue?`,
      );

      if (!confirmed) {
        setStatus('Import cancelled.');
        event.target.value = '';
        return;
      }

      setIsImporting(true);
      const result = await replaceAllProducts(products);

      setStatus(`Import complete. Deleted ${result.deleted}, inserted ${result.inserted}.`);
      toast.success('CSV import complete');
      onImported();
    } catch (error) {
      setStatus(error.message || 'CSV import failed.');
      toast.error('CSV import failed');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  }

  return (
    <section className="admin-card">
      <div className="section-heading">
        <h3>CSV Import</h3>
        <span>Full replacement</span>
      </div>
      <label className="file-control">
        Upload strict product CSV
        <input type="file" accept=".csv,text/csv" disabled={isImporting} onChange={handleFileChange} />
      </label>
      {fileName ? <p className="admin-muted">Selected: {fileName}</p> : null}
      {status ? <p className="admin-status">{status}</p> : null}
      {isImporting ? <p className="admin-muted">Replacing products...</p> : null}
    </section>
  );
}
