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
  tripId,
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
      const endpoint = tripId ? `/api/trips/${tripId}/ai/parse-expense` : `/api/trips/current/ai/parse-expense`;
      const res = await fetch(endpoint, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-lg rounded-3xl shadow-2xl border border-[#272526] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1d1b1c] flex items-center justify-between bg-gradient-to-r from-[#0d0b0c] to-[#0a0a0b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9d1117] text-[#f2eee5] flex items-center justify-center shadow-md shadow-[#9d1117]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#f2eee5]">AI Natural Language Expense Entry</h2>
                <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Gemini & Groq AI
                </span>
              </div>
              <p className="text-[11px] text-[#9c9791]">Fast natural language parsing for expenses and split allocations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9c9791] hover:text-[#9c9791] hover:bg-[#151516] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Text Area Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#d8c49d]">
              Describe what you paid:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. I paid ₹2,400 for lunch at Fisherman's Wharf for me, Amit and Priya"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d1117] leading-relaxed"
            />
          </div>

          {/* Quick Clickable Sample Prompts */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#9c9791] uppercase tracking-wider block">
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
                  className="w-full text-left p-2 rounded-xl bg-[#050505] hover:bg-[#9d1117]/12 border border-[#272526] text-[11px] text-[#d8c49d] hover:text-[#d8c49d] transition flex items-center justify-between"
                >
                  <span className="truncate pr-2">{p}</span>
                  <Zap className="w-3 h-3 text-[#d42a2f] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Parse Button */}
          <button
            onClick={() => handleParse()}
            disabled={loading || !inputText.trim()}
            className="w-full py-2.5 bg-[#9d1117] hover:bg-[#7a0d12] text-[#f2eee5] font-bold text-xs rounded-xl shadow-sm shadow-[#9d1117]/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Analyzing natural language...' : 'Analyze & Autofill'}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-700/30 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <Check className="w-3.5 h-3.5 text-[#a8c49b]" />
                  Successfully Extracted Parameters:
                </span>
                <div className="flex items-center gap-2">
                  {parsedResult.source && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shadow-xs ${
                      parsedResult.source.includes('Gemini')
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : parsedResult.source.includes('Groq')
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-[#1d1b1c] text-[#d8c49d] border-[#272526]'
                    }`}>
                      {parsedResult.source}
                    </span>
                  )}
                  <span className="text-xs font-black font-mono text-[#f2eee5]">
                    ₹{Number(parsedResult.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#101011]/80 p-2 rounded-lg border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block">Title:</span>
                  <span className="font-bold text-[#f2eee5]">{parsedResult.title}</span>
                </div>
                <div className="bg-[#101011]/80 p-2 rounded-lg border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block">Category:</span>
                  <span className="font-bold text-[#f2eee5] capitalize">{parsedResult.category}</span>
                </div>
                <div className="bg-[#101011]/80 p-2 rounded-lg border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block">Fronted Payer:</span>
                  <span className="font-bold text-[#f2eee5]">
                    {members.find(m => m.id === parsedResult.paidByMemberId)?.display_name || 'Traveler'}
                  </span>
                </div>
                <div className="bg-[#101011]/80 p-2 rounded-lg border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block">Participants:</span>
                  <span className="font-bold text-[#f2eee5]">
                    {parsedResult.participantMemberIds?.length} members
                  </span>
                </div>
              </div>

              <button
                onClick={handleApply}
                className="w-full py-2 bg-[#9d1117] hover:bg-[#7a0d12] text-[#f2eee5] font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
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
