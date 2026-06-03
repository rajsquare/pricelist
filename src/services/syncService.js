/**
 * syncService.js
 *
 * Manual Global Price Sync — design notes
 * ──────────────────────────────────────────────────────────────────────────
 * Firestore reads are minimised to the absolute minimum:
 *
 *  • Admin "Sync" click:
 *      1 read  – getDocs(products) inside rebuildCatalogSnapshot
 *      1 write – setDoc(catalog/current, …)
 *      1 write – setDoc(meta/syncSignal, { triggeredAt })
 *      1 write – addDoc(auditLogs, PRICE_SYNC_TRIGGERED)
 *
 *  • Each connected client (via onSnapshot listener):
 *      0 extra reads – the snapshot payload IS the catalog doc; the
 *      listener is already subscribed to catalog/current, so the updated
 *      catalog data arrives as part of the same onSnapshot event.
 *      No polling, no full collection scans, no document-by-document reads.
 *
 * Total reads per sync: 1 (products collection scan, admin side only).
 * Client reads per sync: 0 (payload delivered by existing listener).
 * ──────────────────────────────────────────────────────────────────────────
 */

import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { logAuditEvent } from './auditService.js';
import { rebuildCatalogNow } from './productService.js';

const SYNC_SIGNAL_DOC = 'meta/syncSignal';
const CATALOG_CACHE_KEY = 'pricelist_catalog_cache';

/**
 * Triggered by the admin Sync button.
 *
 * 1. Rebuilds catalog/current from the products collection (1 read).
 * 2. Writes a sync signal timestamp (1 write) — all onSnapshot subscribers
 *    receive the new catalog data automatically with zero additional reads.
 * 3. Logs the event to auditLogs.
 */
export async function triggerGlobalSync() {
  console.info('[PriceSync] Admin triggered global price sync…');
  const startedAt = Date.now();

  // Rebuild the authoritative catalog snapshot in Firestore.
  // rebuildCatalogNow does: getDocs(products) → setDoc(catalog/current).
  await rebuildCatalogNow();

  // Write a signal document. Clients subscribed to catalog/current already
  // receive the updated catalog via their onSnapshot; this signal doc is a
  // cheap secondary trigger in case clients are listening to it directly.
  await setDoc(doc(db, SYNC_SIGNAL_DOC), {
    triggeredAt: serverTimestamp(),
    triggeredAtMs: startedAt,
  });

  const durationMs = Date.now() - startedAt;

  await logAuditEvent({
    action: 'PRICE_SYNC_TRIGGERED',
    before: null,
    after: {
      triggeredAtMs: startedAt,
      durationMs,
    },
  });

  console.info(`[PriceSync] Sync complete in ${durationMs}ms. Catalog rebuilt and signal broadcast.`);
}

/**
 * Subscribe to sync signals. Calls onSyncReceived whenever a sync is
 * broadcast by the admin. The callback receives the latest catalog products
 * array directly from the Firestore payload — no extra reads required.
 *
 * Returns an unsubscribe function.
 *
 * @param {(products: object[]) => void} onSyncReceived
 * @returns {() => void} unsubscribe
 */
export function subscribeToCatalogUpdates(onSyncReceived) {
  const catalogRef = doc(db, 'catalog/current');

  const unsubscribe = onSnapshot(
    catalogRef,
    { includeMetadataChanges: false },
    (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const products = data.products || [];

      // Invalidate the localStorage cache so a hard-reload also gets fresh data.
      try { localStorage.removeItem(CATALOG_CACHE_KEY); } catch { /* ignore */ }

      console.info(`[PriceSync] Catalog snapshot received — ${products.length} products, updatedAt=${data.updatedAt}`);

      onSyncReceived(products);
    },
    (error) => {
      console.error('[PriceSync] onSnapshot error:', error);
    },
  );

  return unsubscribe;
}
