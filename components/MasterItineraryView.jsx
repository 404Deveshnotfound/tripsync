'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Users, 
  Building, 
  Plane, 
  Car, 
  Utensils, 
  Compass, 
  CheckCircle2, 
  Clock, 
  Filter,
  UserCheck,
  Globe
} from 'lucide-react';

const categoryIcons = {
  hotel: Building,
  flight: Plane,
  train: Compass,
  bus: Compass,
  cab: Car,
  activity: Compass,
  meal: Utensils,
  other: Calendar,
};

export default function MasterItineraryView({
  bookings = [],
  members = [],
  currentUserId,
  canAddBooking = true,
  onOpenAddModal
}) {
  const [filterMode, setFilterMode] = useState('master'); // 'master' | 'personal'
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Identify current member ID
  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;

  // Filter bookings based on master vs personal itinerary
  const filteredBookings = bookings.filter(b => {
    // Category filter
    if (selectedCategory !== 'all' && b.category !== selectedCategory) {
      return false;
    }
    // Master vs Personal
    if (filterMode === 'personal') {
      return b.participant_member_ids?.includes(currentMemberId);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Controls Bar: Master/Personal Toggle, Category Filters, Add Booking Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Toggle: Master Itinerary vs Personal Schedule */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterMode('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              filterMode === 'master'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Master Itinerary ({bookings.length})
          </button>
          
          <button
            onClick={() => setFilterMode('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              filterMode === 'personal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            My Personal Schedule
          </button>
        </div>

        {/* Category Filters & Add Button */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="hotel">🏨 Hotels</option>
            <option value="cab">🚕 Cabs / Rentals</option>
            <option value="activity">🤿 Activities</option>
            <option value="flight">✈️ Flights</option>
            <option value="meal">🍽️ Meals</option>
          </select>

          {canAddBooking && (
            <button
              onClick={onOpenAddModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-200 transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Booking
            </button>
          )}
        </div>

      </div>

      {/* Itinerary List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">
            {filterMode === 'personal' ? 'No Personal Bookings' : 'No Bookings Added Yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {filterMode === 'personal' 
              ? 'You are not enrolled in any bookings under this filter.' 
              : 'Add hotels, flights, or adventure activities to start the verified ledger.'}
          </p>
          {canAddBooking && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Add First Booking
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((booking) => {
            const Icon = categoryIcons[booking.category] || Calendar;
            const payer = members.find(m => m.id === booking.paid_by_member_id);
            const myAllocation = booking.allocations?.find(a => a.memberId === currentMemberId);
            const isParticipant = booking.participant_member_ids?.includes(currentMemberId);
            const cost = booking.current_cost || booking.original_cost;

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Category & Status Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      <Icon className="w-3.5 h-3.5 text-indigo-600" />
                      {booking.category}
                    </span>

                    {booking.booking_reference && (
                      <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {booking.booking_reference}
                      </span>
                    )}
                  </div>

                  {/* Title & Vendor */}
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {booking.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <span>Vendor:</span>
                      <strong className="text-slate-700">{booking.vendor_name}</strong>
                    </p>
                  </div>

                  {/* Location & Time if present */}
                  {booking.location && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{booking.location}</span>
                    </div>
                  )}

                  {/* Participants Roster preview */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center justify-between">
                      <span>Participating Travelers ({booking.participant_member_ids?.length || 0}):</span>
                      {isParticipant && (
                        <span className="text-indigo-600 font-bold">You are participating</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {booking.participant_member_ids?.map((memId) => {
                        const m = members.find(mem => mem.id === memId);
                        const isMe = memId === currentMemberId;
                        return (
                          <span
                            key={memId}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isMe 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-800 font-bold' 
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {m?.display_name?.split(' ')[0] || 'Member'}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Bottom Financial Ledger Breakdown */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Total Booking Cost:</div>
                    <div className="font-extrabold text-slate-900 text-base">
                      ₹{Number(cost || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Fronted by <strong className="text-slate-800">{payer?.display_name?.split(' ')[0] || 'Group'}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                      {isParticipant ? 'Your Allocated Share:' : 'Per Person:'}
                    </div>
                    <div className="font-extrabold text-indigo-700 text-base font-mono">
                      {isParticipant && myAllocation ? (
                        `₹${Number(myAllocation.shareAmount ?? myAllocation.amount ?? 0).toLocaleString()}`
                      ) : (
                        `₹${Number(Math.round((cost || 0) / (booking.participant_member_ids?.length || 1))).toLocaleString()}`
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {booking.split_method.replace('_', ' ')}
                    </div>
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
