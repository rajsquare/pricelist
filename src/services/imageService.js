import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase.js';

const PRODUCT_IMAGES_COLLECTION = 'productImages';
const MAX_PRODUCT_IMAGES = 5;

const imageCache = new Map();

export async function fetchProductImagesCached(sr) {
  if (imageCache.has(sr)) return imageCache.get(sr);
  const result = await fetchProductImages(sr);
  imageCache.set(sr, result);
  return result;
}

export function invalidateImageCache(sr) {
  imageCache.delete(sr);
}

function normalizeImage(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

export async function fetchProductImages(sr) {
  const imagesQuery = query(
    collection(db, PRODUCT_IMAGES_COLLECTION),
    where('sr', '==', Number(sr)),
  );

  const snapshot = await getDocs(imagesQuery);

  return snapshot.docs
    .map(normalizeImage)
    .sort((a, b) => {
      const aTime = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const bTime = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
}

export async function addProductImage(sr, imageUrl) {
  const existingCount = await getProductImageCount(sr);

  if (existingCount >= MAX_PRODUCT_IMAGES) {
    throw new Error('This product already has 5 images.');
  }

  const numericSr = Number(sr);

  const docRef = await addDoc(collection(db, PRODUCT_IMAGES_COLLECTION), {
    sr: numericSr,
    imageUrl,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    sr: numericSr,
    imageUrl,
    createdAt: null,
  };
}

export async function deleteProductImage(imageDocId) {
  await deleteDoc(doc(db, PRODUCT_IMAGES_COLLECTION, imageDocId));
}

export async function getProductImageCount(sr) {
  const imagesQuery = query(
    collection(db, PRODUCT_IMAGES_COLLECTION),
    where('sr', '==', Number(sr)),
  );

  const snapshot = await getCountFromServer(imagesQuery);

  return snapshot.data().count;
}