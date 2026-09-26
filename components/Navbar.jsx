'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { mockUsers } from '@/lib/mockStore';
import { Plane, Users, Wifi, WifiOff, LogOut, Shield, Compass, Sparkles, RotateCcw } from 'lucide-react';

export default function Navbar() {
  const { user, profile, isMockMode, signOut, switchMockUser } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

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

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xl text-slate-900 tracking-tight">TripSync</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">Ledger</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Living Verified Travel Ledger</p>
          </div>
        </Link>

        {/* Right Section: Status, User Switcher, Profile */}
        <div className="flex items-center gap-3">

          {/* Network Indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* Mock Demo Role Switcher for Hackathon Testing */}
          {isMockMode && user && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium px-2 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-600" />
                Role:
              </span>
              <select
                value={user.id}
                onChange={(e) => switchMockUser(e.target.value)}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
              className="hidden xl:flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition"
              title="Reset all demo trips, expenses, and balances to default pristine state"
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>Reset Demo</span>
            </button>
          )}

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-900">{profile?.full_name || user.email}</div>
                <div className="text-[10px] text-slate-500 font-mono">{profile?.upi_id || 'No UPI ID'}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold flex items-center justify-center text-sm shadow">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
