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

function normalizeImage(documentSnapshot) {
  return {
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  };
}

export async function fetchProductImages(productId) {
  const imagesQuery = query(
    collection(db, PRODUCT_IMAGES_COLLECTION),
    where('productId', '==', productId),
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

export async function addProductImage(productId, imageUrl) {
  const existingCount = await getProductImageCount(productId);

  if (existingCount >= MAX_PRODUCT_IMAGES) {
    throw new Error('This product already has 5 images.');
  }

  const docRef = await addDoc(collection(db, PRODUCT_IMAGES_COLLECTION), {
    productId,
    imageUrl,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    productId,
    imageUrl,
    createdAt: null,
  };
}

export async function deleteProductImage(imageDocId) {
  await deleteDoc(doc(db, PRODUCT_IMAGES_COLLECTION, imageDocId));
}

export async function getProductImageCount(productId) {
  const imagesQuery = query(
    collection(db, PRODUCT_IMAGES_COLLECTION),
    where('productId', '==', productId),
  );
  const snapshot = await getCountFromServer(imagesQuery);

  return snapshot.data().count;
}
