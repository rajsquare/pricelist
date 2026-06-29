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

// Shape of a single product as stored in the catalog snapshot (includes id).
function toCatalogEntry(product) {
  return {
    id: product.id,
    ...normalizeProductInput(product),
  };
}

function sortBySr(list) {
  return [...list].sort((a, b) => (Number(a.sr) || 0) - (Number(b.sr) || 0));
}

// ── Catalog Snapshot ─────────────────────────────────────────────────────────

// Read-modify-write the SINGLE snapshot doc. Costs 1 read (one document),
// never N. Used for create/update/delete.
// Preserves the existing version field — does NOT increment it.
async function patchCatalog(transform) {
  const ref = doc(db, CATALOG_DOC);
  const snap = await getDoc(ref); // 1 read
  const data = snap.exists() ? snap.data() : {};
  const current = data.products ?? [];
  const existingVersion = data.version ?? 0;
  const next = sortBySr(transform(current.slice()));

  await setDoc(ref, {
    products: next,
    version: existingVersion,
    updatedAt: Date.now(),
  });
}

// Full rebuild from the collection (N reads). Admin-only / rare:
// used by the Sync button and as a one-time migration to backfill ids.
// Reads the existing version, increments it by 1, and writes atomically.
async function rebuildCatalogSnapshot() {
  const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('sr', 'asc'));
  const snapshot = await getDocs(q);

  const products = snapshot.docs.map((documentSnapshot) =>
    toCatalogEntry({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }),
  );

  const catalogRef = doc(db, CATALOG_DOC);
  const existingSnap = await getDoc(catalogRef);
  const existingVersion = existingSnap.exists()
    ? (existingSnap.data().version ?? 0)
    : 0;
  const nextVersion = existingVersion + 1;

  await setDoc(catalogRef, {
    products,
    version: nextVersion,
    updatedAt: Date.now(),
  });
}

// ── SR Counter ───────────────────────────────────────────────────────────────

export async function peekNextSr() {
  const snap = await getDoc(doc(db, SR_COUNTER_DOC));
  if (!snap.exists()) return 1;
  return (snap.data().current ?? 0) + 1;
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

// ── Catalog read (1 read) ─────────────────────────────────────────────────────

export async function fetchCatalog() {
  const snap = await getDoc(doc(db, CATALOG_DOC)); // 1 read
  if (!snap.exists()) return [];
  return sortBySr(snap.data().products ?? []);
}

// ── Product CRUD ─────────────────────────────────────────────────────────────

// Kept for occasional use (e.g. counter resync); no longer used by the app UI.
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

  await logAuditEvent({
    action: 'PRODUCT_CREATED',
    before: null,
    after: created,
  });

  // Patch snapshot: 1 read of the single catalog doc, never N.
  await patchCatalog((list) => [
    ...list.filter((p) => p.id !== created.id),
    toCatalogEntry(created),
  ]);

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

  const entry = toCatalogEntry({ id: productId, ...after });
  await patchCatalog((list) => {
    const exists = list.some((p) => p.id === productId);
    return exists
      ? list.map((p) => (p.id === productId ? entry : p))
      : [...list, entry];
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

  await patchCatalog((list) => list.filter((p) => p.id !== productId));
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

  // Insert new docs, capturing the generated ids so we can build the
  // snapshot from memory (0 extra catalog reads).
  const inserted = [];
  for (let i = 0; i < normalizedProducts.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);

    normalizedProducts
      .slice(i, i + BATCH_LIMIT)
      .forEach((p) => {
        const ref = doc(collectionRef);
        batch.set(ref, p);
        inserted.push({ id: ref.id, ...p });
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

  // Write snapshot straight from memory — preserve existing version (no increment for CSV import).
  const catalogRef = doc(db, CATALOG_DOC);
  const existingCatalogSnap = await getDoc(catalogRef);
  const existingVersion = existingCatalogSnap.exists()
    ? (existingCatalogSnap.data().version ?? 0)
    : 0;

  await setDoc(catalogRef, {
    products: sortBySr(inserted.map(toCatalogEntry)),
    version: existingVersion,
    updatedAt: Date.now(),
  });

  return {
    deleted: snapshot.size,
    inserted: normalizedProducts.length,
  };
}

export async function rebuildCatalogNow() {
  await rebuildCatalogSnapshot();
}
