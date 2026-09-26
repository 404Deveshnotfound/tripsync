'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  Check, 
  DollarSign, 
  Calendar, 
  Users, 
  Send,
  Zap
} from 'lucide-react';

export default function AiExpenseParserModal({
  isOpen,
  onClose,
  members = [],
  currentUserId,
  onParsedApply
}) {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const currentMember = members.find(m => m.user_id === currentUserId);

  const samplePrompts = [
    `I paid ₹2,400 for lunch at Fisherman's Wharf for me, Amit and Priya`,
    `Paid 850 for cab to beach for Rahul, Sneha and Vikram`,
    `Bought snacks and cold drinks for 1200 split equally among all`
  ];

  const handleParse = async (textToParse) => {
    const text = textToParse || inputText;
    if (!text.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/current/ai/parse-expense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          members,
          currentMemberId: currentMember?.id
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Parsing failed');
      }

      setParsedResult(data.parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onParsedApply(parsedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Natural Language Expense Entry</h2>
              <p className="text-[11px] text-slate-500">Speak or type an expense in plain English</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Text Area Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Describe what you paid:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. I paid ₹2,400 for lunch at Fisherman's Wharf for me, Amit and Priya"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Quick Clickable Sample Prompts */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Try a sample travel prompt:
            </span>
            <div className="space-y-1">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(p);
                    handleParse(p);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 text-[11px] text-slate-700 hover:text-indigo-900 transition flex items-center justify-between"
                >
                  <span className="truncate pr-2">{p}</span>
                  <Zap className="w-3 h-3 text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={() => handleParse()}
            disabled={loading || !inputText.trim()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Analyzing natural language...' : 'Analyze & Autofill'}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Successfully Extracted Parameters:
                </span>
                <span className="text-xs font-black font-mono text-emerald-950">
                  ₹{Number(parsedResult.totalAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Title:</span>
                  <span className="font-bold text-slate-800">{parsedResult.title}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Category:</span>
                  <span className="font-bold text-slate-800 capitalize">{parsedResult.category}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Fronted Payer:</span>
                  <span className="font-bold text-slate-800">
                    {members.find(m => m.id === parsedResult.paidByMemberId)?.display_name || 'Traveler'}
                  </span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-400 block">Participants:</span>
                  <span className="font-bold text-slate-800">
                    {parsedResult.participantMemberIds?.length} members
                  </span>
                </div>
              </div>

              <button
                onClick={handleApply}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <span>Apply to Expense Modal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
