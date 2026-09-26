'use client';

import React, { useState, useMemo } from 'react';
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
  Zap, 
  Camera,
  Globe,
  UserCheck,
  Building,
  Plane,
  Car,
  Compass,
  Utensils,
  Tag,
  Filter
} from 'lucide-react';

const categoryIcons = {
  hotel: Building,
  stay: Building,
  flight: Plane,
  train: Compass,
  bus: Compass,
  cab: Car,
  transport: Car,
  activity: Compass,
  meal: Utensils,
  entertainment: Sparkles,
  utilities: Receipt,
  other: DollarSign
};

export default function ExpensesView({
  expenses = [],
  bookings = [],
  members = [],
  ledger,
  currentUserId,
  onOpenAddExpense,
  onOpenAiAddExpense,
  onOpenOcrExpense
}) {
  const [subSection, setSubSection] = useState('master'); // 'master' | 'personal'
  const [selectedCategory, setSelectedCategory] = useState('all');

  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;
  const currentMemberSummary = ledger?.memberSummaries?.find(m => m.memberId === currentMemberId);

  // Normalize both bookings and expenses into a unified transaction stream
  const allTransactions = useMemo(() => {
    const list = [];

    // 1. Process Bookings (Hotels, Flights, etc.)
    bookings.forEach(b => {
      list.push({
        id: b.id,
        isBooking: true,
        title: b.title,
        category: b.category || 'other',
        totalAmount: Number(b.current_cost ?? b.original_cost ?? 0),
        paidByMemberId: b.paid_by_member_id,
        date: b.start_time?.split('T')[0] || b.created_at?.split('T')[0] || 'Scheduled',
        splitMethod: b.split_method || 'equal',
        allocations: b.allocations || [],
        participantMemberIds: b.participant_member_ids || b.allocations?.map(a => a.memberId) || [],
        vendorName: b.vendor_name || null,
        bookingReference: b.booking_reference || null,
        verificationStatus: 'verified',
        proofUrl: null,
        extractedDetails: null,
        raw: b
      });
    });

    // 2. Process Expenses
    expenses.forEach(e => {
      const vendor = e.vendor_name || e.extracted_details?.vendorName;
      const ref = e.booking_reference || e.extracted_details?.bookingReference;
      list.push({
        id: e.id,
        isBooking: Boolean(vendor || ref),
        title: e.title,
        category: e.category || 'meal',
        totalAmount: Number(e.total_amount || 0),
        paidByMemberId: e.paid_by_member_id,
        date: e.date || e.created_at?.split('T')[0] || 'Recent',
        splitMethod: e.split_method || 'equal',
        allocations: e.allocations || [],
        participantMemberIds: e.participant_member_ids || e.allocations?.map(a => a.memberId) || [],
        vendorName: vendor || null,
        bookingReference: ref || null,
        verificationStatus: e.verification_status || 'verified',
        proofUrl: e.proof_url || null,
        extractedDetails: e.extracted_details || null,
        raw: e
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [expenses, bookings]);

  // Filter for Personal sub-section
  const personalTransactions = useMemo(() => {
    if (!currentMemberId) return [];
    return allTransactions.filter(item => {
      const isPayer = item.paidByMemberId === currentMemberId;
      const isParticipant = item.participantMemberIds?.includes(currentMemberId) ||
        item.allocations?.some(a => a.memberId === currentMemberId && (a.shareAmount > 0 || a.amount > 0));
      return isPayer || isParticipant;
    });
  }, [allTransactions, currentMemberId]);

  // Active list based on subSection toggle
  const currentList = subSection === 'personal' ? personalTransactions : allTransactions;

  // Filter by category
  const filteredList = currentList.filter(item => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'stay') return item.category === 'stay' || item.category === 'hotel';
    if (selectedCategory === 'travel') return ['flight', 'train', 'bus', 'cab', 'transport'].includes(item.category);
    return item.category === selectedCategory;
  });

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

            {/* OCR + AI Receipt & UPI Screenshot Scanner */}
            <button
              onClick={onOpenOcrExpense}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              title="Scan UPI payment screenshot or receipt using OCR + AI"
            >
              <Camera className="w-4 h-4 text-emerald-100" />
              Scan Receipt / UPI
            </button>

            {/* AI Natural Language Quick Add */}
            <button
              onClick={onOpenAiAddExpense}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition flex items-center gap-1.5"
              title="Add expense by speaking or typing plain English"
            >
              <Zap className="w-4 h-4 text-violet-200" />
              AI Quick Add
            </button>

            {/* Standard Add Expense & Booking */}
            <button
              onClick={onOpenAddExpense}
              className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Expense / Booking
            </button>
          </div>
        </div>
      )}

      {/* Sub-Section Toggle Bar (Master Log vs My Personal) & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Dual Subsection Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setSubSection('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subSection === 'master'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Master Log ({allTransactions.length})</span>
          </button>

          <button
            onClick={() => setSubSection('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              subSection === 'personal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Personal ({personalTransactions.length})</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="stay">🏨 Stays & Hotels</option>
            <option value="travel">✈️ Flights, Trains & Cabs</option>
            <option value="meal">🍽️ Meals & Drinks</option>
            <option value="activity">🤿 Activities & Tours</option>
            <option value="utilities">🛒 Utilities & Supplies</option>
            <option value="other">📦 Other</option>
          </select>
        </div>

      </div>

      {/* Transactions Feed */}
      {filteredList.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">
            {subSection === 'personal' ? 'No Personal Transactions Found' : 'No Expenses or Bookings Recorded Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {subSection === 'personal'
              ? 'You are not currently involved as a payer or participant in any transactions under this filter.'
              : 'Record flights, hotel bookings, group meals, fuel, or activity tickets.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onOpenOcrExpense}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Receipt / UPI
            </button>
            <button
              onClick={onOpenAiAddExpense}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              AI Quick Add
            </button>
            <button
              onClick={onOpenAddExpense}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Add First Transaction
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const payer = members.find(m => m.id === item.paidByMemberId);
            const isUserPayer = currentMemberId && item.paidByMemberId === currentMemberId;
            const myAlloc = item.allocations?.find(a => a.memberId === currentMemberId);
            const myShareAmount = myAlloc ? Number(myAlloc.shareAmount ?? myAlloc.amount ?? 0) : 0;
            const Icon = categoryIcons[item.category] || categoryIcons.other;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-lg">
                  
                  {/* Category & Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize flex items-center gap-1">
                      <Icon className="w-3 h-3 text-indigo-600" />
                      {item.category}
                    </span>

                    {/* Booking/Itinerary Tag if booking details exist */}
                    {item.vendorName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {item.vendorName}
                        {item.bookingReference && ` • Ref: ${item.bookingReference}`}
                      </span>
                    )}

                    {/* Verification Status */}
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      item.verificationStatus === 'verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.verificationStatus === 'disputed'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {item.verificationStatus === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span className="capitalize">{item.verificationStatus.replace('_', ' ')}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">{item.date}</span>
                  </div>

                  {/* Title */}
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  
                  {/* Payer & Participants Breakdown */}
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>
                      Paid by{' '}
                      <strong className={isUserPayer ? 'text-indigo-600 font-bold' : 'text-slate-800'}>
                        {isUserPayer ? 'You' : payer?.display_name || 'Group Member'}
                      </strong>
                    </span>

                    <span>&bull;</span>

                    <span className="text-slate-600 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.participantMemberIds?.length || item.allocations?.length || members.length} Participants
                    </span>

                    {item.extractedDetails?.utr && (
                      <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.2 rounded border">
                        UTR: {item.extractedDetails.utr}
                      </span>
                    )}

                    {item.proofUrl && (
                      <a
                        href={item.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold transition"
                      >
                        <Camera className="w-3 h-3" />
                        <span>View Proof</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Right Financial Liability */}
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-base font-extrabold text-slate-900">
                    ₹{Number(item.totalAmount || 0).toLocaleString()}
                  </div>

                  {/* Personal liability context */}
                  {isUserPayer ? (
                    <div className="text-xs text-emerald-600 font-bold">
                      You fronted this full payment
                    </div>
                  ) : myAlloc && myShareAmount > 0 ? (
                    <div className="text-xs text-indigo-600 font-semibold font-mono">
                      Your share: ₹{myShareAmount.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Did not participate</div>
                  )}

                  <div className="text-[10px] text-slate-400 capitalize pt-0.5">
                    {item.splitMethod.replace('_', ' ')} Split
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
