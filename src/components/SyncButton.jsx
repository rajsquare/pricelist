import { useState } from 'react';
import toast from 'react-hot-toast';
import { triggerGlobalSync } from '../services/syncService.js';

const STATES = {
  idle: 'idle',
  syncing: 'syncing',
  success: 'success',
  error: 'error',
};

/**
 * SyncButton — triggers a Manual Global Price Sync.
 *
 * States:
 *   idle    → "Sync Prices"  (primary-button)
 *   syncing → "Syncing…"     (primary-button, disabled, spinner)
 *   success → "Synced ✓"     (success momentarily, then resets)
 *   error   → "Sync Failed"  (danger-button, resets on next click)
 */
export default function SyncButton() {
  const [syncState, setSyncState] = useState(STATES.idle);
  const isBusy = syncState === STATES.syncing;

  async function handleSync() {
    if (isBusy) return;

    setSyncState(STATES.syncing);
    console.info('[SyncButton] Manual price sync initiated by admin.');

    try {
      await triggerGlobalSync();

      setSyncState(STATES.success);
      toast.success('Price sync complete — all clients updated.');
      console.info('[SyncButton] Sync finished successfully.');

      // Reset to idle after 3 s so the button is reusable.
      setTimeout(() => setSyncState(STATES.idle), 3000);
    } catch (error) {
      setSyncState(STATES.error);
      const message = error?.message || 'Unknown error during sync.';
      toast.error(`Sync failed: ${message}`);
      console.error('[SyncButton] Sync error:', error);

      // Reset to idle after 4 s.
      setTimeout(() => setSyncState(STATES.idle), 4000);
    }
  }

  const label = {
    [STATES.idle]:    'Sync Prices',
    [STATES.syncing]: 'Syncing…',
    [STATES.success]: 'Synced ✓',
    [STATES.error]:   'Sync Failed',
  }[syncState];

  const buttonClass = {
    [STATES.idle]:    'primary-button',
    [STATES.syncing]: 'primary-button',
    [STATES.success]: 'sync-button--success',
    [STATES.error]:   'danger-button',
  }[syncState];

  return (
    <button
      className={`${buttonClass} sync-button`}
      type="button"
      disabled={isBusy}
      onClick={handleSync}
      title="Rebuild catalog snapshot and push latest prices to all active clients"
    >
      {syncState === STATES.syncing ? (
        <span className="sync-button__spinner" aria-hidden="true" />
      ) : null}
      {label}
    </button>
  );
}
