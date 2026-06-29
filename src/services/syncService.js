import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';
import { rebuildCatalogNow } from './productService.js';

const SYNC_SIGNAL_DOC = 'meta/syncSignal';

export async function triggerGlobalSync() {
  console.info('[PriceSync] Admin triggered global price sync…');
  const startedAt = Date.now();

  // rebuildCatalogNow() reads the existing version, increments it by 1,
  // and writes products + version + updatedAt in a single setDoc call.
  // If this throws, we stop — the catalog and version are unchanged.
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
