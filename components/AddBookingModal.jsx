'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Building, Users, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';

export default function AddBookingModal({ isOpen, onClose, tripId, members = [], onBookingAdded }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('hotel');
  const [vendorName, setVendorName] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [startTime, setStartTime] = useState('');
  const [cost, setCost] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState(members[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState(members.map(m => m.id));
  const [splitMethod, setSplitMethod] = useState('equal');
  
  // Custom split parameters
  const [customMap, setCustomMap] = useState({});
  const [splitPreview, setSplitPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-initialize paidBy and selected members
  useEffect(() => {
    if (members.length > 0) {
      if (!paidByMemberId) setPaidByMemberId(members[0].id);
      if (selectedMemberIds.length === 0) setSelectedMemberIds(members.map(m => m.id));
    }
  }, [members]);

  // Compute live split preview whenever inputs change
  useEffect(() => {
    const numCost = parseFloat(cost);
    if (!isNaN(numCost) && numCost > 0 && selectedMemberIds.length > 0) {
      try {
        const preview = calculateSplit({
          method: splitMethod,
          totalAmount: numCost,
          allMemberIds: members.map(m => m.id),
          selectedMemberIds,
          customMap
        });
        setSplitPreview(preview);
        setError('');
      } catch (err) {
        setSplitPreview([]);
      }
    } else {
      setSplitPreview([]);
    }
  }, [cost, splitMethod, selectedMemberIds, customMap, members]);

  if (!isOpen) return null;

  const toggleMember = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const selectAll = () => {
    setSelectedMemberIds(members.map(m => m.id));
  };

  const handleCustomValueChange = (memberId, val) => {
    setCustomMap(prev => ({
      ...prev,
      [memberId]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cost || parseFloat(cost) <= 0) {
      setError('Please enter a valid cost');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Please select at least one participating traveler');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${tripId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          vendorName,
          bookingReference,
          startTime: startTime || new Date().toISOString(),
          cost: parseFloat(cost),
          paidByMemberId,
          participantMemberIds: selectedMemberIds,
          splitMethod,
          customMap
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create booking');
      }

      onBookingAdded(data.booking);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Itinerary Booking</h2>
            <p className="text-xs text-slate-500">Connect hotel, flight, or activity to group financial ledger</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Grand Beach Resort 3 Nights"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
              >
                <option value="hotel">🏨 Hotel / Stay</option>
                <option value="flight">✈️ Flight</option>
                <option value="train">🚆 Train</option>
                <option value="bus">🚌 Bus</option>
                <option value="cab">🚕 Cab / Rental Vehicle</option>
                <option value="activity">🤿 Activity / Tour</option>
                <option value="meal">🍽️ Group Meal</option>
                <option value="other">📦 Other Booking</option>
              </select>
            </div>
          </div>

          {/* Vendor Name & Booking Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Booking Platform</label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. MakeMyTrip / Airbnb"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference # (Optional)</label>
              <input
                type="text"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                placeholder="e.g. MMT-8921-GOA"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Cost & Who Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Cost (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="25000"
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Who Fronted Payment?</label>
              <select
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participating Members Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Who Participates in this Booking? ({selectedMemberIds.length}/{members.length})
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-indigo-600 font-semibold hover:underline"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map(m => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`p-2 rounded-xl text-left border text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{m.display_name.split(' ')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Method Selector (8-Way Split Engine) */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              Split Method <span className="text-indigo-600 font-normal">(Deterministic Engine)</span>
            </label>

            <select
              value={splitMethod}
              onChange={(e) => setSplitMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="equal">⚖️ Equal Split (Split evenly among participants)</option>
              <option value="activity_based">🎯 Activity-Based (Only selected travelers share)</option>
              <option value="percentage">📊 Percentage Split (Custom % per person)</option>
              <option value="shares">🔢 Shares Split (e.g. 2 shares, 1 share)</option>
              <option value="exact">💵 Exact Amounts (Enter exact rupee figures)</option>
            </select>
          </div>

          {/* Custom Percentage / Shares Input fields if applicable */}
          {(splitMethod === 'percentage' || splitMethod === 'shares' || splitMethod === 'exact') && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Assign {splitMethod === 'percentage' ? 'Percentages (%)' : splitMethod === 'shares' ? 'Shares (e.g. 1, 2)' : 'Exact Amounts (₹)'}:
              </span>
              <div className="space-y-1.5">
                {selectedMemberIds.map(memId => {
                  const member = members.find(m => m.id === memId);
                  return (
                    <div key={memId} className="flex items-center justify-between text-xs gap-3">
                      <span className="text-slate-700 font-medium truncate">{member?.display_name}:</span>
                      <input
                        type="number"
                        placeholder={splitMethod === 'percentage' ? '20' : splitMethod === 'shares' ? '1' : '1000'}
                        value={customMap[memId] || ''}
                        onChange={(e) => handleCustomValueChange(memId, e.target.value)}
                        className="w-24 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time Calculation Preview */}
          {splitPreview.length > 0 && (
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Deterministic Split Calculation Preview:
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {splitPreview.map(p => {
                  const member = members.find(m => m.id === p.memberId);
                  return (
                    <div key={p.memberId} className="flex items-center justify-between bg-white/80 p-2 rounded-lg border border-indigo-100/50">
                      <span className="text-slate-700 truncate">{member?.display_name?.split(' ')[0]}:</span>
                      <span className="font-mono font-bold text-indigo-950">₹{Number(p.shareAmount || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Saving...' : 'Add to Master Itinerary'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
