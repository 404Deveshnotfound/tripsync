'use client';

import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Users, 
  Clock, 
  AlertCircle,
  Sparkles,
  DollarSign
} from 'lucide-react';
import AddRefundModal from './AddRefundModal';

export default function RefundsView({
  tripId,
  expenses = [],
  bookings = [],
  auditLogs = [],
  members = [],
  ledger,
  currentUserId,
  onRefundAdded
}) {
  const [isAddRefundOpen, setIsAddRefundOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'specific' | 'group'

  // Extract all refunds from expenses with category === 'refund' or negative total_amount
  const refundItems = useMemo(() => {
    const list = [];

    expenses.forEach(exp => {
      if (exp.category === 'refund' || Number(exp.total_amount) < 0) {
        const payer = members.find(m => m.id === exp.paid_by_member_id);
        const details = exp.extracted_details || {};
        const isSpecific = details.isSpecificPerson !== false;
        const beneficiaryId = details.beneficiaryMemberId || exp.allocations?.[0]?.memberId;
        const beneficiary = members.find(m => m.id === beneficiaryId);
        const absAmount = Math.abs(Number(exp.total_amount));
        const isSelf = isSpecific && exp.paid_by_member_id === beneficiaryId;

        list.push({
          id: exp.id,
          title: exp.title.replace(/^Refund:\s*/i, ''),
          amount: absAmount,
          date: exp.date || exp.created_at?.split('T')[0] || 'Recent',
          payerName: payer?.display_name || 'Traveler',
          payerId: exp.paid_by_member_id,
          beneficiaryName: beneficiary?.display_name || (isSpecific ? 'Traveler' : 'All Group Participants'),
          beneficiaryStatus: beneficiary?.status || 'active',
          isSpecificPerson: isSpecific,
          isSelfRefund: isSelf,
          reason: details.reason || exp.allocations?.[0]?.note || '',
          raw: exp
        });
      }
    });

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, members]);

  // Filtered list
  const filteredRefunds = useMemo(() => {
    return refundItems.filter(item => {
      if (filterType === 'specific' && !item.isSpecificPerson) return false;
      if (filterType === 'group' && item.isSpecificPerson) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.payerName?.toLowerCase().includes(q) ||
          item.beneficiaryName?.toLowerCase().includes(q) ||
          item.reason?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [refundItems, filterType, searchQuery]);

  // Aggregate stats
  const totalRefundAmount = refundItems.reduce((sum, item) => sum + item.amount, 0);
  const specificCount = refundItems.filter(i => i.isSpecificPerson).length;
  const groupCount = refundItems.filter(i => !i.isSpecificPerson).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a090a] via-[#0d0b0c] to-[#050505] text-white rounded-3xl p-6 sm:p-7 border border-[#272526] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/20 text-emerald-400 text-xs font-semibold border border-emerald-700/30">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
            Vendor Refunds &amp; Cancellations
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Trip Refunds &amp; Debt Adjustments
          </h2>
          <p className="text-xs sm:text-sm text-[#9c9791] leading-relaxed">
            Record cancellations, vendor reimbursements, and automated debt reductions without causing unfair losses to travelers.
          </p>
        </div>

        <button
          onClick={() => setIsAddRefundOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-900/30 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Refund</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-900/20 text-[#a8c49b] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#9c9791] font-semibold block">Total Refunded</span>
            <span className="text-xl font-black font-mono text-emerald-400">
              ₹{totalRefundAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#9d1117]/10 text-[#d8c49d] flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#9c9791] font-semibold block">Specific Person Refunds</span>
            <span className="text-xl font-bold text-[#f2eee5]">{specificCount} record(s)</span>
          </div>
        </div>

        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-900/20 text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#9c9791] font-semibold block">Group-Wide Refunds</span>
            <span className="text-xl font-bold text-[#f2eee5]">{groupCount} record(s)</span>
          </div>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="bg-[#101011] p-4 rounded-2xl border border-[#272526] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#9c9791] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, person, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#272526] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#0a0a0b] text-[#f2eee5]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {[
            { id: 'all', label: 'All Refunds' },
            { id: 'specific', label: 'Specific Person' },
            { id: 'group', label: 'Group-Wide' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#050505] text-[#9c9791] hover:bg-[#151516]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refunds Stream */}
      {filteredRefunds.length === 0 ? (
        <div className="bg-[#101011] rounded-2xl border border-[#272526] p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-900/20 text-[#a8c49b] flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#f2eee5]">No Refunds Recorded Yet</h4>
          <p className="text-xs text-[#9c9791] max-w-sm mx-auto">
            When a participant cancels an activity or a vendor issues a cash/UPI refund, click &ldquo;Record Refund&rdquo; to track it and update settlements.
          </p>
          <button
            onClick={() => setIsAddRefundOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record First Refund</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRefunds.map((item) => (
            <div
              key={item.id}
              className="bg-[#101011] rounded-2xl border border-[#272526] p-5 shadow-sm hover:border-emerald-700/30 transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1d1b1c] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-[#a8c49b]" />
                    Vendor Refund
                  </span>
                  <h4 className="text-sm font-bold text-[#f2eee5]">{item.title}</h4>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold font-mono text-[#a8c49b]">
                    +₹{item.amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-[#9c9791] font-mono">{item.date}</span>
                </div>
              </div>

              {/* Parties and Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] text-[#9c9791] font-semibold uppercase tracking-wider block">
                    Beneficiary (Whose Portion Refunded)
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-[#f2eee5]">
                    {item.isSpecificPerson ? (
                      <>
                        <User className="w-3.5 h-3.5 text-[#d8c49d]" />
                        <span>{item.beneficiaryName}</span>
                        {item.beneficiaryStatus !== 'active' && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-900/20 border border-rose-700/30 text-rose-400">
                            {item.beneficiaryStatus === 'left' ? 'Left Trip' : 'Removed'}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5 text-[#d8c49d]" />
                        <span>All Group Participants (Equal Share)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#9c9791] font-semibold uppercase tracking-wider block">
                    Account Credited (Original Payer)
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-[#f2eee5]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#a8c49b]" />
                    <span>Vendor refunded directly to {item.payerName}</span>
                  </div>
                </div>
              </div>

              {/* Optional Reason */}
              {item.reason && (
                <div className="text-[11px] text-[#9c9791] bg-[#050505] p-2.5 rounded-xl border border-[#1d1b1c] flex items-start gap-1.5">
                  <span className="font-semibold text-[#d8c49d] shrink-0">Reason:</span>
                  <span>{item.reason}</span>
                </div>
              )}

              {/* Settlement Consequence Badge */}
              <div className="pt-1">
                {item.isSelfRefund ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#a8c49b] shrink-0" />
                    <span>🛡️ Self-Paid Expense: ₹0 change in group settlement debts (Payer received their own refund back).</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#9d1117]/10 border border-[#9d1117]/30 text-[#d8c49d] text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#d8c49d] shrink-0" />
                    <span>⚖️ Debt Adjusted: {item.beneficiaryName}&rsquo;s liability reduced by ₹{item.amount.toLocaleString()}, credited to {item.payerName}.</span>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add Refund Modal */}
      <AddRefundModal
        isOpen={isAddRefundOpen}
        onClose={() => setIsAddRefundOpen(false)}
        tripId={tripId}
        members={members}
        bookings={bookings}
        expenses={expenses}
        currentUserId={currentUserId}
        onRefundAdded={() => {
          if (onRefundAdded) onRefundAdded();
        }}
      />

    </div>
  );
}
