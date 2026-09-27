'use client';

import React from 'react';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  QrCode, 
  Sparkles,
  MapPin,
  Building,
  HelpCircle
} from 'lucide-react';

export default function PersonalDashboardView({
  members = [],
  bookings = [],
  expenses = [],
  transfers = [],
  ledger,
  currentUserId,
  onNavigateToSettle
}) {
  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;
  const mySummary = ledger?.memberSummaries?.find(s => s.memberId === currentMemberId);

  // My personal bookings
  const myBookings = bookings.filter(b => b.participant_member_ids?.includes(currentMemberId));
  
  // Expenses I participated in
  const myParticipatingExpenses = expenses.filter(e => 
    e.allocations?.some(a => a.memberId === currentMemberId && a.shareAmount > 0)
  );

  // Expenses I paid for
  const expensesIPaid = expenses.filter(e => e.paid_by_member_id === currentMemberId);

  // My settlements
  const myOutgoingSettlements = transfers.filter(t => t.payerMemberId === currentMemberId);
  const myIncomingSettlements = transfers.filter(t => t.receiverMemberId === currentMemberId);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1a090a] via-[#0d0b0c] to-[#050505] text-white rounded-3xl p-6 sm:p-8 border border-[#272526] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs text-[#d8c49d] font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Personal Traveler Hub
            </span>
            <h2 className="text-2xl font-black">
              {currentMember?.display_name || 'Traveler'}&apos;s Trip Ledger
            </h2>
            <p className="text-xs text-[#9c9791]">
              Your personal itinerary, enrolled bookings, fronted payments, and settlement requirements.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-right shrink-0">
            <span className="text-[10px] text-[#9c9791] uppercase tracking-wider block">Your Net Position</span>
            <div className={`text-2xl font-black font-mono mt-0.5 ${
              mySummary?.isCreditor ? 'text-emerald-400' :
              mySummary?.isDebtor ? 'text-amber-300' :
              'text-[#9c9791]'
            }`}>
              {mySummary?.isCreditor ? `+₹${Number(mySummary.netBalance || 0).toLocaleString()}` :
               mySummary?.isDebtor ? `-₹${Number(Math.abs(mySummary.netBalance || 0)).toLocaleString()}` :
               '₹0.00'}
            </div>
            <span className="text-[11px] text-[#9c9791]">
              {mySummary?.isCreditor ? 'You should receive' : mySummary?.isDebtor ? 'You need to pay' : 'All Settled'}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm space-y-1">
          <span className="text-xs text-[#9c9791] font-semibold uppercase tracking-wider block">Total Amount You Paid</span>
          <div className="text-2xl font-black text-[#f2eee5] font-mono">
            ₹{Number(mySummary?.totalPaid || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#9c9791]">
            Fronted for group activities and bookings
          </span>
        </div>

        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm space-y-1">
          <span className="text-xs text-[#d8c49d] font-semibold uppercase tracking-wider block">Your Actual Share</span>
          <div className="text-2xl font-black text-[#d8c49d] font-mono">
            ₹{Number(mySummary?.totalShare || 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-[#9c9791]">
            Across {myBookings.length} bookings &amp; {myParticipatingExpenses.length} meals/expenses
          </span>
        </div>

        <div className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm space-y-1">
          <span className="text-xs text-[#a8c49b] font-semibold uppercase tracking-wider block">Active Enrolled Events</span>
          <div className="text-2xl font-black text-[#a8c49b] font-mono">
            {myBookings.length} Bookings
          </div>
          <span className="text-[11px] text-[#9c9791]">
            Included in your personal schedule
          </span>
        </div>

      </div>

      {/* Personal Settlement Action Banner */}
      {myOutgoingSettlements.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-amber-300">Pending Settlement Payments</h3>
              <p className="text-xs text-amber-300">
                You have {myOutgoingSettlements.length} payment(s) to settle with your travel group.
              </p>
            </div>
            <button
              onClick={onNavigateToSettle}
              className="px-4 py-2 bg-[#d42a2f] hover:bg-[#a91f24] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              Pay via UPI
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {myOutgoingSettlements.map(st => (
              <div key={st.id} className="bg-[#101011] p-3.5 rounded-xl border border-amber-700/30 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#f2eee5]">Pay {st.receiverName}</span>
                  <div className="text-[11px] text-[#9c9791] font-mono">UPI: {st.receiverUpiId}</div>
                </div>
                <div className="font-black font-mono text-[#f2eee5] text-sm">
                  ₹{Number(st.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Schedule List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[#f2eee5] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#d8c49d]" />
          Your Personal Itinerary Schedule
        </h3>

        {myBookings.length === 0 ? (
          <div className="bg-[#101011] p-8 rounded-2xl border border-[#272526] text-center text-xs text-[#9c9791]">
            You are not currently enrolled in any itinerary bookings.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myBookings.map(b => {
              const myAlloc = b.allocations?.find(a => a.memberId === currentMemberId);
              return (
                <div key={b.id} className="bg-[#101011] p-5 rounded-2xl border border-[#272526] shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#d8c49d] text-[10px]">
                      {b.category}
                    </span>
                    <span className="text-[#9c9791] font-mono text-[10px]">
                      {b.booking_reference}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#f2eee5] text-sm">{b.title}</h4>
                  <div className="text-xs text-[#9c9791] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#9c9791]" />
                    <span>{b.location || b.vendor_name}</span>
                  </div>
                  <div className="pt-2 border-t border-[#272526] flex items-center justify-between text-xs">
                    <span className="text-[#9c9791]">Your Share:</span>
                    <span className="font-extrabold text-[#d8c49d] font-mono">
                      ₹{Number(myAlloc?.shareAmount ?? myAlloc?.amount ?? 0).toLocaleString()}
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
