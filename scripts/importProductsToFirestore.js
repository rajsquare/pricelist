import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import Papa from 'papaparse';
import { initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/constants/config.js';

const CSV_FILE = path.resolve('master-products.csv');
const COLLECTION_NAME = 'products';
const EXPECTED_HEADERS = ['sr', 'productName', 'wPrice', 'priceType', 'rPrice', 'Material'];
const BATCH_LIMIT = 450;

function parseNumberOrNull(value) {
  const trimmed = String(value ?? '').trim();

  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateHeaders(csvText) {
  const firstLine = csvText.split(/\r?\n/, 1)[0];
  const parsedHeader = Papa.parse(firstLine, {
    header: false,
    skipEmptyLines: false,
  }).data[0].map((header) => String(header).trim());

  const matches =
    parsedHeader.length === EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((header, index) => parsedHeader[index] === header);

  if (!matches) {
    throw new Error(
      [
        'CSV header validation failed.',
        `Expected: ${EXPECTED_HEADERS.join(',')}`,
        `Received: ${parsedHeader.join(',')}`,
        'Firestore was not modified.',
      ].join('\n'),
    );
  }
}

function parseProducts(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === 'string' ? value.trim() : value),
  });

  if (parsed.errors.length > 0) {
    throw new Error(
      [
        'CSV parse failed.',
        ...parsed.errors.map((error) => `Row ${error.row ?? 'unknown'}: ${error.message}`),
      ].join('\n'),
    );
  }

  const invalidRows = [];
  const products = [];

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2;
    const sr = Number(String(row.sr ?? '').trim());
    const wPrice = parseNumberOrNull(row.wPrice);
    const rPrice = parseNumberOrNull(row.rPrice);
    const invalidFields = [];

    if (!Number.isFinite(sr)) invalidFields.push('sr');
    if (Number.isNaN(wPrice)) invalidFields.push('wPrice');
    if (Number.isNaN(rPrice)) invalidFields.push('rPrice');

    if (invalidFields.length > 0) {
      invalidRows.push({
        row: rowNumber,
        reason: `Invalid numeric value in: ${invalidFields.join(', ')}`,
        source: row,
      });
      return;
    }

    products.push({
      sr,
      productName: String(row.productName ?? '').trim(),
      wPrice,
      rPrice,
      priceType: String(row.priceType ?? '').trim(),
      material: String(row.Material ?? '').trim(),
    });
  });

  return {
    products,
    invalidRows,
    totalRows: parsed.data.length,
  };
}

async function deleteCollectionDocs(collectionRef) {
  const snapshot = await getDocs(collectionRef);
  const dummyDocs = snapshot.docs.filter((document) => {
    const data = document.data();
    const haystack = `${document.id} ${data.productName ?? ''}`.toLowerCase();
    return haystack.includes('dummy') || haystack.includes('temp') || haystack.includes('test');
  });

  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(index, index + BATCH_LIMIT);

    chunk.forEach((document) => {
      batch.delete(document.ref);
    });

    await batch.commit();
    deleted += chunk.length;
  }

  return {
    existingDocs: snapshot.size,
    dummyDocs: dummyDocs.length,
    deleted,
  };
}

async function insertProducts(collectionRef, products) {
  let inserted = 0;

  for (let index = 0; index < products.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = products.slice(index, index + BATCH_LIMIT);

    chunk.forEach((product) => {
      batch.set(doc(collectionRef), product);
    });

    await batch.commit();
    inserted += chunk.length;
  }

  return inserted;
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const csvText = await fs.readFile(CSV_FILE, 'utf8');

  validateHeaders(csvText);

  const { products, invalidRows, totalRows } = parseProducts(csvText);
  const collectionRef = collection(db, COLLECTION_NAME);
  const inspection = await deleteCollectionDocs(collectionRef);
  const inserted = await insertProducts(collectionRef, products);
  const failed = totalRows - inserted;

  console.log('Firestore product import complete.');
  console.log(`Existing docs before import: ${inspection.existingDocs}`);
  console.log(`Dummy/temp/test docs found before clear: ${inspection.dummyDocs}`);
  console.log(`Docs deleted before import: ${inspection.deleted}`);
  console.log(`Total CSV rows: ${totalRows}`);
  console.log(`Rows inserted: ${inserted}`);
  console.log(`Rows failed: ${failed}`);
  console.log(`Invalid rows: ${invalidRows.length}`);

  if (invalidRows.length > 0) {
    console.log(JSON.stringify(invalidRows, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
