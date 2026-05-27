import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../constants/config.js';

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
