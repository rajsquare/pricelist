import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

const AUDIT_COLLECTION = 'auditLogs';

export async function logAuditEvent({ action, before = null, after = null }) {
  await addDoc(collection(db, AUDIT_COLLECTION), {
    action,
    before,
    after,
    createdAt: serverTimestamp(),
  });
}

export async function fetchAuditLogs(maxRows = 50) {
  const auditQuery = query(
    collection(db, AUDIT_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(maxRows),
  );
  const snapshot = await getDocs(auditQuery);

  return snapshot.docs.map((documentSnapshot) => ({
    id: documentSnapshot.id,
    ...documentSnapshot.data(),
  }));
}
