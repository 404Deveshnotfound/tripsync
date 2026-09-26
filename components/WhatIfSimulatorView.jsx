'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Building,
  TrendingDown,
  TrendingUp,
  Percent
} from 'lucide-react';
import { round2, calculateSplit } from '@/lib/services/splitEngine';
import { recalculateMemberLeaving, recalculateBookingCancellation } from '@/lib/services/recalcEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

export default function WhatIfSimulatorView({
  bookings = [],
  expenses = [],
  members = [],
  ledger
}) {
  const [simulationType, setSimulationType] = useState('member_leave'); // 'member_leave' | 'refund'
  const [simulatedMemberId, setSimulatedMemberId] = useState(members[0]?.id || '');
  const [simulatedBookingId, setSimulatedBookingId] = useState(bookings[0]?.id || '');
  const [refundPercentage, setRefundPercentage] = useState(25);

  const activeMembers = members.filter(m => m.status === 'active');
  const targetBooking = bookings.find(b => b.id === simulatedBookingId) || bookings[0];
  const targetMember = members.find(m => m.id === simulatedMemberId) || members[0];

  // Run in-memory simulation without touching actual database or store!
  let simulatedOutcome = null;

  if (simulationType === 'member_leave' && targetMember) {
    const recalc = recalculateMemberLeaving({
      tripId: 'simulated',
      leavingMemberId: simulatedMemberId,
      leavingMemberName: targetMember.display_name,
      bookings: JSON.parse(JSON.stringify(bookings)),
      expenses: JSON.parse(JSON.stringify(expenses))
    });

    const simMembers = members.map(m => m.id === simulatedMemberId ? { ...m, status: 'left' } : m);
    const simLedger = aggregateLedger({
      members: simMembers,
      bookings: recalc.updatedBookings,
      expenses: recalc.updatedExpenses
    });

    simulatedOutcome = {
      type: 'member_leave',
      logs: recalc.auditLogs,
      simLedger,
      remainingCount: activeMembers.length - 1
    };
  } else if (simulationType === 'refund' && targetBooking) {
    const originalCost = targetBooking.current_cost || targetBooking.original_cost;
    const refundAmt = round2((originalCost * refundPercentage) / 100);

    const recalc = recalculateBookingCancellation({
      tripId: 'simulated',
      booking: JSON.parse(JSON.stringify(targetBooking)),
      refundAmount: refundAmt,
      cancellationReason: `Simulated ${refundPercentage}% vendor refund`
    });

    const updatedBookings = bookings.map(b => b.id === targetBooking.id ? recalc.updatedBooking : b);
    const simLedger = aggregateLedger({
      members,
      bookings: updatedBookings,
      expenses
    });

    simulatedOutcome = {
      type: 'refund',
      refundAmt,
      log: recalc.auditLog,
      simLedger,
      savingsPerPerson: targetBooking.participant_member_ids?.length 
        ? round2(refundAmt / targetBooking.participant_member_ids.length) 
        : 0
    };
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Financial Simulation Sandbox
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          &quot;What-If?&quot; Hypothetical Scenario Simulator
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          Test financial scenarios (what if a traveler leaves early, or what if a hotel offers a refund) in a safe sandbox mode without altering the active trip ledger.
        </p>
      </div>

      {/* Simulator Control Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Sandbox Scenario Controls</h3>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            Sandbox Active &bull; Zero Live Changes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Scenario Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scenario to Simulate</label>
            <select
              value={simulationType}
              onChange={(e) => setSimulationType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="member_leave">👤 What if a participant drops out / leaves?</option>
              <option value="refund">💰 What if a booking gets a refund / discount?</option>
            </select>
          </div>

          {/* Conditional Controls */}
          {simulationType === 'member_leave' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Traveler Leaving</label>
              <select
                value={simulatedMemberId}
                onChange={(e) => setSimulatedMemberId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name} ({m.role})</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Booking to Refund</label>
                <select
                  value={simulatedBookingId}
                  onChange={(e) => setSimulatedBookingId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>{b.title} (₹{b.current_cost || b.original_cost})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Refund Percentage:</span>
                  <span className="text-indigo-600 font-bold">{refundPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={refundPercentage}
                  onChange={(e) => setRefundPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Side-by-Side Comparison: Live Ledger vs. Simulated Sandbox */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LIVE LEDGER CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Current Live Ledger
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active State
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-400">Total Group Spend:</div>
            <div className="text-2xl font-black font-mono text-slate-900">
              ₹{Number(ledger?.totalTripCost || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">
              Across {activeMembers.length} active group members
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">Current Member Shares:</span>
            <div className="divide-y divide-slate-100 text-xs">
              {ledger?.memberSummaries?.map(m => (
                <div key={m.memberId} className="py-1.5 flex justify-between">
                  <span className="text-slate-600">{m.displayName}:</span>
                  <span className="font-mono font-bold text-slate-900">₹{Number(m.totalShare || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIMULATED OUTCOME CARD */}
        <div className="bg-indigo-50/50 rounded-3xl border border-indigo-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              2. Simulated Sandbox Outcome
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Hypothetical
            </span>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-indigo-600/80">Simulated Total Spend:</div>
            <div className="text-2xl font-black font-mono text-indigo-950">
              ₹{Number(simulatedOutcome?.simLedger?.totalTripCost || 0).toLocaleString()}
            </div>
            
            {/* Impact Delta */}
            <div className="flex items-center gap-1.5 text-xs font-bold pt-1">
              {simulationType === 'refund' ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Total Group Savings: ₹{Number(simulatedOutcome?.refundAmt || 0).toLocaleString()} (-₹{simulatedOutcome?.savingsPerPerson || 0} / person)
                </span>
              ) : (
                <span className="text-amber-800 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Liabilities re-divided across remaining {simulatedOutcome?.remainingCount} travelers
                </span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-indigo-200/60 space-y-2">
            <span className="text-[11px] font-bold text-indigo-900 block">Simulated Member Shares:</span>
            <div className="divide-y divide-indigo-100 text-xs">
              {simulatedOutcome?.simLedger?.memberSummaries?.map(m => {
                const originalShare = ledger?.memberSummaries?.find(s => s.memberId === m.memberId)?.totalShare || 0;
                const delta = round2(m.totalShare - originalShare);

                return (
                  <div key={m.memberId} className="py-1.5 flex justify-between items-center">
                    <span className="text-indigo-900 font-medium">{m.displayName}:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-950">₹{Number(m.totalShare || 0).toLocaleString()}</span>
                      {delta !== 0 && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          delta > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {delta > 0 ? `+₹${delta}` : `-₹${Math.abs(delta)}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
