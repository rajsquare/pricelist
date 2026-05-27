/**
 * Migration: Initialize /meta/srCounter
 *
 * Run ONCE to set the SR counter to the current maximum SR
 * across all existing products in Firestore.
 *
 * Usage:
 *   node scripts/migrate-sr-counter.js
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to your
 * Firebase service account JSON, or run via `firebase functions:shell`.
 *
 * Safe to re-run: it always sets to max(existing SRs) — never decrements.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'pricelist-a9d70';

if (!getApps().length) {
  initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS), projectId: PROJECT_ID });
}

const db = getFirestore();

async function run() {
  console.log('Reading all products...');
  const snapshot = await db.collection('products').get();

  let maxSr = 0;
  let badRows = 0;

  snapshot.docs.forEach((d) => {
    const sr = Number(d.data().sr);
    if (Number.isFinite(sr) && sr > 0) {
      if (sr > maxSr) maxSr = sr;
    } else {
      badRows++;
      console.warn(`  Doc ${d.id} has invalid sr: ${d.data().sr}`);
    }
  });

  console.log(`  ${snapshot.size} products scanned. Max SR = ${maxSr}. Bad rows = ${badRows}.`);

  const counterRef = db.doc('meta/srCounter');
  const existing = await counterRef.get();

  if (existing.exists) {
    const currentVal = existing.data().current ?? 0;
    console.log(`  Counter already exists with current = ${currentVal}.`);
    if (maxSr <= currentVal) {
      console.log('  Counter is already at or above max SR. No update needed.');
      return;
    }
  }

  await counterRef.set({ current: maxSr }, { merge: true });
  console.log(`✓ /meta/srCounter set to { current: ${maxSr} }`);
}

run().catch((err) => { console.error(err); process.exit(1); });
