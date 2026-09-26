'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import CreateTripModal from '@/components/CreateTripModal';
import JoinTripModal from '@/components/JoinTripModal';
import { 
  Plus, 
  KeyRound, 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Compass
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const fetchTrips = async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/trips?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips || []);
      }
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrips();
    } else if (!authLoading) {
      setTrips([]);
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleTripCreated = (newTrip) => {
    fetchTrips();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Hero Welcome & Actions Bar */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative blur */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Living Verified Travel Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {user ? `Welcome back, ${profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Traveler'}! ✈️` : 'Welcome to TripSync! ✈️'}
            </h1>
            <p className="text-sm text-indigo-100/80 leading-relaxed">
              Coordinate multi-vendor bookings, dynamic recalculation when members leave, and verified UPI settlement.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                  return;
                }
                setIsJoinOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 backdrop-blur transition flex items-center gap-2 shadow-sm"
            >
              <KeyRound className="w-4 h-4 text-indigo-300" />
              Join with Code
            </button>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                  return;
                }
                setIsCreateOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Trip
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dual Governance (Manager & Democratic)</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Dynamic Recalculation Engine</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Mobile UPI Intent & Dynamic QR</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AI & OCR Expense Scanner</span>
          </div>
        </div>
      </div>

      {/* Trips Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Group Trips</h2>
            <p className="text-xs text-slate-500">Active itineraries and verified financial ledgers</p>
          </div>
          <button
            onClick={fetchTrips}
            title="Refresh trips"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Trips Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              You haven&apos;t created or joined any trips yet. Create one or join with a 7-character invite code.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (!user) {
                    router.push('/login');
                    return;
                  }
                  setIsJoinOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Enter Code
              </button>
              <button
                onClick={() => {
                  if (!user) {
                    router.push('/login');
                    return;
                  }
                  setIsCreateOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
              >
                Create a Trip
              </button>
            </div>
          </div>
        ) : (
          /* Trips Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => {
              const isManagerTrip = trip.governance_mode === 'manager_based';
              const roleColor = 
                trip.myRole === 'owner' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                trip.myRole === 'manager' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Governance Mode */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        isManagerTrip 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isManagerTrip ? <ShieldCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {isManagerTrip ? 'Manager-Based' : 'Democratic'}
                      </span>

                      {/* My Role */}
                      {trip.myRole && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${roleColor}`}>
                          {trip.myRole}
                        </span>
                      )}
                    </div>

                    {/* Trip Title & Destination */}
                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition">
                        {trip.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{trip.destination}</span>
                      </div>
                    </div>

                    {/* Description preview */}
                    {trip.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {trip.description}
                      </p>
                    )}

                  </div>

                  {/* Bottom Metadata */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.start_date}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold text-indigo-600 group-hover:translate-x-1 transition">
                      <span>View Ledger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </Link>
              );
            })}
          </div>
        )}

      </div>

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTripCreated={handleTripCreated}
      />
      <JoinTripModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onTripJoined={handleTripCreated}
      />

    </div>
  );
}
