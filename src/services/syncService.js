import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Writes a sync signal to Firestore so all connected employee devices
 * know to refresh their cached prices.
 */
export async function triggerGlobalSync() {
  const ref = doc(db, 'meta', 'syncSignal');
  await setDoc(ref, {
    lastSyncAt: Date.now(),
    triggeredBy: 'admin',
  });
}

/**
 * Listens for changes to the sync signal document.
 * Skips the initial snapshot (fires on subscription) and only invokes
 * the callback on subsequent updates.
 *
 * @param {() => void} callback - Called when a new sync signal arrives.
 * @returns {() => void} Unsubscribe function.
 */
export function onSyncSignalChange(callback) {
  let isFirstSnapshot = true;
  const ref = doc(db, 'meta', 'syncSignal');

  const unsubscribe = onSnapshot(ref, () => {
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return;
    }
    callback();
  });

  return unsubscribe;
}
