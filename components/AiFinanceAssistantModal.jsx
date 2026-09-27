'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck,
  Zap,
  User,
  MessageSquare
} from 'lucide-react';

export default function AiFinanceAssistantModal({
  isOpen,
  onClose,
  tripId,
  trip,
  ledger,
  bookings = [],
  expenses = [],
  members = [],
  auditLogs = []
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `👋 Hi! I am your **TripSync AI Finance Copilot**.\n\nI can explain your group travel ledger, balance breakdowns, "What Changed?" recalculation snapshots, and debt settlement paths.\n\nTry tapping a question below or ask me anything about balances, bookings, or debt settlements!`,
      source: 'Google Gemini'
    }
  ]);
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const quickPrompts = [
    `Why does Priya owe money?`,
    `What changed after Vikram skipped scuba diving?`,
    `How much has the group spent on stay?`,
    `Who has fronted the most money?`,
    `Which expenses are still unverified?`
  ];

  const handleAsk = async (textToAsk) => {
    const query = textToAsk || queryInput;
    if (!query.trim() || loading) return;

    // Add user message to stream
    const userMsg = { sender: 'user', text: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setQueryInput('');
    setLoading(true);

    try {
      const endpoint = tripId ? `/api/trips/${tripId}/ai/assistant` : `/api/trips/current/ai/assistant`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          messages: updatedMessages,
          trip,
          ledger,
          bookings,
          expenses,
          members,
          auditLogs
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: data.answer,
          source: data.source || 'TripSync AI'
        }]);
      } else {
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: `⚠️ ${data.error || 'Sorry, I was unable to analyze that query.'}`,
          source: 'Error'
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: '⚠️ Network error communicating with AI service.',
        source: 'Error'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-lg rounded-3xl shadow-2xl border border-[#272526] overflow-hidden flex flex-col h-[620px]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1d1b1c] flex items-center justify-between bg-gradient-to-r from-[#1a090a] via-[#0d0b0c] to-[#050505] text-[#f2eee5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9d1117]/20 border border-[#9d1117]/40 text-[#d8c49d] flex items-center justify-center shadow-inner">
              <Sparkles className="w-4 h-4 text-[#d8c49d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  TripSync AI Finance Copilot
                </h2>
                <span className="text-[9px] bg-[#9d1117]/20 text-[#d8c49d] border border-[#9d1117]/40 px-2 py-0.5 rounded-full font-mono uppercase font-bold flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini & Groq AI
                </span>
              </div>
              <p className="text-[10px] text-[#9c9791]">
                Deterministic Living Ledger Intelligence & Recalculation Explainer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9c9791] hover:text-[#f2eee5] hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Sub-bar */}
        <div className="bg-[#050505]/60 border-b border-[#9d1117]/20 px-4 py-1.5 flex items-center justify-between text-[10px] text-[#d8c49d] font-mono">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Real-Time Group Ledger Analysis & Debt Settlement Intelligence</span>
          </span>
          <span className="bg-[#9d1117]/20 px-2 py-0.5 rounded border border-[#9d1117]/30 text-[9px]">
            Live Sync
          </span>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0a0a0b]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-[#9c9791] mb-1">
                {m.sender === 'ai' ? (
                  <span className="font-bold text-[#d8c49d] flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> 
                    <span>TripSync AI</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border shadow-xs ${
                        m.source.includes('Gemini') 
                          ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold' 
                          : m.source.includes('Groq')
                          ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
                          : 'bg-[#151516] text-[#9c9791] border-[#272526]'
                      }`}>
                        {m.source}
                      </span>
                  </span>
                ) : (
                  <span className="font-bold text-[#d8c49d]">You</span>
                )}
              </div>
              <div
                className={`p-4 rounded-2xl max-w-md text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#9d1117] text-[#f2eee5] rounded-br-none shadow-sm shadow-[#9d1117]/15'
                    : 'bg-[#101011] border border-[#272526] text-[#f2eee5] rounded-bl-none shadow-sm'
                }`}
              >
                <div className="space-y-2 whitespace-pre-line">
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#d8c49d] font-semibold p-2 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing live ledger with Gemini &amp; Groq...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-[#1d1b1c] bg-[#101011] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(qp)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-[#151516] hover:bg-[#9d1117]/10 border border-[#272526] text-[10px] font-semibold text-[#d8c49d] hover:text-[#d8c49d] transition whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="p-3 border-t border-[#1d1b1c] bg-[#101011] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask about dues, recalculations, or budget tips..."
            className="flex-1 px-3.5 py-2 text-xs border border-[#272526] bg-[#0a0a0b] text-[#f2eee5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
          />
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="p-2.5 bg-[#9d1117] hover:bg-[#7a0d12] text-[#f2eee5] rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
}
