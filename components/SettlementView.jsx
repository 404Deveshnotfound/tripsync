'use client';

import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import { generateUpiIntentUri, solveMinimalSettlements, buildExplainabilityTree } from '@/lib/services/settlementSolver';
import VerifySettlementModal from '@/components/VerifySettlementModal';
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
  CreditCard,
  Camera,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function SettlementView({
  transfers = [],
  ledger,
  members = [],
  tripTitle = 'TripSync',
  tripId = '',
  currentUserId,
  onSettlementUpdated
}) {
  const { isMobile } = useDeviceDetect();
  const [expandedTransferId, setExpandedTransferId] = useState(null);
  const [activeQrModalTransfer, setActiveQrModalTransfer] = useState(null);
  const [activeVerifyTransfer, setActiveVerifyTransfer] = useState(null);
  const [utrInput, setUtrInput] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const currentMember = members.find(m => m.user_id === currentUserId);
  const currentMemberId = currentMember?.id;

  // Dynamically compute minimal settlements directly from live ledger so leaving members' locked shares are immediately reflected
  const activeTransfers = useMemo(() => {
    if (ledger?.memberSummaries && ledger.memberSummaries.length > 0) {
      const rawSolved = solveMinimalSettlements(ledger.memberSummaries);
      return rawSolved.map(raw => {
        // Find matching persisted record
        const match = transfers.find(
          t => (t.payerMemberId === raw.payerMemberId && t.receiverMemberId === raw.receiverMemberId) ||
               (t.id === raw.id)
        );
        const debtorSummary = ledger.memberSummaries.find(m => m.memberId === raw.payerMemberId);
        const breakdown = buildExplainabilityTree(debtorSummary, raw.receiverMemberId);

        return {
          ...raw,
          dbId: match?.dbId || match?.id || null,
          status: match?.status || 'pending', // 'pending' | 'verifying' | 'completed'
          utrNumber: match?.utrNumber || null,
          proofData: match?.proofData || null,
          breakdown: match?.breakdown && match.breakdown.length > 0 ? match.breakdown : breakdown
        };
      });
    }
    return transfers;
  }, [ledger, transfers]);

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
      const res = await fetch(`/api/trips/${tripId || 'current'}/settlements/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: transfer.dbId || transfer.id,
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
      const res = await fetch(`/api/trips/${tripId || 'current'}/settlements/${transfer.dbId || transfer.id}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerMemberId: transfer.payerMemberId,
          receiverMemberId: transfer.receiverMemberId,
          amount: transfer.amount
        })
      });

      const data = await res.json();
      if (data.success) {
        confetti({
          particleCount: 110,
          spread: 75,
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
          Greedy Debt Simplification &amp; Explainable Settlement
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight">
          Smart Group Settlement &amp; Device-Adaptive UPI
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          We minimize redundant peer-to-peer transfers using a greedy cash-flow solver. Every rupee is tied to an itemized explainability breakdown answering <em>&quot;Why do I owe this?&quot;</em>
        </p>

        {/* Device indicator pill */}
        <div className="pt-2 flex items-center gap-2 text-xs text-indigo-200">
          {isMobile ? (
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Mobile Detected: One-tap deep-link UPI Intent launch active
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
          const isDeparted = m.status === 'left' || m.status === 'removed';
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
                  {isDeparted && (
                    <span className="ml-1.5 text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      Departed
                    </span>
                  )}
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
            {activeTransfers.length} transfer(s) required to settle entire trip
          </span>
        </div>

        {activeTransfers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">All Debts Fully Settled!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No outstanding peer-to-peer liabilities remain for this group trip.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTransfers.map((tr) => {
              const isPayerMe = tr.payerMemberId === currentMemberId;
              const isReceiverMe = tr.receiverMemberId === currentMemberId;
              const isExpanded = expandedTransferId === tr.id;
              const isCompleted = tr.status === 'completed';
              const isVerifying = tr.status === 'verifying';

              return (
                <div
                  key={tr.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition ${
                    isCompleted 
                      ? 'border-emerald-200 hover:border-emerald-300' 
                      : isVerifying 
                      ? 'border-amber-300 hover:border-amber-400' 
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  
                  {/* Transfer Main Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Parties involved */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className={isPayerMe ? 'text-indigo-600 font-black' : ''}>
                          {tr.payerName} {isPayerMe && '(You)'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <span className={isReceiverMe ? 'text-indigo-600 font-black' : ''}>
                          {tr.receiverName} {isReceiverMe && '(You)'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span>Receiver UPI: <strong className="font-mono text-slate-700">{tr.receiverUpiId}</strong></span>
                        
                        {/* 3 Explicit Status Badges as requested by user */}
                        {isCompleted ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Settlement Done</span>
                          </span>
                        ) : isVerifying ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>Settlement done by the person who has to pay but not confirmed by the receiver</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>Settlement Not Done</span>
                          </span>
                        )}
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

                      {/* Payment & Verification Actions (Only visible to the person who has to pay) */}
                      {!isCompleted && isPayerMe && (
                        <div className="flex items-center gap-2">
                          {/* Option 1: Mobile UPI Intent / Desktop QR */}
                          <button
                            onClick={() => handleInitiatePayment(tr)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                            title="Generate dynamic UPI QR / launch UPI Intent"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>{isMobile ? 'Pay with UPI' : 'Show QR'}</span>
                          </button>

                          {/* Option 2: Verify Settlement Done with Screenshot OCR + AI */}
                          <button
                            onClick={() => setActiveVerifyTransfer(tr)}
                            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                            title="Verify settlement done via payment screenshot OCR + AI"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-200" />
                            <span>Verify Settlement</span>
                          </button>
                        </div>
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

                  {/* Receiver Handshake Prompt - ONLY DISPLAYED WHEN SENDER HAS VERIFIED IT (Orange state) */}
                  {isVerifying && (
                    <div className="mx-5 mb-4 p-3.5 bg-amber-50/80 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                      <div className="space-y-0.5 text-xs text-amber-950">
                        <div className="font-bold flex items-center gap-1.5 text-amber-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Payment verified by sender via screenshot</span>
                        </div>
                        <div className="text-[11px] text-amber-800 flex items-center gap-2 font-mono">
                          {tr.utrNumber && <span>UTR: <strong>{tr.utrNumber}</strong></span>}
                          <span>&bull; Awaiting handshake confirmation from {tr.receiverName}</span>
                        </div>
                      </div>

                      {/* The confirmation button is only available for the receiver */}
                      {isReceiverMe ? (
                        <button
                          onClick={() => handleConfirmReceived(tr)}
                          disabled={submittingId === tr.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>{submittingId === tr.id ? 'Confirming...' : 'Confirm Payment Received'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic bg-white/70 px-2.5 py-1 rounded-lg border border-amber-200">
                          Waiting for {tr.receiverName} to confirm receipt
                        </span>
                      )}
                    </div>
                  )}

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

      {/* Verify Settlement Modal (Screenshot OCR + AI) */}
      {activeVerifyTransfer && (
        <VerifySettlementModal
          isOpen={Boolean(activeVerifyTransfer)}
          onClose={() => setActiveVerifyTransfer(null)}
          transfer={activeVerifyTransfer}
          tripId={tripId}
          onVerified={() => {
            if (onSettlementUpdated) onSettlementUpdated();
          }}
        />
      )}

    </div>
  );
}
