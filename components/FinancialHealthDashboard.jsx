'use client';

import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

const CATEGORY_COLORS = {
  hotel: '#6366f1', // Indigo
  flight: '#0ea5e9', // Sky
  cab: '#f59e0b',   // Amber
  activity: '#10b981', // Emerald
  meal: '#ec4899',   // Pink
  other: '#8b5cf6'   // Violet
};

export default function FinancialHealthDashboard({
  ledger,
  bookings = [],
  expenses = [],
  members = []
}) {
  const totalSpend = ledger?.totalTripCost || 0;
  
  // Calculate verified vs unverified totals
  let verifiedAmount = 0;
  let unverifiedAmount = 0;
  let disputedAmount = 0;

  bookings.forEach(b => {
    verifiedAmount += Number(b.current_cost || b.original_cost || 0);
  });

  expenses.forEach(e => {
    const amt = Number(e.total_amount || 0);
    if (e.verification_status === 'verified') {
      verifiedAmount += amt;
    } else if (e.verification_status === 'disputed') {
      disputedAmount += amt;
    } else {
      unverifiedAmount += amt;
    }
  });

  // Calculate total refunds
  const totalRefunds = bookings.reduce((acc, b) => acc + Number(b.refund_amount || 0), 0);

  // Total collected/fronted vs total liabilities
  const totalFronted = ledger?.memberSummaries?.reduce((acc, m) => acc + m.totalPaid, 0) || totalSpend;

  // Prepare Category Pie Chart Data
  const categoryData = Object.entries(ledger?.categoryTotals || {}).map(([cat, total]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: total,
    color: CATEGORY_COLORS[cat] || '#94a3b8'
  })).filter(c => c.value > 0);

  // Prepare Member Spending Bar Chart Data
  const memberBarData = ledger?.memberSummaries?.map(m => ({
    name: m.displayName.split(' ')[0],
    Fronted: m.totalPaid,
    Share: m.totalShare,
    net: m.netBalance
  })) || [];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Executive Trip Financial Health
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          Financial Health, Category Allocations &amp; Spending Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          Complete transparent accounting across all multi-vendor contracts, ad-hoc expenses, verification queues, and individual liabilities.
        </p>
      </div>

      {/* 4 Financial Health Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Trip Spend</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{totalSpend.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Across {bookings.length} bookings &amp; {expenses.length} expenses
          </span>
        </div>

        {/* Verified vs Unverified */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider block">Verified Spend</span>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            ₹{verifiedAmount.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            {unverifiedAmount > 0 ? `₹${unverifiedAmount.toLocaleString()} pending verification` : '100% authenticated'}
          </span>
        </div>

        {/* Refunds Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs text-indigo-600 font-semibold uppercase tracking-wider block">Refunds &amp; Savings</span>
          <div className="text-2xl font-black text-indigo-600 font-mono">
            ₹{totalRefunds.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Returned directly to member balances
          </span>
        </div>

        {/* Risk / Disputed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider block">Unverified / Disputed</span>
          <div className="text-2xl font-black text-amber-600 font-mono">
            ₹{(unverifiedAmount + disputedAmount).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400">
            Requires Manager or Group Poll sign-off
          </span>
        </div>

      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Breakdown Donut Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Category Spending Distribution</h3>
            </div>
            <span className="text-xs text-slate-400">By Vendor Type</span>
          </div>

          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Spend']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs text-slate-700 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Member Spending vs Share Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Member Contributions: Paid vs. Share</h3>
            </div>
            <span className="text-xs text-slate-400">In ₹ INR</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend formatter={(val) => <span className="text-xs font-medium text-slate-700">{val}</span>} />
                <Bar dataKey="Fronted" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Amount Fronted" />
                <Bar dataKey="Share" fill="#94a3b8" radius={[6, 6, 0, 0]} name="Actual Liability" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
