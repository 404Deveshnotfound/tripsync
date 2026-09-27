'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, ShieldCheck, Users, Calendar, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';

export default function CreateTripModal({ isOpen, onClose, onTripCreated }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [governanceMode, setGovernanceMode] = useState('manager_based');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to create a trip');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          destination,
          startDate,
          endDate,
          description,
          governanceMode,
          userId: user.id,
          userDisplayName: profile?.full_name || user.email?.split('@')[0],
          userUpiId: profile?.upi_id || ''
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create trip');
      }

      onTripCreated(data.trip);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-lg rounded-2xl shadow-2xl border border-[#272526] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1d1b1c] flex items-center justify-between bg-[#0a0a0b]">
          <div>
            <h2 className="text-lg font-bold text-[#f2eee5]">Create New Group Trip</h2>
            <p className="text-xs text-[#9c9791]">Set up itinerary ledger and governance rules</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9c9791] hover:text-[#f2eee5] hover:bg-[#151516] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-900/20 border border-rose-700/30 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Trip Title & Destination */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Trip Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Goa Beach Vacation 2026"
                className="w-full px-3 py-2 text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Destination</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#9c9791] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. North Goa, India"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#d8c49d] mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
              />
            </div>
          </div>

          {/* Governance Mode Selection (Core Differentiator!) */}
          <div>
            <label className="block text-xs font-semibold text-[#d8c49d] mb-1.5">
              Trip Governance Mode <span className="text-[#d8c49d] font-normal">(Who approves & verifies?)</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option 1: Manager-Based Trip */}
              <div
                onClick={() => setGovernanceMode('manager_based')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  governanceMode === 'manager_based'
                    ? 'border-[#9d1117] bg-[#9d1117]/8 shadow-sm ring-1 ring-[#9d1117]'
                    : 'border-[#272526] hover:border-[#272526] bg-[#101011]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#f2eee5]">
                    <ShieldCheck className="w-4 h-4 text-[#d8c49d]" />
                    Manager-Based
                  </div>
                  {governanceMode === 'manager_based' && (
                    <CheckCircle2 className="w-4 h-4 text-[#d8c49d]" />
                  )}
                </div>
                <p className="text-[11px] text-[#9c9791] leading-relaxed">
                  Trip Owner & Managers hold authority. Expenses without receipts require Manager approval.
                </p>
              </div>

              {/* Option 2: Group-Members Based (Democratic) Trip */}
              <div
                onClick={() => setGovernanceMode('democratic')}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  governanceMode === 'democratic'
                    ? 'border-[#9d1117] bg-[#9d1117]/8 shadow-sm ring-1 ring-[#9d1117]'
                    : 'border-[#272526] hover:border-[#272526] bg-[#101011]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#f2eee5]">
                    <Users className="w-4 h-4 text-[#a8c49b]" />
                    Democratic (Group)
                  </div>
                  {governanceMode === 'democratic' && (
                    <CheckCircle2 className="w-4 h-4 text-[#d8c49d]" />
                  )}
                </div>
                <p className="text-[11px] text-[#9c9791] leading-relaxed">
                  Flat hierarchy. All members contribute. No-proof expenses trigger in-chat voting polls.
                </p>
              </div>

            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Friends road trip staying at beach villa, renting self-drive Thar, and scuba diving."
              className="w-full px-3 py-2 text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#9c9791] hover:bg-[#151516] hover:text-[#f2eee5] rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-[#f2eee5] bg-[#9d1117] hover:bg-[#7a0d12] rounded-lg shadow-sm shadow-[#9d1117]/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Creating...' : 'Create Trip & Ledger'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
