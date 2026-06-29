import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';
import { rebuildCatalogNow } from './productService.js';

const SYNC_SIGNAL_DOC = 'meta/syncSignal';
const CATALOG_DOC = 'catalog/current';

export async function triggerGlobalSync() {
  console.info('[PriceSync] Admin triggered global price sync…');
  const startedAt = Date.now();

  // Step 1: Rebuild catalog (writes products to catalog/current).
  // If this throws, we stop — version is NOT incremented.
  await rebuildCatalogNow();

  // Step 2: Sync succeeded — increment version and stamp updatedAt.
  // Use a transaction so the increment is safe under concurrent access.
  const catalogRef = doc(db, CATALOG_DOC);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(catalogRef);
    const currentVersion = snap.exists() ? (snap.data().version ?? 0) : 0;
    tx.update(catalogRef, {
      version: currentVersion + 1,
      updatedAt: serverTimestamp(),
    });
  });

  await setDoc(doc(db, SYNC_SIGNAL_DOC), {
    triggeredAt: serverTimestamp(),
    triggeredAtMs: startedAt,
  });

  const durationMs = Date.now() - startedAt;

  await logAuditEvent({
    action: 'PRICE_SYNC_TRIGGERED',
    before: null,
    after: { triggeredAtMs: startedAt, durationMs },
  });

  console.info(`[PriceSync] Done in ${durationMs}ms.`);
}
