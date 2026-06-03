import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';

const PRODUCT_NOTES_COLLECTION = 'productNotes';

const noteCache = new Map();

export async function fetchProductNoteCached(sr) {
  if (noteCache.has(sr)) return noteCache.get(sr);
  const result = await fetchProductNote(sr);
  noteCache.set(sr, result);
  return result;
}

export function invalidateNoteCache(sr) {
  noteCache.delete(sr);
}

export async function fetchProductNote(sr) {
  const docRef = doc(db, PRODUCT_NOTES_COLLECTION, String(sr));
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return '';
  }

  return String(snapshot.data().note ?? '');
}

export async function saveProductNote(sr, note) {
  const docRef = doc(db, PRODUCT_NOTES_COLLECTION, String(sr));

  await setDoc(docRef, {
    sr: Number(sr),
    note: String(note).trim(),
    updatedAt: serverTimestamp(),
  });
}