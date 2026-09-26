'use client';

import React from 'react';
import { 
  DollarSign, 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink,
  Users,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';

export default function ExpensesView({
  expenses = [],
  members = [],
  ledger,
  currentUserId,
  onOpenAddExpense,
  onOpenAiAddExpense
}) {
  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberSummary = ledger?.memberSummaries?.find(m => m.memberId === currentMember?.id);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Live Financial Position Banner */}
      {currentMemberSummary && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Your Real-Time Financial Position
            </span>
            <div className="text-xl sm:text-2xl font-black">
              {currentMemberSummary.isCreditor ? (
                <span className="text-emerald-400">You are owed ₹{Number(currentMemberSummary.netBalance || 0).toLocaleString()}</span>
              ) : currentMemberSummary.isDebtor ? (
                <span className="text-amber-300">You owe ₹{Number(Math.abs(currentMemberSummary.netBalance || 0)).toLocaleString()}</span>
              ) : (
                <span className="text-slate-300">All Settled Up (₹0.00)</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Total Fronted: ₹{Number(currentMemberSummary.totalPaid || 0).toLocaleString()} &bull; Total Share: ₹{Number(currentMemberSummary.totalShare || 0).toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
              <div className="text-[10px] text-slate-300 uppercase">Trip Spend</div>
              <div className="text-sm font-bold font-mono">₹{Number(ledger?.totalTripCost || 0).toLocaleString()}</div>
            </div>

            {/* AI Natural Language Quick Add */}
            <button
              onClick={onOpenAiAddExpense}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition flex items-center gap-1.5"
              title="Add expense by speaking or typing plain English"
            >
              <Zap className="w-4 h-4 text-violet-200" />
              AI Quick Add
            </button>

            {/* Standard Add Expense */}
            <button
              onClick={onOpenAddExpense}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No Expenses Recorded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Record ad-hoc trip expenses like group meals, highway tolls, or snacks.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onOpenAiAddExpense}
              className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              AI Quick Add
            </button>
            <button
              onClick={onOpenAddExpense}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Add First Expense
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => {
            const payer = members.find(m => m.id === expense.paid_by_member_id);
            const myAlloc = expense.allocations?.find(a => a.memberId === currentMember?.id);

            return (
              <div
                key={expense.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                      {expense.category}
                    </span>

                    {/* Verification Status */}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      expense.verification_status === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : expense.verification_status === 'disputed'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {expense.verification_status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span className="capitalize">{expense.verification_status.replace('_', ' ')}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">{expense.date}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{expense.title}</h4>
                  
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>Paid by <strong className="text-slate-800">{payer?.display_name || 'Group Member'}</strong></span>
                    {expense.extracted_details?.utr && (
                      <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.2 rounded border">
                        UTR: {expense.extracted_details.utr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Financial Liability */}
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-base font-extrabold text-slate-900">
                    ₹{Number(expense.total_amount || 0).toLocaleString()}
                  </div>
                  {myAlloc ? (
                    <div className="text-xs text-indigo-600 font-semibold font-mono">
                      Your share: ₹{Number(myAlloc.shareAmount ?? myAlloc.amount ?? 0).toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Did not participate</div>
                  )}
                  <div className="text-[10px] text-slate-400 capitalize">
                    {expense.split_method.replace('_', ' ')}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
