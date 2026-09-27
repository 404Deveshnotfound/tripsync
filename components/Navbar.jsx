'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockUsers } from '@/lib/mockStore';
import CompleteProfileModal from '@/components/CompleteProfileModal';
import { Users, Wifi, WifiOff, LogOut, Shield, Compass, Sparkles, RotateCcw, QrCode } from 'lucide-react';

export default function Navbar() {
  const { user, profile, isMockMode, signOut, switchMockUser } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user && profile && (!profile.upi_id || profile.upi_id.trim() === '')) {
      const prompted = sessionStorage.getItem('tripsync_prompted_upi_' + user.id);
      if (!prompted) {
        setIsProfileModalOpen(true);
        sessionStorage.setItem('tripsync_prompted_upi_' + user.id, 'true');
      }
    }
  }, [user, profile]);

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur border-b border-[#272526]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a91f24] to-[#4b090c] flex items-center justify-center text-white shadow-md shadow-[#9d1117]/20 group-hover:scale-105 transition border border-[#6c1b1f]">
            <span className="font-serif font-bold text-base">TS</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl text-[#f2eee5] tracking-tight">TripSync</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#9d1117]/15 text-[#d8c49d] uppercase tracking-wide">Ledger</span>
            </div>
            <p className="text-[11px] text-[#9c9791] hidden sm:block">Living Verified Travel Ledger</p>
          </div>
        </Link>

        {/* Right Section: Status, User Switcher, Profile */}
        <div className="flex items-center gap-3">

          {/* Network Indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-900/20 text-emerald-400 border-emerald-700/30' 
              : 'bg-amber-900/20 text-amber-300 border-amber-700/30 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* Mock Demo Role Switcher for Hackathon Testing */}
          {isMockMode && user && (
            <div className="hidden lg:flex items-center gap-1.5 bg-[#151516] p-1 rounded-lg border border-[#272526] text-xs">
              <span className="text-[#9c9791] font-medium px-2 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#d8c49d]" />
                Role:
              </span>
              <select
                value={user.id}
                onChange={(e) => switchMockUser(e.target.value)}
                className="bg-[#0a0a0b] border border-[#272526] rounded px-2 py-0.5 text-xs font-semibold text-[#f2eee5] focus:outline-none focus:ring-1 focus:ring-[#9d1117] cursor-pointer"
              >
                {mockUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.id === 'usr-1' ? 'Owner' : u.id === 'usr-2' ? 'Manager' : 'Participant'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Reset Demo Button */}
          {isMockMode && (
            <button
              onClick={async () => {
                try {
                  await fetch('/api/seed', { method: 'POST' });
                  window.location.reload();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="hidden xl:flex items-center gap-1 px-2.5 py-1 bg-amber-900/20 hover:bg-amber-900/30 text-amber-300 border border-amber-700/30 rounded-lg text-xs font-semibold transition"
              title="Reset all demo trips, expenses, and balances to default pristine state"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset Demo</span>
            </button>
          )}

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* If no UPI ID, show link button */}
              {(!profile?.upi_id || profile.upi_id.trim() === '') && (
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-900/20 hover:bg-amber-900/30 text-amber-300 border border-amber-700/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5 animate-pulse"
                  title="Link your UPI ID to receive settlements"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Link UPI</span>
                </button>
              )}

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#1d1b1c] transition group text-left"
                title="Click to edit profile & UPI ID"
              >
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-[#f2eee5] group-hover:text-[#d8c49d] transition">
                    {profile?.full_name || user.email}
                  </div>
                  <div className="text-[10px] text-[#9c9791] font-mono">
                    {profile?.upi_id || 'No UPI ID'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#a91f24] to-[#4b090c] text-white font-bold flex items-center justify-center text-sm shadow">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
              </button>

              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 text-[#9c9791] hover:text-[#e18a8a] hover:bg-rose-900/20 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-[#9c9791] hover:text-[#d8c49d] transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#9d1117] hover:bg-[#7a0d12] rounded-lg shadow-sm shadow-[#9d1117]/20 transition"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>

      </div>

      {/* Complete Profile & UPI ID Modal */}
      <CompleteProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

    </header>
  );
}
