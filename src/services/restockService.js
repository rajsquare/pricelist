import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export async function fetchRestockRequests() {
  const restockQuery = query(collection(db, 'restockRequests'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(restockQuery);

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}

export async function createRestockRequest({ sr, productName, note }) {
  const trimmedNote = String(note ?? '').trim();

  if (!trimmedNote) {
    throw new Error('Note is required.');
  }

  await addDoc(collection(db, 'restockRequests'), {
    sr: Number(sr),
    productName: String(productName ?? '').trim(),
    note: trimmedNote,
    createdAt: serverTimestamp(),
  });
}
