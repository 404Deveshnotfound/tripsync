import { get, set, del, keys } from 'idb-keyval';

/**
 * TripSync — Offline Storage & Background Sync Service
 * Uses browser IndexedDB to persist expenses created without network connectivity.
 */

const OFFLINE_EXPENSE_PREFIX = 'tripsync_offline_exp_';

/**
 * Save an expense locally when offline
 */
export async function saveOfflineExpense(tripId, expenseData) {
  const localId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record = {
    ...expenseData,
    localId,
    tripId,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending_sync'
  };

  try {
    await set(`${OFFLINE_EXPENSE_PREFIX}${localId}`, record);
    return { success: true, record };
  } catch (err) {
    console.error('Failed to save expense to IndexedDB:', err);
    // Fallback to localStorage
    const existing = JSON.parse(localStorage.getItem('tripsync_offline_queue') || '[]');
    existing.push(record);
    localStorage.setItem('tripsync_offline_queue', JSON.stringify(existing));
    return { success: true, record };
  }
}

/**
 * Fetch all pending offline expenses
 */
export async function getPendingOfflineExpenses(tripId = null) {
  const pending = [];

  try {
    const allKeys = await keys();
    const offlineKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(OFFLINE_EXPENSE_PREFIX));

    for (const key of offlineKeys) {
      const item = await get(key);
      if (item && item.syncStatus === 'pending_sync') {
        if (!tripId || item.tripId === tripId) {
          pending.push(item);
        }
      }
    }
  } catch (err) {
    // Check localStorage fallback
    const local = JSON.parse(localStorage.getItem('tripsync_offline_queue') || '[]');
    local.forEach(item => {
      if (item.syncStatus === 'pending_sync') {
        if (!tripId || item.tripId === tripId) {
          pending.push(item);
        }
      }
    });
  }

  return pending;
}

/**
 * Mark offline expense as synced or delete from local queue
 */
export async function removeSyncedOfflineExpense(localId) {
  try {
    await del(`${OFFLINE_EXPENSE_PREFIX}${localId}`);
  } catch (err) {
    console.error('Error deleting from IndexedDB:', err);
  }

  // Also remove from localStorage fallback
  const local = JSON.parse(localStorage.getItem('tripsync_offline_queue') || '[]');
  const updated = local.filter(item => item.localId !== localId);
  localStorage.setItem('tripsync_offline_queue', JSON.stringify(updated));
}
