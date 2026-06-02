import { addDoc, collection, serverTimestamp, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';
import { updateCatalogEntryPrices } from './productService.js';

const requestsCollection = collection(db, 'priceChangeRequests');

export async function submitPriceChangeRequest({ product, requestedWPrice, requestedRPrice, requestedBy, note }) {
  await addDoc(requestsCollection, {
    productId: product.id,
    productName: product.productName,
    sr: product.sr,
    currentWPrice: product.wPrice || 0,
    currentRPrice: product.rPrice || 0,
    requestedWPrice: Number(requestedWPrice),
    requestedRPrice: Number(requestedRPrice),
    requestedBy: requestedBy || 'Unknown',
    note: note || '',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function fetchPendingPriceRequests() {
  const q = query(requestsCollection, where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function approvePriceRequest(request) {
  await updateDoc(doc(db, 'products', request.productId), {
    wPrice: Number(request.requestedWPrice),
    rPrice: Number(request.requestedRPrice),
  });

  await logAuditEvent({
    action: 'PRODUCT_UPDATED',
    before: { wPrice: request.currentWPrice, rPrice: request.currentRPrice },
    after: { wPrice: request.requestedWPrice, rPrice: request.requestedRPrice },
  });

  // Incremental catalog update
  await updateCatalogEntryPrices(request.sr, request.productName, Number(request.requestedWPrice), Number(request.requestedRPrice));

  await updateDoc(doc(db, 'priceChangeRequests', request.id), {
    status: 'approved',
    approvedAt: serverTimestamp(),
  });
}

export async function rejectPriceRequest(requestId) {
  await updateDoc(doc(db, 'priceChangeRequests', requestId), {
    status: 'rejected',
    rejectedAt: serverTimestamp(),
  });
}
