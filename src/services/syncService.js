import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';
import { rebuildCatalogNow } from './productService.js';

const SYNC_SIGNAL_DOC = 'meta/syncSignal';

/**
 * Rebuilds catalog/current from the products collection, then writes a
 * timestamp to meta/syncSignal. Any client subscribed to catalog/current
 * via onSnapshot receives the updated data automatically — no extra reads.
 */
export async function triggerGlobalSync() {
  console.info('[PriceSync] Admin triggered global price sync…');
  const startedAt = Date.now();

  await rebuildCatalogNow();

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
