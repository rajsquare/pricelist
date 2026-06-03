import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { getProductById, updateProduct } from './productService.js';

const COLLECTION = 'priceChangeRequests';
const requestsRef = () => collection(db, COLLECTION);

// ── Submit ────────────────────────────────────────────────────────────────────

export async function submitPriceChangeRequest({
  product,
  requestedWPrice,
  requestedRPrice,
  requestedBy,
  note,
}) {
  if (!product?.id) throw new Error('Product ID is required.');

  const wNum = Number(requestedWPrice);
  const rNum = Number(requestedRPrice);

  if (!Number.isFinite(wNum)) throw new Error('Requested W Price must be a valid number.');
  if (!Number.isFinite(rNum)) throw new Error('Requested R Price must be a valid number.');
  if (!String(requestedBy ?? '').trim()) throw new Error('Requested By is required.');

  await addDoc(requestsRef(), {
    productId: product.id,
    productName: String(product.productName ?? '').trim(),
    currentWPrice: product.wPrice ?? null,
    currentRPrice: product.rPrice ?? null,
    requestedWPrice: wNum,
    requestedRPrice: rNum,
    requestedBy: String(requestedBy).trim(),
    note: String(note ?? '').trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    approvedAt: null,
    rejectedAt: null,
  });
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchPendingPriceRequests() {
  const q = query(
    requestsRef(),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Approve ───────────────────────────────────────────────────────────────────

export async function approvePriceRequest(request) {
  if (!request?.productId) throw new Error('Missing productId on request.');

  // SAFE MERGE: fetch full existing product first, update ONLY pricing fields
  const existing = await getProductById(request.productId);

  if (!existing) throw new Error('Product no longer exists — cannot approve.');

  await updateProduct(request.productId, {
    ...existing,
    wPrice: Number(request.requestedWPrice),
    rPrice: Number(request.requestedRPrice),
  });

  await updateDoc(doc(db, COLLECTION, request.id), {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectPriceRequest(requestId) {
  if (!requestId) throw new Error('Request ID is required.');

  await updateDoc(doc(db, COLLECTION, requestId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
  });
}
