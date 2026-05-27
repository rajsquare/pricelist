import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  doc,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';

const PRODUCT_NOTES_COLLECTION = 'productNotes';

export async function fetchProductNote(sr) {
  const notesQuery = query(
    collection(db, PRODUCT_NOTES_COLLECTION),
    where('sr', '==', Number(sr)),
  );

  const snapshot = await getDocs(notesQuery);

  if (snapshot.empty) {
    return '';
  }

  return String(snapshot.docs[0].data().note ?? '');
}

export async function saveProductNote(sr, note) {
  const docRef = doc(db, PRODUCT_NOTES_COLLECTION, String(sr));

  await setDoc(docRef, {
    sr: Number(sr),
    note: String(note).trim(),
    updatedAt: serverTimestamp(),
  });
}