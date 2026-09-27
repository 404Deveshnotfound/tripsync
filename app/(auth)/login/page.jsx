'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GoogleAuthButton from '@/components/GoogleAuthButton';
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, isMockMode } = useAuth();
  const [email, setEmail] = useState('rahul@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) setError(err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn(email, password);
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
    <div className="max-w-md mx-auto my-12 bg-[#101011] p-8 rounded-2xl border border-[#272526] shadow-sm">
      <div className="text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-[#9d1117]/10 text-[#d8c49d] items-center justify-center mb-3 border border-[#6c1b1f]">
          <span className="font-serif font-bold text-lg">TS</span>
        </div>
        <h1 className="text-2xl font-bold text-[#f2eee5]">Welcome Back</h1>
        <p className="text-sm text-[#9c9791] mt-1">Log in to manage your group trips & verified ledger</p>
      </div>

      {isMockMode && (
        <div className="mb-6 p-3 rounded-xl bg-[#9d1117]/10 border border-[#9d1117]/30 text-xs text-[#d8c49d] flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#d8c49d] mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Demo Sandbox Active:</span> You can sign in with sample accounts:
            <span className="font-mono block mt-1">rahul@example.com (Owner)</span>
            <span className="font-mono block">amit@example.com (Manager)</span>
            <span className="font-mono block">priya@example.com (Participant)</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-900/20 border border-rose-700/30 text-xs text-[#e18a8a]">
          {error}
        </div>
      )}

      {/* Google Identity Services Native Button */}
      <div className="w-full">
        <GoogleAuthButton
          text="continue_with"
          onSuccess={() => router.push('/')}
          onError={(msg) => setError(msg)}
        />
      </div>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="border-t border-[#272526] w-full" />
        <span className="bg-[#101011] px-3 text-[11px] text-[#9c9791] font-semibold uppercase tracking-wider absolute">
          or sign in with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          className="w-full py-2.5 px-4 bg-gradient-to-b from-[#e2d0a8] to-[#c5ae7f] hover:from-[#ecdbb5] hover:to-[#d4bd8e] text-[#0b0a09] font-semibold rounded-lg shadow-sm shadow-[#d8c49d]/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 border border-[#b79f70]"
        >
          {loading ? 'Signing in...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[#9c9791]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#d8c49d] font-semibold hover:underline">
          Create one now
        </Link>
      </div>
    </div>
  );
}
