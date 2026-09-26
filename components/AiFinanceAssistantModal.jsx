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
      text: `👋 Hi! I am your **TripSync AI Finance Copilot** (powered by Google Gemini & Groq).\n\nI analyze your live deterministic ledger and can explain dues, recent recalculations, category budgets, or answer any group trip question.\n\nTry tapping a question below or ask anything!`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[620px]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 flex items-center justify-center shadow-inner">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  TripSync AI Finance Copilot
                </h2>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini + Groq
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Ground-truth financial reasoning from live ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                {m.sender === 'ai' ? (
                  <span className="font-bold text-indigo-600 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> 
                    <span>TripSync AI</span>
                    {m.source && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                        m.source.includes('Gemini') 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : m.source.includes('Groq')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {m.source}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="font-bold text-slate-700">You</span>
                )}
              </div>
              <div
                className={`p-4 rounded-2xl max-w-md text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm shadow-indigo-100'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="space-y-2 whitespace-pre-line">
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold p-2 animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing live ledger with Gemini &amp; Groq...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(qp)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-[10px] font-semibold text-slate-700 hover:text-indigo-900 transition whitespace-nowrap shrink-0 disabled:opacity-50"
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
          className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask about dues, recalculations, or budget tips..."
            className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
}

