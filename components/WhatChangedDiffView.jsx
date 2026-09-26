'use client';

import React, { useState } from 'react';
import { 
  History, 
  ArrowRight, 
  TrendingUp, 
  UserMinus, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Building,
  RefreshCw,
  Zap
} from 'lucide-react';

export default function WhatChangedDiffView({
  auditLogs = [],
  members = [],
  tripId,
  currentUserId,
  onTriggerRecalculate
}) {
  const [selectedLeavingMemberId, setSelectedLeavingMemberId] = useState(
    members.find(m => m.status === 'active')?.id || ''
  );
  const [leavingReason, setLeavingReason] = useState('Emergency / leaving trip early');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = members.filter(m => m.status === 'active');

  const handleSimulateDeparture = async () => {
    if (!selectedLeavingMemberId) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${tripId}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'member_leave',
          memberId: selectedLeavingMemberId,
          reason: leavingReason,
          performedByMemberId: members.find(m => m.user_id === currentUserId)?.id || null
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Recalculation failed');
      }

      onTriggerRecalculate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Banner / Explanation */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          The Living Verified Ledger Engine
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            &quot;What Changed?&quot; Dynamic Recalculation Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl mt-1">
            When group travel plans change (a participant leaves early, skips an activity, or a refund is issued), 
            TripSync dynamically redistributes liabilities across the remaining active members with a transparent before-and-after audit trail.
          </p>
        </div>

        {/* Live Simulation Trigger Box */}
        {activeMembers.length > 1 && (
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Live Hackathon Recalculation Test:
              </span>
              <p className="text-[11px] text-slate-400">
                Pick a traveler below to simulate them leaving the trip and observe the auto-recalculated impact diff:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedLeavingMemberId}
                onChange={(e) => setSelectedLeavingMemberId(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-white/10 text-white border border-white/20 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id} className="text-slate-900 font-medium">
                    {m.display_name} ({m.role})
                  </option>
                ))}
              </select>

              <button
                onClick={handleSimulateDeparture}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserMinus className="w-3.5 h-3.5" />
                {loading ? 'Recalculating...' : 'Trigger Departure'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* Audit Logs / Diff Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Change Log & Financial Diffs</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {auditLogs.length} recalculation event(s) recorded
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Changes Recorded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All bookings and expenses are currently in their initial state. Use the live test trigger above to simulate a change.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {auditLogs.map((log) => {
              const before = log.snapshot_before;
              const after = log.snapshot_after;
              const leavingMember = members.find(m => m.id === log.affected_member_id);

              return (
                <div
                  key={log.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-md"
                >
                  
                  {/* Event Header */}
                  <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-slate-900">
                        {log.description}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ({log.affected_item_title})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* The BEFORE -> AFTER Visual Diff Grid */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                    
                    {/* BEFORE CARD */}
                    <div className="md:col-span-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase tracking-wider text-slate-500 text-[10px]">
                          BEFORE
                        </span>
                        <span className="text-slate-600 font-semibold">
                          {before?.participantCount || 0} Travelers
                        </span>
                      </div>
                      
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-xs text-slate-500">Booking Cost:</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          ₹{Number(before?.totalCost || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-xs font-bold text-slate-700">Per Person Share:</span>
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          ₹{Number(before?.perPersonCost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* ACTION ARROW IN MIDDLE */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                        <ArrowRight className="w-5 h-5 -rotate-90 md:rotate-0" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Re-split
                      </span>
                    </div>

                    {/* AFTER CARD */}
                    <div className="md:col-span-3 bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase tracking-wider text-indigo-700 text-[10px]">
                          AFTER RECALCULATION
                        </span>
                        <span className="text-indigo-900 font-bold">
                          {after?.participantCount || 0} Travelers
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-xs text-indigo-600/80">Booking Cost:</span>
                        <span className="text-sm font-bold text-indigo-950 font-mono">
                          ₹{Number(after?.totalCost || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1 border-t border-indigo-200/60">
                        <span className="text-xs font-bold text-indigo-900">New Per Person Share:</span>
                        <span className="text-base font-extrabold text-indigo-700 font-mono">
                          ₹{Number(after?.perPersonCost || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* IMPACT BANNER AT BOTTOM */}
                  <div className="px-6 py-3 bg-amber-50/80 border-t border-amber-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-900 uppercase text-[10px] tracking-wide">
                        FINANCIAL IMPACT:
                      </span>
                      <span className="font-bold text-amber-950">
                        {log.impact_summary}
                      </span>
                    </div>

                    <span className="text-[10px] text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded font-semibold">
                      Auto-Adjusted in Ledger
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
