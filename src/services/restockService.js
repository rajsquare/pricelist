import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';

const COLLECTION = 'restockRequests';

/**
 * Fetches active requests (status == 'active').
 * Requires composite index: status ASC, createdAt DESC
 */
export async function fetchActiveRestockRequests() {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches completed requests (status == 'completed').
 * Requires composite index: status ASC, completedAt DESC
 */
export async function fetchCompletedRestockRequests() {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all requests (active + completed) in one call.
 * Used as a fallback during migration before indexes are created.
 */
export async function fetchRestockRequests() {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createRestockRequest({ sr, productName, note }) {
  const trimmedNote = String(note ?? '').trim();
  if (!trimmedNote) throw new Error('Note is required.');

  await addDoc(collection(db, COLLECTION), {
    sr: Number(sr),
    productName: String(productName ?? '').trim(),
    note: trimmedNote,
    status: 'active',
    completedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function completeRestockRequest(id) {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

export async function deleteRestockRequest(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
