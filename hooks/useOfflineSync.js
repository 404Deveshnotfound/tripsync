'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  saveOfflineExpense, 
  getPendingOfflineExpenses, 
  removeSyncedOfflineExpense 
} from '@/lib/services/offlineSync';

export function useOfflineSync(tripId, onSyncComplete) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingItems, setPendingItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncToast, setLastSyncToast] = useState(null);

  // Check pending offline items
  const checkPendingQueue = useCallback(async () => {
    try {
      const items = await getPendingOfflineExpenses(tripId);
      setPendingItems(items);
    } catch (err) {
      console.error('Error checking pending queue:', err);
    }
  }, [tripId]);

  // Synchronize pending queue with the backend
  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const items = await getPendingOfflineExpenses(tripId);
    if (items.length === 0) return;

    setIsSyncing(true);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: items })
      });

      const data = await res.json();
      if (data.success) {
        // Remove synced items from IndexedDB
        for (const item of items) {
          await removeSyncedOfflineExpense(item.localId);
        }

        setLastSyncToast(`Synced ${items.length} offline expense(s) to ledger!`);
        setTimeout(() => setLastSyncToast(null), 4000);

        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (err) {
      console.error('Offline sync failed, will retry when network improves:', err);
    } finally {
      setIsSyncing(false);
      checkPendingQueue();
    }
  }, [tripId, isSyncing, onSyncComplete, checkPendingQueue]);

  // Network and queue listeners
  useEffect(() => {
    setIsOnline(navigator.onLine);
    checkPendingQueue();

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 15s in case user is online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncQueue();
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [syncQueue, checkPendingQueue]);

  // Method to record an expense offline
  const recordOffline = async (expenseData) => {
    const res = await saveOfflineExpense(tripId, expenseData);
    await checkPendingQueue();
    return res;
  };

  return {
    isOnline,
    pendingOfflineCount: pendingItems.length,
    pendingItems,
    isSyncing,
    lastSyncToast,
    syncQueue,
    recordOffline,
    checkPendingQueue
  };
}
