'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { QrCode, Smartphone, User, X, Check, Sparkles, ShieldCheck } from 'lucide-react';

export default function CompleteProfileModal({ isOpen, onClose }) {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUpiId(profile.upi_id || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  if (!isOpen) return null;

  const popularUpiHandles = ['@oksbi', '@paytm', '@ybl', '@okhdfcbank', '@okaxis'];

  const handleApplyHandle = (handle) => {
    const currentBase = upiId.includes('@') ? upiId.split('@')[0] : upiId;
    setUpiId((currentBase || 'myupi') + handle);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setError('Please enter your UPI ID to receive settlements');
      return;
    }

    setLoading(true);
    setError('');

    const res = await updateProfile({
      fullName: fullName.trim(),
      upiId: upiId.trim(),
      phone: phone.trim()
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onClose) onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Link Settlement UPI ID</h2>
              <p className="text-[11px] text-slate-500">Enable automatic UPI settlement payouts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Welcome Info Box */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Why is this needed?</span>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                TripSync uses your UPI ID to generate dynamic QR codes and deep links so friends can pay their split shares directly to you with zero commission.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>UPI ID saved successfully!</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* UPI ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your UPI ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-indigo-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="name@oksbi or 9876543210@paytm"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            
            {/* Quick Handle Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Quick handles:</span>
              {popularUpiHandles.map((handle) => (
                <button
                  type="button"
                  key={handle}
                  onClick={() => handleApplyHandle(handle)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md text-[10px] font-mono font-medium transition"
                >
                  {handle}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-slate-400 font-normal">(Optional, for trip updates)</span>
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading || savedSuccess}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-200 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save UPI &amp; Continue</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
