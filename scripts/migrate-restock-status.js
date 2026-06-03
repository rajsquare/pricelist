/**
 * Migration: Backfill status + completedAt on restockRequests
 *
 * Existing documents created before Phase 2 have neither `status` nor
 * `completedAt`. This script adds them so the new indexed queries work.
 *
 * Safe to re-run: only patches documents that are missing the fields.
 *
 * Usage:
 *   node scripts/migrate-restock-status.js
 *
 * After running this script, create the two Firestore composite indexes
 * listed at the bottom of this file (or deploy firestore.indexes.json).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'pricelist-a9d70';

if (!getApps().length) {
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS), projectId: PROJECT_ID });
}

const db = getFirestore();

async function run() {
  console.log('Reading restockRequests...');
  const snapshot = await db.collection('restockRequests').get();

  const BATCH_SIZE = 400;
  let batched = 0;
  let batch = db.batch();
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Already migrated
    if (data.status !== undefined) {
      skipped++;
      continue;
    }

    // All pre-existing docs are treated as active (no completion info existed)
    batch.update(docSnap.ref, {
      status: 'active',
      completedAt: null,
    });
    batched++;

    if (batched % BATCH_SIZE === 0) {
      await batch.commit();
      console.log(`  Committed ${batched} docs...`);
      batch = db.batch();
    }
  }

  if (batched % BATCH_SIZE !== 0) {
    await batch.commit();
  }

  console.log(`✓ Patched ${batched} documents. Skipped ${skipped} already-migrated documents.`);
  console.log('');
  console.log('Next step: create these Firestore composite indexes:');
  console.log('');
  console.log('  Collection: restockRequests');
  console.log('  Index 1: status ASC, createdAt DESC   (for active queue)');
  console.log('  Index 2: status ASC, completedAt DESC (for completed log)');
  console.log('');
  console.log('Deploy with: firebase deploy --only firestore:indexes');
}

run().catch((err) => { console.error(err); process.exit(1); });
