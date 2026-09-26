'use client';

import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  DollarSign, 
  User, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

export default function AddRefundModal({
  isOpen,
  onClose,
  tripId,
  members = [],
  bookings = [],
  expenses = [],
  currentUserId,
  onRefundAdded
}) {
  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id || members[0]?.id;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payerMemberId, setPayerMemberId] = useState(currentMemberId || '');
  const [isSpecificPerson, setIsSpecificPerson] = useState(true);
  const [beneficiaryMemberId, setBeneficiaryMemberId] = useState(members[0]?.id || '');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const payer = members.find(m => m.id === payerMemberId);
  const beneficiary = members.find(m => m.id === beneficiaryMemberId);
  const isSelfRefund = isSpecificPerson && payerMemberId === beneficiaryMemberId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a refund title.');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid refund amount.');
      return;
    }
    if (!payerMemberId) {
      setErrorMsg('Please specify who received the refund from the vendor.');
      return;
    }
    if (isSpecificPerson && !beneficiaryMemberId) {
      setErrorMsg('Please select which traveler this refund belongs to.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/trips/${tripId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: numAmount,
          payerMemberId,
          isSpecificPerson,
          beneficiaryMemberId: isSpecificPerson ? beneficiaryMemberId : null,
          reason: reason.trim(),
          performedByMemberId: currentMemberId
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onRefundAdded) onRefundAdded(data.refund);
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to record refund');
      }
    } catch (err) {
      console.error('Error adding refund:', err);
      setErrorMsg(err.message || 'Error recording refund');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-400/30">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Record Vendor Refund</h3>
              <p className="text-[11px] text-slate-300">
                Cancel an activity or record a credit refund
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Refund Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Refund Description / Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Scuba Diving Weather Cancellation / Flight Cancellation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Refund Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Refund Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Account Credited (Payer) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Who received this refund from the vendor into their account? (Original Payer) *
            </label>
            <select
              value={payerMemberId}
              onChange={(e) => setPayerMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} {m.user_id === currentUserId ? '(You)' : ''} ({m.status})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              The person whose bank account or card received the cash/UPI refund from the vendor.
            </span>
          </div>

          {/* Specific Person vs Whole Group Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Is this a refund for a specific person?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSpecificPerson(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  isSpecificPerson
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Yes, Specific Person</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSpecificPerson(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  !isSpecificPerson
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>No, Whole Group</span>
              </button>
            </div>
          </div>

          {/* If Specific Person: Select Traveler from ALL participants */}
          {isSpecificPerson && (
            <div className="animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Traveler (Whose portion / ticket is refunded) *
              </label>
              <select
                value={beneficiaryMemberId}
                onChange={(e) => setBeneficiaryMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
              >
                {members.map((m) => {
                  const statusLabel = m.status === 'active' ? 'Active' : m.status === 'left' ? 'Left trip' : 'Removed';
                  return (
                    <option key={m.id} value={m.id}>
                      {m.display_name} ({statusLabel})
                    </option>
                  );
                })}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Includes all trip participants, including members who have left or been removed.
              </span>
            </div>
          )}

          {/* Optional Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Refund (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Cancelled his activity slot early / Bad weather cancellation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Real-Time Financial Settlement Impact Preview Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Automated Settlement Consequence:
            </span>
            {isSpecificPerson ? (
              isSelfRefund ? (
                <div className="text-[11px] text-slate-600 leading-relaxed bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                  <strong className="text-emerald-900 block mb-0.5">🛡️ Self-Paid Expense Refund:</strong>
                  Since <strong>{payer?.display_name || 'Traveler'}</strong> paid for this expense themselves and also received the vendor refund, <strong>there will be ₹0 change in group settlement debts</strong>.
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 leading-relaxed bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200 space-y-1">
                  <strong className="text-indigo-950 block">⚖️ Debt Reduction / Adjustment:</strong>
                  <p>
                    <strong>{payer?.display_name}</strong> originally fronted the payment for <strong>{beneficiary?.display_name}</strong> and received the refund back from the vendor.
                  </p>
                  <p className="text-indigo-900 font-medium">
                    &bull; <strong>{beneficiary?.display_name}&rsquo;s</strong> debt of ₹{numAmount.toLocaleString()} to <strong>{payer?.display_name}</strong> will be <strong>nullified</strong>.
                  </p>
                  <p className="text-indigo-900 font-medium">
                    &bull; If {payer?.display_name} already owes {beneficiary?.display_name}, ₹{numAmount.toLocaleString()} will be added to it.
                  </p>
                </div>
              )
            ) : (
              <div className="text-[11px] text-slate-600 leading-relaxed bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200">
                <strong className="text-indigo-950 block mb-0.5">👥 Group-Wide Refund:</strong>
                ₹{numAmount.toLocaleString()} will be credited equally across all active group travelers, reducing each person&rsquo;s individual share liability proportionally.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? 'Recording...' : 'Record & Apply Refund'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
