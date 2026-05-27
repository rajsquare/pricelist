import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';

const PRODUCTS_COLLECTION = 'products';
const BATCH_LIMIT = 450;

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

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

export async function fetchProducts() {
  const productsQuery = query(collection(db, PRODUCTS_COLLECTION), orderBy('sr', 'asc'));
  const snapshot = await getDocs(productsQuery);

  return snapshot.docs.map(normalizeProduct);
}

export async function getProductById(productId) {
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const snapshot = await getDoc(productRef);

  return snapshot.exists() ? normalizeProduct(snapshot) : null;
}

export async function createProduct(product) {
  const after = normalizeProductInput(product);
  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), after);

  await logAuditEvent({
    action: 'PRODUCT_CREATED',
    before: null,
    after: { id: docRef.id, ...after },
  });

  return { id: docRef.id, ...after };
}

export async function updateProduct(productId, product) {
  const before = await getProductById(productId);
  const after = normalizeProductInput(product);
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);

  await updateDoc(productRef, after);
  await logAuditEvent({
    action: 'PRODUCT_UPDATED',
    before,
    after: { id: productId, ...after },
  });

  return { id: productId, ...after };
}

export async function deleteProduct(productId) {
  const before = await getProductById(productId);

  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
  await logAuditEvent({
    action: 'PRODUCT_DELETED',
    before,
    after: null,
  });
}

export async function replaceAllProducts(products) {
  const normalizedProducts = products.map(normalizeProductInput);
  const collectionRef = collection(db, PRODUCTS_COLLECTION);
  const snapshot = await getDocs(collectionRef);

  for (let index = 0; index < snapshot.docs.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(index, index + BATCH_LIMIT);

    chunk.forEach((productDoc) => {
      batch.delete(productDoc.ref);
    });

    await batch.commit();
  }

  for (let index = 0; index < normalizedProducts.length; index += BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = normalizedProducts.slice(index, index + BATCH_LIMIT);

    chunk.forEach((product) => {
      batch.set(doc(collectionRef), product);
    });

    await batch.commit();
  }

  await logAuditEvent({
    action: 'CSV_IMPORT_REPLACED',
    before: { count: snapshot.size },
    after: { count: normalizedProducts.length },
  });

  return {
    deleted: snapshot.size,
    inserted: normalizedProducts.length,
  };
}
