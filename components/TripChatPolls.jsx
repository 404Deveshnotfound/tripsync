'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Vote, 
  Sparkles, 
  Clock, 
  Receipt,
  User
} from 'lucide-react';

export default function TripChatPolls({
  tripId,
  messages = [],
  members = [],
  currentUserId,
  onMessageSent,
  onVoteCast
}) {
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);

  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newText.trim() || !currentMemberId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderMemberId: currentMemberId,
          content: newText.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setNewText('');
        if (onMessageSent) onMessageSent();
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, voteType) => {
    if (!currentMemberId) return;

    try {
      const res = await fetch(`/api/trips/${tripId}/polls/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId,
          memberId: currentMemberId,
          vote: voteType
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onVoteCast) onVoteCast();
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px] animate-fadeIn">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Trip Group Chat & Polls</h3>
            <p className="text-[11px] text-slate-500">Live communication & democratic expense verification</p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentMemberId;
          const isSystem = msg.message_type === 'system_audit';
          const isPoll = msg.message_type === 'poll' && msg.poll_data;

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-3">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  {msg.content}
                </span>
              </div>
            );
          }

          if (isPoll) {
            const poll = msg.poll_data;
            const votes = poll.votes || {};
            const myVote = votes[currentMemberId];
            const approveCount = Object.values(votes).filter(v => v === 'approve').length;
            const required = poll.required_votes || 2;
            const isApproved = poll.status === 'approved';

            return (
              <div key={msg.id} className="max-w-md mx-auto my-4 w-full">
                <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3">
                  
                  {/* Poll Header */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                      <Vote className="w-3 h-3 text-indigo-600" />
                      Verification Poll
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isApproved 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {isApproved ? 'Approved ✅' : 'Voting Active ⏳'}
                    </span>
                  </div>

                  {/* Poll Subject */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {poll.title}
                    </h4>
                    <div className="text-xs text-slate-600 font-mono font-bold mt-1">
                      Amount: <span className="text-indigo-600">₹{poll.amount}</span> &bull; Submitted by {poll.paid_by}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {msg.content}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                      <span>Approval Quorum:</span>
                      <span>{approveCount} of {required} required votes</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${isApproved ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${Math.min(100, (approveCount / required) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Voting Actions */}
                  {!isApproved && (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleVote(poll.id, 'approve')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          myVote === 'approve'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {myVote === 'approve' ? 'You Approved' : 'Approve'}
                      </button>

                      <button
                        onClick={() => handleVote(poll.id, 'reject')}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          myVote === 'reject'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {myVote === 'reject' ? 'You Rejected' : 'Reject'}
                      </button>
                    </div>
                  )}

                  {isApproved && (
                    <div className="pt-1 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Expense Verified by Group Consensus
                    </div>
                  )}

                </div>
              </div>
            );
          }

          // Regular text message bubble
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
                <span className="font-semibold text-slate-700">{msg.sender_name || 'Traveler'}</span>
                <span>&bull;</span>
                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`px-4 py-2.5 rounded-2xl max-w-sm text-xs leading-relaxed ${
                isMe 
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-sm shadow-indigo-100' 
                  : 'bg-slate-100 text-slate-900 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Type a message or expense question..."
          className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !newText.trim()}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
