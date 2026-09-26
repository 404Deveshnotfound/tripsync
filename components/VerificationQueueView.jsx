'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Receipt, 
  Camera, 
  ThumbsUp, 
  ThumbsDown,
  DollarSign,
  ExternalLink,
  Users
} from 'lucide-react';

export default function VerificationQueueView({
  tripId,
  expenses = [],
  members = [],
  isManager = false,
  isDemocratic = false,
  currentUserId,
  onVerificationUpdated
}) {
  const [loadingId, setLoadingId] = useState(null);

  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;

  const pendingExpenses = expenses.filter(e => e.verification_status === 'pending_verification');
  const verifiedExpenses = expenses.filter(e => e.verification_status === 'verified');
  const disputedExpenses = expenses.filter(e => e.verification_status === 'disputed');

  const handleVerify = async (expenseId, action) => {
    setLoadingId(expenseId);
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          verifiedByMemberId: currentMemberId
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onVerificationUpdated) onVerificationUpdated();
      }
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Pending Verification</span>
            <span className="text-xl font-bold text-slate-900">{pendingExpenses.length} item(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Verified & Settled</span>
            <span className="text-xl font-bold text-slate-900">{verifiedExpenses.length} item(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Disputed / Mismatched</span>
            <span className="text-xl font-bold text-slate-900">{disputedExpenses.length} item(s)</span>
          </div>
        </div>

      </div>

      {/* Pending Items Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Items Awaiting Multi-Tier Verification</h3>
          </div>
        </div>

        {pendingExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">All Expenses Verified!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No expenses currently require receipts, manager approval, or in-chat voting polls.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingExpenses.map((exp) => {
              const payer = members.find(m => m.id === exp.paid_by_member_id);
              const isPayerMe = exp.paid_by_member_id === currentMemberId;
              const isProofMissing = exp.proof_type === 'no_proof';

              return (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                          {exp.category}
                        </span>
                        
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending Verification
                        </span>

                        <span className="text-[11px] text-slate-400 font-mono">{exp.date}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{exp.title}</h4>
                      
                      <p className="text-xs text-slate-500">
                        Paid: <strong>₹{exp.total_amount}</strong> by {payer?.display_name || 'Traveler'} &bull; Mode:{' '}
                        <span className="font-semibold capitalize">{exp.proof_type.replace('_', ' ')}</span>
                      </p>
                    </div>

                    {/* Action Buttons based on Role & Verification Mode */}
                    <div className="flex items-center gap-2 shrink-0">
                      
                      {/* Manager Mode Approval */}
                      {isManager && (
                        <button
                          onClick={() => handleVerify(exp.id, 'approve')}
                          disabled={loadingId === exp.id}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {loadingId === exp.id ? 'Approving...' : 'Manager Approve'}
                        </button>
                      )}

                      {/* Dispute button */}
                      <button
                        onClick={() => handleVerify(exp.id, 'dispute')}
                        disabled={loadingId === exp.id}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition"
                      >
                        Dispute
                      </button>

                    </div>

                  </div>

                  {/* Verification Explainer Notice */}
                  {isProofMissing && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        No Proof Attached:
                      </div>
                      <p className="text-[11px] text-amber-700/90 leading-relaxed">
                        {isDemocratic 
                          ? 'This expense has an active voting poll in the Trip Chat. When group members vote to approve it, it will be automatically verified.'
                          : 'As a Manager-Based trip, only the Trip Owner or assigned Managers can verify this un-receipted expense.'}
                      </p>
                    </div>
                  )}

                  {/* Mismatch Alert Preview if applicable */}
                  {exp.extracted_details?.amount && exp.extracted_details.amount !== exp.total_amount && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        ⚠️ <strong>Amount Mismatch Flag:</strong> Entered ₹{exp.total_amount}, but payment screenshot evidence shows ₹{exp.extracted_details.amount}.
                      </span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
