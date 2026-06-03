import { useState } from 'react';
import toast from 'react-hot-toast';
import { triggerGlobalSync } from '../services/syncService.js';

export default function SyncButton() {
  const [status, setStatus] = useState('idle'); // idle | syncing | success | error

  async function handleSync() {
    if (status === 'syncing') return;
    setStatus('syncing');

    try {
      await triggerGlobalSync();
      setStatus('success');
      toast.success('Price sync complete — all clients updated.');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      toast.error(`Sync failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setStatus('idle'), 4000);
    }
  }

  const labels = { idle: 'Sync Prices', syncing: 'Syncing…', success: 'Synced ✓', error: 'Sync Failed' };

  return (
    <button
      className={`primary-button sync-btn sync-btn--${status}`}
      type="button"
      disabled={status === 'syncing'}
      onClick={handleSync}
    >
      {status === 'syncing' && <span className="sync-btn__spinner" aria-hidden="true" />}
      {labels[status]}
    </button>
  );
}
