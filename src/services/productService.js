import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';

const PRODUCTS_COLLECTION = 'products';
const SR_COUNTER_DOC = 'meta/srCounter';
const CATALOG_DOC = 'catalog/current';
const BATCH_LIMIT = 450;

// ── Normalization ────────────────────────────────────────────────────────────

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProduct(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    sr: Number(data.sr),
    productName: String(data.productName ?? '').trim(),
    wPrice: normalizeNumber(data.wPrice),
    rPrice: normalizeNumber(data.rPrice),
    priceType: String(data.priceType ?? '').trim(),
    material: String(data.material ?? data.Material ?? '').trim(),
  };
}

function normalizeProductInput(product) {
  return {
    sr: Number(product.sr),
    productName: String(product.productName ?? '').trim(),
    wPrice: normalizeNumber(product.wPrice),
    rPrice: normalizeNumber(product.rPrice),
    priceType: String(product.priceType ?? '').trim(),
    material: String(product.material ?? product.Material ?? '').trim(),
  };
}

// ── Catalog Snapshot ─────────────────────────────────────────────────────────

async function rebuildCatalogSnapshot() {
  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('sr', 'asc'));
  const snapshot = await getDocs(q);

  const products = snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      sr: Number(data.sr),
      productName: String(data.productName ?? '').trim(),
      wPrice: normalizeNumber(data.wPrice),
      rPrice: normalizeNumber(data.rPrice),
      priceType: String(data.priceType ?? '').trim(),
      material: String(data.material ?? data.Material ?? '').trim(),
    };
  });

  await setDoc(doc(db, CATALOG_DOC), {
    products,
    updatedAt: Date.now(),
  });
}

export async function fetchCatalog() {
  const snap = await getDoc(doc(db, CATALOG_DOC));
  if (!snap.exists()) return [];
  return snap.data().products || [];
}

const CACHE_KEY = 'pricelist_catalog_cache';
const CACHE_TTL = 300000;

export async function fetchCatalogWithCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.products;
      }
    }
  } catch {
    // ignore parse errors
  }

  const products = await fetchCatalog();
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ products, timestamp: Date.now() }));
  } catch {
    // ignore storage errors
  }
  return products;
}

export async function updateCatalogEntry(updatedProduct) {
  const catalogRef = doc(db, CATALOG_DOC);
  const snap = await getDoc(catalogRef);
  let products = [];
  if (snap.exists()) {
    products = snap.data().products || [];
  }

  const index = products.findIndex((p) => p.sr === updatedProduct.sr);
  const entry = {
    sr: updatedProduct.sr,
    productName: updatedProduct.productName,
    wPrice: updatedProduct.wPrice,
    rPrice: updatedProduct.rPrice,
    priceType: updatedProduct.priceType,
    material: updatedProduct.material,
  };

  if (index >= 0) {
    products[index] = entry;
  } else {
    products.push(entry);
    products.sort((a, b) => a.sr - b.sr);
  }

  await setDoc(catalogRef, { products, updatedAt: Date.now() });
}

export async function removeCatalogEntry(sr) {
  const catalogRef = doc(db, CATALOG_DOC);
  const snap = await getDoc(catalogRef);
  let products = [];
  if (snap.exists()) {
    products = snap.data().products || [];
  }

  products = products.filter((p) => p.sr !== sr);
  await setDoc(catalogRef, { products, updatedAt: Date.now() });
}

// ── SR Counter ───────────────────────────────────────────────────────────────

let cachedNextSr = null;

export async function peekNextSr() {
  const snap = await getDoc(doc(db, SR_COUNTER_DOC));
  if (!snap.exists()) return 1;
  return (snap.data().current ?? 0) + 1;
}

export async function peekNextSrCached() {
  if (cachedNextSr !== null) return cachedNextSr;
  cachedNextSr = await peekNextSr();
  return cachedNextSr;
}

export function invalidateSrCache() {
  cachedNextSr = null;
}

export async function syncSrCounter() {
  const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
  let max = 0;

  snapshot.docs.forEach((d) => {
    const sr = Number(d.data().sr);
    if (Number.isFinite(sr) && sr > max) max = sr;
  });

  await updateDoc(doc(db, SR_COUNTER_DOC), { current: max });
  return max;
}

// ── Product CRUD ─────────────────────────────────────────────────────────────

export async function fetchProducts() {
  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('sr', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(normalizeProduct);
}

export async function getProductById(productId) {
  const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, productId));
  return snap.exists() ? normalizeProduct(snap) : null;
}

export async function createProduct(productFields) {
  const fields = { ...productFields };
  delete fields.sr;

  const normalized = normalizeProductInput({
    ...fields,
    sr: 0,
  });

  const counterRef = doc(db, SR_COUNTER_DOC);
  const productsRef = collection(db, PRODUCTS_COLLECTION);

  let assignedSr;
  let newDocId;

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists()
      ? (counterSnap.data().current ?? 0)
      : 0;

    assignedSr = current + 1;

    const newDocRef = doc(productsRef);
    newDocId = newDocRef.id;

    const productData = {
      ...normalized,
      sr: assignedSr,
    };

    tx.set(newDocRef, productData);
    tx.set(counterRef, { current: assignedSr }, { merge: true });
  });

  const created = {
    id: newDocId,
    ...normalized,
    sr: assignedSr,
  };

  invalidateSrCache();

  await logAuditEvent({
    action: 'PRODUCT_CREATED',
    before: null,
    after: created,
  });

  await updateCatalogEntry({
    sr: created.sr,
    productName: created.productName,
    wPrice: created.wPrice,
    rPrice: created.rPrice,
    priceType: created.priceType,
    material: created.material,
  });

  return created;
}

export async function updateProduct(productId, product) {
  const before = await getProductById(productId);
  const after = normalizeProductInput(product);

  await updateDoc(doc(db, PRODUCTS_COLLECTION, productId), after);

  await logAuditEvent({
    action: 'PRODUCT_UPDATED',
    before,
    after: {
      id: productId,
      ...after,
    },
  });

  await updateCatalogEntry({
    sr: after.sr,
    productName: after.productName,
    wPrice: after.wPrice,
    rPrice: after.rPrice,
    priceType: after.priceType,
    material: after.material,
  });

  return {
    id: productId,
    ...after,
  };
}

export async function deleteProduct(productId) {
  const before = await getProductById(productId);

  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));

  await logAuditEvent({
    action: 'PRODUCT_DELETED',
    before,
    after: null,
  });

  await removeCatalogEntry(before.sr);
}

export async function replaceAllProducts(products) {
  const normalizedProducts = products.map(normalizeProductInput);
  const collectionRef = collection(db, PRODUCTS_COLLECTION);
  const snapshot = await getDocs(collectionRef);

  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);

    snapshot.docs
      .slice(i, i + BATCH_LIMIT)
      .forEach((d) => batch.delete(d.ref));

    await batch.commit();
  }

  for (let i = 0; i < normalizedProducts.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);

    normalizedProducts
      .slice(i, i + BATCH_LIMIT)
      .forEach((p) => {
        batch.set(doc(collectionRef), p);
      });

    await batch.commit();
  }

  const maxSr = normalizedProducts.reduce(
    (m, p) => Math.max(m, p.sr || 0),
    0,
  );

  await updateDoc(doc(db, SR_COUNTER_DOC), {
    current: maxSr,
  });

  await logAuditEvent({
    action: 'CSV_IMPORT_REPLACED',
    before: {
      count: snapshot.size,
    },
    after: {
      count: normalizedProducts.length,
    },
  });

  await rebuildCatalogSnapshot();

  return {
    deleted: snapshot.size,
    inserted: normalizedProducts.length,
  };
}
export async function rebuildCatalogNow() {
  await rebuildCatalogSnapshot();
}