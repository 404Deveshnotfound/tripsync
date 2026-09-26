'use client';

import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  UserMinus, 
  DollarSign, 
  Receipt, 
  ShieldCheck, 
  Building, 
  Plane, 
  Car, 
  Compass, 
  Utensils, 
  Sparkles, 
  AlertCircle, 
  PlusCircle, 
  RefreshCw,
  Tag,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function TransactionLogView({
  expenses = [],
  bookings = [],
  auditLogs = [],
  members = [],
  currentUserId
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'expense' | 'recalculation'

  // Combine expenses, bookings, and audit logs into a unified chronological log stream (NO settlement transfers)
  const logEntries = useMemo(() => {
    const list = [];

    // 1. Expense additions
    expenses.forEach(e => {
      const payer = members.find(m => m.id === e.paid_by_member_id);
      list.push({
        id: 'log-exp-' + e.id,
        timestamp: e.created_at || (e.date ? new Date(e.date).toISOString() : new Date().toISOString()),
        eventType: 'expense_created',
        category: e.category || 'other',
        title: e.title,
        amount: Number(e.total_amount || 0),
        payerName: payer?.display_name || 'Group Member',
        paidByMemberId: e.paid_by_member_id,
        splitMethod: e.split_method || 'equal',
        allocations: e.allocations || [],
        vendorName: e.vendor_name || e.extracted_details?.vendorName || null,
        bookingReference: e.booking_reference || e.extracted_details?.bookingReference || null,
        verificationStatus: e.verification_status || 'verified',
        raw: e
      });
    });

    // 2. Booking additions (if separate from expenses)
    bookings.forEach(b => {
      const payer = members.find(m => m.id === b.paid_by_member_id);
      list.push({
        id: 'log-book-' + b.id,
        timestamp: b.created_at || (b.start_time ? new Date(b.start_time).toISOString() : new Date().toISOString()),
        eventType: 'expense_created',
        category: b.category || 'hotel',
        title: b.title,
        amount: Number(b.current_cost ?? b.original_cost ?? 0),
        payerName: payer?.display_name || 'Group Member',
        paidByMemberId: b.paid_by_member_id,
        splitMethod: b.split_method || 'equal',
        allocations: b.allocations || [],
        vendorName: b.vendor_name || null,
        bookingReference: b.booking_reference || null,
        verificationStatus: 'verified',
        raw: b
      });
    });

    // 3. Recalculation Audit Logs (Member departures & removals)
    auditLogs.forEach(al => {
      const departingMember = members.find(m => m.id === al.affected_member_id);
      list.push({
        id: 'log-recalc-' + al.id,
        timestamp: al.created_at || new Date().toISOString(),
        eventType: 'recalculation_adjustment',
        triggerEvent: al.trigger_event || 'participant_left',
        title: al.description || `${departingMember?.display_name || 'A traveler'} departed the trip`,
        affectedItemTitle: al.affected_item_title || 'Shared Trip Expenses',
        affectedItemType: al.affected_item_type || 'expense',
        departingMemberName: departingMember?.display_name || 'Participant',
        snapshotBefore: al.snapshot_before,
        snapshotAfter: al.snapshot_after,
        impactSummary: al.impact_summary,
        raw: al
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [expenses, bookings, auditLogs, members]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return logEntries.filter(entry => {
      // Type filter
      if (filterType === 'expense' && entry.eventType !== 'expense_created') return false;
      if (filterType === 'recalculation' && entry.eventType !== 'recalculation_adjustment') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = entry.title?.toLowerCase().includes(q);
        const payerMatch = entry.payerName?.toLowerCase().includes(q);
        const memberMatch = entry.departingMemberName?.toLowerCase().includes(q);
        const itemMatch = entry.affectedItemTitle?.toLowerCase().includes(q);
        const vendorMatch = entry.vendorName?.toLowerCase().includes(q);
        return titleMatch || payerMatch || memberMatch || itemMatch || vendorMatch;
      }
      return true;
    });
  }, [logEntries, filterType, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            Transparent Financial Ledger History
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Transaction & Recalculation Log
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            A chronological, tamper-evident audit record of every expense addition, booking split, and automatic recalculation adjustment across the trip.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Logged Events</div>
            <div className="text-lg font-black font-mono">{logEntries.length}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by description, member, or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            All Logs ({logEntries.length})
          </button>
          
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'expense'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            ➕ Expenses Added ({logEntries.filter(l => l.eventType === 'expense_created').length})
          </button>

          <button
            onClick={() => setFilterType('recalculation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === 'recalculation'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            🔄 Recalculations ({logEntries.filter(l => l.eventType === 'recalculation_adjustment').length})
          </button>
        </div>

      </div>

      {/* Log Feed */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Transaction Logs Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No activity matching "${searchQuery}". Try clearing your search.`
              : 'As expenses are recorded or members depart the trip, detailed transaction and recalculation records will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((log) => {
            const formattedTime = new Date(log.timestamp).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            // Card 1: Expense / Booking Added Event
            if (log.eventType === 'expense_created') {
              return (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-200 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Expense Added
                        </span>
                        {log.vendorName && (
                          <span className="ml-2 text-xs font-medium text-slate-500">
                            via {log.vendorName}
                            {log.bookingReference && ` (${log.bookingReference})`}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {formattedTime}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">{log.title}</h4>
                      <p className="text-xs text-slate-500">
                        Paid by <strong className="text-slate-800">{log.payerName}</strong> &bull; Split method:{' '}
                        <span className="capitalize font-semibold text-slate-700">{log.splitMethod.replace('_', ' ')}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-lg font-black font-mono text-slate-900">
                        ₹{log.amount.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {log.allocations.length} participating members
                      </span>
                    </div>
                  </div>

                  {/* Allocations breakdown pill list */}
                  {log.allocations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                        Member Contributions Breakdown:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {log.allocations.map((alloc) => {
                          const m = members.find(mem => mem.id === alloc.memberId);
                          const share = Number(alloc.shareAmount ?? alloc.amount ?? 0);
                          return (
                            <span
                              key={alloc.memberId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700"
                            >
                              <span className="font-medium">{m?.display_name?.split(' ')[0] || 'Member'}:</span>
                              <strong className="font-mono text-indigo-900 font-bold">₹{share.toLocaleString()}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // Card 2: Recalculation Adjustment (Member Departed or Removed)
            if (log.eventType === 'recalculation_adjustment') {
              const beforeCount = log.snapshotBefore?.participantCount || 0;
              const afterCount = log.snapshotAfter?.participantCount || 0;
              const beforePerPerson = Number(log.snapshotBefore?.perPersonCost || 0);
              const afterPerPerson = Number(log.snapshotAfter?.perPersonCost || 0);
              const perPersonDelta = afterPerPerson - beforePerPerson;
              const isRemoved = log.triggerEvent === 'member_removed';

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-2xl border-2 border-amber-200/80 p-5 shadow-sm hover:border-amber-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isRemoved ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          isRemoved 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isRemoved ? 'Participant Removed (Recalculated)' : 'Participant Left (Recalculated)'}
                        </span>
                        <span className="ml-2 text-xs font-semibold text-slate-800">
                          {log.title}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {formattedTime}
                    </span>
                  </div>

                  {/* Body & Impact Delta */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 max-w-md">
                      <div className="text-xs text-slate-500">
                        Affected Spend Item: <strong className="text-slate-800 font-semibold">{log.affectedItemTitle}</strong>
                      </div>
                      {log.impactSummary && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{log.impactSummary}</span>
                        </div>
                      )}
                    </div>

                    {/* Pre-Committed Share Locked & Zero-Loss Protection Card */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-left sm:text-right shrink-0 min-w-[200px]">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Financial Protection</div>
                      {perPersonDelta > 0 && !log.snapshotAfter?.lockedShareAmount ? (
                        <div className="flex items-center sm:justify-end gap-1.5 font-bold text-amber-700 text-xs">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Absorbed Split: +₹{perPersonDelta.toLocaleString()}/person</span>
                        </div>
                      ) : (
                        <div className="flex items-center sm:justify-end gap-1.5 font-bold text-emerald-700 text-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Remaining members: ₹0 loss</span>
                        </div>
                      )}
                      {log.snapshotAfter?.lockedShareAmount ? (
                        <div className="text-[11px] text-slate-600">
                          Locked Debt Due: <strong className="font-mono text-rose-700 font-bold">₹{Number(log.snapshotAfter.lockedShareAmount).toLocaleString()}</strong>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Agreed Share: ₹{beforePerPerson.toLocaleString()}/person
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allocations Status Breakdown */}
                  {log.snapshotAfter?.allocations?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                        Allocations &amp; Liability Status:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {log.snapshotAfter.allocations.map((alloc) => {
                          const m = members.find(mem => mem.id === alloc.memberId);
                          const share = Number(alloc.amount ?? alloc.shareAmount ?? 0);
                          const isLocked = alloc.locked || alloc.memberId === log.snapshotAfter?.lockedMemberId;

                          return (
                            <span
                              key={alloc.memberId}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border ${
                                isLocked
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
                              }`}
                            >
                              <span className="font-medium">{m?.display_name?.split(' ')[0] || 'Traveler'}:</span>
                              <strong className="font-mono font-bold">₹{share.toLocaleString()}</strong>
                              {isLocked ? (
                                <span className="text-[9px] uppercase font-black px-1 py-0.2 rounded bg-rose-200 text-rose-800">
                                  Locked Due
                                </span>
                              ) : perPersonDelta > 0 && !log.snapshotAfter?.lockedShareAmount ? (
                                <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                                  Adjusted
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                  Unchanged
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            }

            return null;
          })}
        </div>
      )}

    </div>
  );
}
