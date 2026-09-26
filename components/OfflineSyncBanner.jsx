'use client';

import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function OfflineSyncBanner({
  isOnline,
  pendingOfflineCount,
  isSyncing,
  lastSyncToast,
  onSyncNow
}) {
  if (isOnline && pendingOfflineCount === 0 && !lastSyncToast) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fadeIn">
      {/* Toast Alert when synced */}
      {lastSyncToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{lastSyncToast}</span>
          </div>
        </div>
      )}

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block">Offline Mode Active (Zero Connectivity Zone)</span>
              <p className="text-amber-700/80 text-[11px]">
                You can continue creating expenses. They are stored locally in IndexedDB and will auto-sync when network returns.
              </p>
            </div>
          </div>

          {pendingOfflineCount > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-lg font-bold text-[11px]">
                {pendingOfflineCount} Queued Offline
              </span>
            </div>
          )}
        </div>
      )}

      {/* Online but pending sync */}
      {isOnline && pendingOfflineCount > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>{pendingOfflineCount}</strong> offline expense(s) waiting to be synced to the ledger.
            </span>
          </div>

          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync to Ledger'}
          </button>
        </div>
      )}
    </div>
  );
}
