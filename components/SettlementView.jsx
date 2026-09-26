'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { generateUpiIntentUri } from '@/lib/services/settlementSolver';
import { 
  QrCode, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Monitor, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  X,
  CreditCard
} from 'lucide-react';

export default function SettlementView({
  transfers = [],
  ledger,
  members = [],
  tripTitle = 'TripSync',
  currentUserId,
  onSettlementUpdated
}) {
  const { isMobile } = useDeviceDetect();
  const [expandedTransferId, setExpandedTransferId] = useState(null);
  const [activeQrModalTransfer, setActiveQrModalTransfer] = useState(null);
  const [utrInput, setUtrInput] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;

  // Toggle explainability breakdown accordion
  const toggleExpand = (id) => {
    setExpandedTransferId(prev => (prev === id ? null : id));
  };

  // Launch Mobile UPI Intent or Desktop QR Modal
  const handleInitiatePayment = (transfer) => {
    const upiUri = generateUpiIntentUri({
      upiId: transfer.receiverUpiId,
      recipientName: transfer.receiverName,
      amount: transfer.amount,
      tripTitle
    });

    if (isMobile) {
      // Launch native UPI app chooser on mobile
      window.location.href = upiUri;
    } else {
      // Show dynamic QR on desktop
      setActiveQrModalTransfer({
        ...transfer,
        upiUri
      });
    }
  };

  // Submit UTR after payment
  const handleSubmitUtr = async (transfer) => {
    const utr = utrInput[transfer.id];
    setSubmittingId(transfer.id);

    try {
      const res = await fetch(`/api/trips/${transfer.tripId || 'current'}/settlements/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: transfer.id,
          payerMemberId: transfer.payerMemberId,
          receiverMemberId: transfer.receiverMemberId,
          amount: transfer.amount,
          paymentMethod: isMobile ? 'upi_intent' : 'upi_qr',
          utrNumber: utr || null
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onSettlementUpdated) onSettlementUpdated();
        setActiveQrModalTransfer(null);
      }
    } catch (err) {
      console.error('Payment submit error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  // Receiver handshake confirmation
  const handleConfirmReceived = async (transfer) => {
    setSubmittingId(transfer.id);

    try {
      const res = await fetch(`/api/trips/${transfer.tripId || 'current'}/settlements/${transfer.id}/confirm`, {
        method: 'PATCH'
      });

      const data = await res.json();
      if (data.success) {
        // Trigger celebration confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        if (onSettlementUpdated) onSettlementUpdated();
      }
    } catch (err) {
      console.error('Confirm settlement error:', err);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Banner / Differentiator Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-800 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Greedy Debt Simplification & Explainable Settlement
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          Smart Group Settlement & Device-Adaptive UPI
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          We minimize redundant peer-to-peer transfers using a greedy cash-flow solver. Every rupee is tied to an itemized explainability breakdown answering <em>&quot;Why do I owe this?&quot;</em>
        </p>

        {/* Device indicator pill */}
        <div className="pt-2 flex items-center gap-2 text-xs text-indigo-200">
          {isMobile ? (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Mobile Detected: One-tap direct UPI App Chooser active (GPay, PhonePe, Paytm)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              Desktop Detected: Dynamic SVG QR Code generator active
            </span>
          )}
        </div>
      </div>

      {/* Member Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ledger?.memberSummaries?.map(m => {
          const isMe = m.memberId === currentMemberId;
          return (
            <div
              key={m.memberId}
              className={`p-4 rounded-2xl border transition ${
                isMe ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-900 truncate">
                  {m.displayName} {isMe && '(You)'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  m.isCreditor ? 'bg-emerald-50 text-emerald-700' :
                  m.isDebtor ? 'bg-rose-50 text-rose-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {m.isCreditor ? 'To Receive' : m.isDebtor ? 'Owes' : 'Settled'}
                </span>
              </div>

              <div className={`text-lg font-black font-mono ${
                m.isCreditor ? 'text-emerald-600' :
                m.isDebtor ? 'text-rose-600' :
                'text-slate-400'
              }`}>
                {m.isCreditor ? `+₹${Number(m.netBalance || 0).toLocaleString()}` :
                 m.isDebtor ? `-₹${Number(Math.abs(m.netBalance || 0)).toLocaleString()}` :
                 '₹0.00'}
              </div>

              <div className="text-[11px] text-slate-400 font-mono mt-1">
                UPI: {m.upiId || 'Not linked'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simplified Transfers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Simplified Group Transfers</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {transfers.length} transfer(s) required to settle entire trip
          </span>
        </div>

        {transfers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">All Debts Fully Settled!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No outstanding peer-to-peer liabilities remain for this group trip.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((tr) => {
              const isPayerMe = tr.payerMemberId === currentMemberId;
              const isReceiverMe = tr.receiverMemberId === currentMemberId;
              const isExpanded = expandedTransferId === tr.id;
              const isCompleted = tr.status === 'completed';
              const isVerifying = tr.status === 'verifying';

              return (
                <div
                  key={tr.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition hover:border-indigo-200"
                >
                  
                  {/* Transfer Main Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Parties involved */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className={isPayerMe ? 'text-indigo-600 font-black' : ''}>
                          {tr.payerName} {isPayerMe && '(You)'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className={isReceiverMe ? 'text-indigo-600 font-black' : ''}>
                          {tr.receiverName} {isReceiverMe && '(You)'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Receiver UPI: <strong className="font-mono text-slate-700">{tr.receiverUpiId}</strong></span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isVerifying ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isCompleted ? 'Settled ✅' : isVerifying ? 'Verifying Handshake ⏳' : 'Payment Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Transfer Amount:</div>
                        <div className="text-xl font-extrabold text-slate-900 font-mono">
                          ₹{Number(tr.amount || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Payment Actions */}
                      {!isCompleted && isPayerMe && (
                        <button
                          onClick={() => handleInitiatePayment(tr)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-200 transition flex items-center gap-1.5"
                        >
                          <QrCode className="w-4 h-4" />
                          {isMobile ? 'Pay with UPI' : 'Show Dynamic QR'}
                        </button>
                      )}

                      {/* Receiver Handshake Confirmation */}
                      {!isCompleted && isReceiverMe && (
                        <button
                          onClick={() => handleConfirmReceived(tr)}
                          disabled={submittingId === tr.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          {submittingId === tr.id ? 'Confirming...' : 'Confirm Received'}
                        </button>
                      )}

                      {/* Explainability Accordion Button */}
                      <button
                        onClick={() => toggleExpand(tr.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                        title="View itemized proof"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Why?</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                    </div>

                  </div>

                  {/* Explainable Line-Item Breakdown Drawer */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Line-Item Debt Composition for {tr.payerName}:
                      </div>
                      
                      <div className="divide-y divide-slate-200/60 bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {tr.breakdown.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500">
                            General ledger net balance settlement.
                          </div>
                        ) : (
                          tr.breakdown.map((item, idx) => (
                            <div key={idx} className="p-2.5 px-4 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{item.title}</span>
                                <span className="text-[11px] text-slate-500 ml-2 capitalize font-mono">
                                  ({item.category} &bull; Fronted by {item.paidByName})
                                </span>
                              </div>
                              <span className="font-extrabold text-slate-900 font-mono">
                                ₹{Number(item.shareAmount ?? item.amount ?? 0).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 text-right">
                        Total net liability is calculated deterministically by TripSync backend engine.
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Dynamic Desktop QR Modal */}
      {activeQrModalTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Scan &amp; Pay via UPI
              </span>
              <button
                onClick={() => setActiveQrModalTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Amount */}
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Pay {activeQrModalTransfer.receiverName}
              </h3>
              <div className="text-3xl font-black text-indigo-600 font-mono mt-1">
                ₹{Number(activeQrModalTransfer.amount || 0).toLocaleString()}
              </div>
              <p className="text-xs font-mono text-slate-500 mt-1">
                UPI ID: {activeQrModalTransfer.receiverUpiId}
              </p>
            </div>

            {/* Dynamic SVG QR Code */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeSVG
                value={activeQrModalTransfer.upiUri}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Open Google Pay, PhonePe, Paytm, or BHIM on your smartphone and scan this code to pay exact amount.
            </p>

            {/* Enter UTR option */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="Enter 12-digit UTR reference (optional)"
                value={utrInput[activeQrModalTransfer.id] || ''}
                onChange={(e) => setUtrInput({ ...utrInput, [activeQrModalTransfer.id]: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleSubmitUtr(activeQrModalTransfer)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
              >
                Submit Payment for Confirmation
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
