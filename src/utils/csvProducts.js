import Papa from 'papaparse';

export const CSV_HEADERS = ['sr', 'productName', 'wPrice', 'priceType', 'rPrice', 'Material'];
export const MATERIAL_OPTIONS = ['Brass', 'Copper', 'Kansa'];

function normalizeMaterial(value) {
  const trimmed = String(value ?? '').trim();

  if (trimmed === '' || trimmed === '-') {
    return '-';
  }

  const lower = trimmed.toLowerCase();

  if (lower === 'brass') return 'Brass';
  if (lower === 'copper') return 'Copper';
  if (lower === 'kansa') return 'Kansa';

  return '__INVALID__';
}

export function parsePrice(value) {
  const trimmed = String(value ?? '').trim();

  if (trimmed === '' || trimmed === '-') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validateProductInput(product) {
  const errors = [];
  const srValue = String(product.sr ?? '').trim();
  const sr = Number(srValue);
  const wPrice = parsePrice(product.wPrice);
  const rPrice = parsePrice(product.rPrice);
  const material = normalizeMaterial(product.material);

  if (!srValue) errors.push('Serial number is required.');
  if (srValue && !Number.isFinite(sr)) errors.push('Serial number must be numeric.');
  if (!String(product.productName ?? '').trim()) errors.push('Product name is required.');
  if (!String(product.priceType ?? '').trim()) errors.push('Price type is required.');

  if (material === '__INVALID__') {
    errors.push('Material must be Brass, Copper, Kansa, "-", or blank.');
  }

  if (Number.isNaN(wPrice)) errors.push('Wholesale price must be numeric, "-", or blank.');
  if (Number.isNaN(rPrice)) errors.push('Retail price must be numeric, "-", or blank.');

  return {
    errors,
    product: {
      sr,
      productName: String(product.productName ?? '').trim(),
      wPrice,
      rPrice,
      priceType: String(product.priceType ?? '').trim(),
      material,
    },
  };
}

function getHeaders(csvText) {
  const firstLine = csvText.split(/\r?\n/, 1)[0];
  const parsed = Papa.parse(firstLine, {
    header: false,
    skipEmptyLines: false,
  });

  return (parsed.data[0] ?? []).map((header) => String(header).trim());
}

export function parseProductsCsv(csvText) {
  const headers = getHeaders(csvText);
  const headersMatch =
    headers.length === CSV_HEADERS.length &&
    CSV_HEADERS.every((header, index) => headers[index] === header);

  if (!headersMatch) {
    throw new Error(
      `Invalid CSV headers. Expected "${CSV_HEADERS.join(',')}" but received "${headers.join(',')}".`,
    );
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join(' '));
  }

  const invalidRows = [];
  const products = [];

  parsed.data.forEach((row, index) => {
    const { errors, product } = validateProductInput({
      sr: row.sr,
      productName: row.productName,
      wPrice: row.wPrice,
      rPrice: row.rPrice,
      priceType: row.priceType,
      material: row.Material,
    });

    if (errors.length > 0) {
      invalidRows.push({
        row: index + 2,
        errors,
      });
      return;
    }

    products.push(product);
  });

  if (invalidRows.length > 0) {
    throw new Error(`Invalid rows found: ${JSON.stringify(invalidRows)}`);
  }

  return products;
}

export function productsToCsv(products) {
  return Papa.unparse({
    fields: CSV_HEADERS,
    data: products.map((product) => ({
      sr: product.sr,
      productName: product.productName,
      wPrice: product.wPrice ?? '',
      priceType: product.priceType,
      rPrice: product.rPrice ?? '',
      Material: product.material === '-' ? '' : product.material,
    })),
  });
}