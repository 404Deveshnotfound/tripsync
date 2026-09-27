'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { X, KeyRound, ArrowRight } from 'lucide-react';

export default function JoinTripModal({ isOpen, onClose, onTripJoined }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to join a trip');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/trips/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          userId: user.id,
          userDisplayName: profile?.full_name || user.email?.split('@')[0],
          userUpiId: profile?.upi_id || ''
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to join trip');
      }

      if (onTripJoined) {
        onTripJoined(data.trip);
      }
      onClose();
      router.push(`/trips/${data.trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-md rounded-2xl shadow-2xl border border-[#272526] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1d1b1c] flex items-center justify-between bg-[#0a0a0b]">
          <div>
            <h2 className="text-lg font-bold text-[#f2eee5]">Join a Group Trip</h2>
            <p className="text-xs text-[#9c9791]">Enter the 7-character trip invite code</p>
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
          <div>
            <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Trip Invite Code</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. GOA2026 or SNOW2026"
                className="w-full pl-9 pr-3 py-2.5 text-sm uppercase tracking-wider font-mono font-bold border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
              />
            </div>
            <p className="text-[11px] text-[#9c9791] mt-1">
              Ask your trip organizer or check your group chat for the invite code.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#9c9791] hover:text-[#f2eee5] hover:bg-[#151516] rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-[#f2eee5] bg-[#9d1117] hover:bg-[#7a0d12] rounded-lg shadow-sm shadow-[#9d1117]/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Joining...' : 'Join Trip'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
