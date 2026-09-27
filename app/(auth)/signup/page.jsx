'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import { Lock, Mail, User, Smartphone, QrCode, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signUp({
      email,
      password,
      full_name: fullName,
      upi_id: upiId,
      phone
    });

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await signInWithGoogle();
      if (res?.error) {
        setError(res.error.message);
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Google sign in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-[#101011] p-8 rounded-2xl border border-[#272526] shadow-sm">
      <div className="text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-[#9d1117]/10 text-[#d8c49d] items-center justify-center mb-3 border border-[#6c1b1f]">
          <span className="font-serif font-bold text-lg">TS</span>
        </div>
        <h1 className="text-2xl font-bold text-[#f2eee5]">Create Account</h1>
        <p className="text-sm text-[#9c9791] mt-1">Join or organize multi-vendor group trips</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-900/20 border border-rose-700/30 text-xs text-[#e18a8a]">
          {error}
        </div>
      )}

      {/* Google Identity Services Native Button */}
      <div className="w-full">
        <GoogleAuthButton
          text="signup_with"
          onSuccess={() => router.push('/')}
          onError={(msg) => setError(msg)}
        />
      </div>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="border-t border-[#272526] w-full" />
        <span className="bg-[#101011] px-3 text-[11px] text-[#9c9791] font-semibold uppercase tracking-wider absolute">
          or sign up with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Rahul Sharma"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] rounded-lg bg-[#0a0a0b] text-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@example.com"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] rounded-lg bg-[#0a0a0b] text-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#d8c49d] mb-1">
            Default UPI ID <span className="text-[#9c9791] font-normal">(for receiving settlements)</span>
          </label>
          <div className="relative">
            <QrCode className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="rahul@oksbi"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] rounded-lg bg-[#0a0a0b] text-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-[#9d1117] font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Phone Number</label>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] rounded-lg bg-[#0a0a0b] text-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#d8c49d] mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#9c9791] absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#272526] rounded-lg bg-[#0a0a0b] text-[#f2eee5] focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-gradient-to-b from-[#e2d0a8] to-[#c5ae7f] hover:from-[#ecdbb5] hover:to-[#d4bd8e] text-[#0b0a09] font-semibold rounded-lg shadow-sm shadow-[#d8c49d]/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 border border-[#b79f70]"
        >
          {loading ? 'Creating account...' : 'Create Account'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#9c9791]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#d8c49d] font-semibold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
