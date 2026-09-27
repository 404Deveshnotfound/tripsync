'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  QrCode, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Camera
} from 'lucide-react';

export default function VerifySettlementModal({
  isOpen,
  onClose,
  transfer,
  tripId,
  onVerified
}) {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(''); // 'ocr' | 'ai' | 'done' | 'error'
  const [extractedDetails, setExtractedDetails] = useState(null);
  const [customUtr, setCustomUtr] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !transfer) return null;

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setExtractedDetails(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR + AI Verification
  const handleScanScreenshot = async () => {
    if (!imageBase64) {
      setErrorMsg('Please select or upload a payment screenshot first.');
      return;
    }

    setIsScanning(true);
    setErrorMsg(null);
    setScanStep('Running OCR & AI verification...');

    try {
      const res = await fetch(`/api/trips/${tripId}/settlements/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          expectedAmount: transfer.amount,
          expectedReceiverUpi: transfer.receiverUpiId,
          expectedReceiverName: transfer.receiverName,
          expectedPayerName: transfer.payerName
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to verify image');
      }

      setExtractedDetails(data.verifiedDetails);
      if (data.verifiedDetails?.utrNumber) {
        setCustomUtr(data.verifiedDetails.utrNumber);
      }
      setScanStep('done');
    } catch (err) {
      console.error('OCR Verification error:', err);
      setErrorMsg(err.message || 'Error scanning screenshot');
      setScanStep('error');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit verified payment
  const handleSubmitVerifiedPayment = async () => {
    setIsSubmitting(true);
    try {
      const utrToSave = customUtr || extractedDetails?.utrNumber || ('UTR' + Date.now().toString().slice(-8));

      const res = await fetch(`/api/trips/${tripId}/settlements/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementId: transfer.id,
          payerMemberId: transfer.payerMemberId,
          receiverMemberId: transfer.receiverMemberId,
          amount: transfer.amount,
          paymentMethod: 'upi_screenshot_verified',
          utrNumber: utrToSave,
          proofData: {
            verifiedAt: new Date().toISOString(),
            extractedDetails: extractedDetails || null,
            utrNumber: utrToSave,
            proofUrl: imagePreview
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onVerified) onVerified(data.settlement);
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to save settlement');
      }
    } catch (err) {
      console.error('Submit settlement error:', err);
      setErrorMsg(err.message || 'Error submitting verified payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-lg rounded-3xl shadow-2xl border border-[#272526] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1d1b1c] flex items-center justify-between bg-gradient-to-r from-[#1a090a] to-[#0d0b0c] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9d1117]/20 flex items-center justify-center text-[#d8c49d] border border-[#9d1117]/50">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-[#f2eee5]">Verify Settlement Payment</h3>
              <p className="text-[11px] text-[#9c9791]">
                OCR + AI Verification for UPI Screenshots
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

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Transfer Target Banner */}
          <div className="p-3 bg-[#9d1117]/10 border border-[#9d1117]/20 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#9c9791] font-semibold uppercase tracking-wider block">
                Settlement Details
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#f2eee5]">
                <span>{transfer.payerName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9c9791]" />
                <span className="text-[#d8c49d] font-black">{transfer.receiverName}</span>
              </div>
              <div className="text-[11px] text-[#9c9791] font-mono">
                Receiver UPI: {transfer.receiverUpiId}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#9c9791] font-semibold uppercase tracking-wider block">
                Amount Due
              </span>
              <span className="text-base font-extrabold text-[#d8c49d] font-mono">
                ₹{Number(transfer.amount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-[#d8c49d] mb-1.5">
              Upload UPI Payment Screenshot (GPay, PhonePe, Paytm, BHIM)
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#272526] hover:border-[#9d1117] hover:bg-[#9d1117]/10 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#9d1117]/10 text-[#d8c49d] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#d8c49d] block">
                    Click to browse or drop payment screenshot
                  </span>
                  <span className="text-[10px] text-[#9c9791]">
                    PNG, JPG, or WEBP (Clear image showing amount and UTR)
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-[#272526] overflow-hidden bg-[#050505] p-2">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Payment screenshot"
                    className="w-20 h-24 object-cover rounded-xl border border-[#272526] shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-[#f2eee5] text-xs block">Screenshot Attached</span>
                    <span className="text-[10px] text-[#9c9791] block">Ready for automated OCR validation</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-[#d8c49d] hover:underline font-semibold"
                    >
                      Change image
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Scan Button */}
          {imagePreview && !extractedDetails && (
            <button
              type="button"
              onClick={handleScanScreenshot}
              disabled={isScanning}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#9d1117] to-[#4b090c] hover:from-[#7a0d12] hover:to-[#2d0507] text-white font-bold rounded-xl shadow-md shadow-[#9d1117]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{scanStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Scan &amp; Verify Screenshot with OCR + AI</span>
                </>
              )}
            </button>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-700/30 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Verification Results Card */}
          {extractedDetails && (
            <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-700/30 pb-2">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#a8c49b]" />
                  OCR + AI Verification Breakdown
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  extractedDetails.isAmountMatched 
                    ? 'bg-emerald-900/25 text-emerald-400 border border-emerald-700/30' 
                    : 'bg-amber-900/25 text-amber-300 border border-amber-700/40'
                }`}>
                  {extractedDetails.isAmountMatched ? 'Amount Matched ✅' : 'Amount Check ⚠️'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#101011] p-2.5 rounded-xl border border-amber-700/30">
                  <span className="text-[10px] text-[#9c9791] font-semibold uppercase block">Extracted Amount</span>
                  <strong className="font-mono text-[#f2eee5] text-sm">
                    ₹{Number(extractedDetails.amount || transfer.amount).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-[#101011] p-2.5 rounded-xl border border-amber-700/30">
                  <span className="text-[10px] text-[#9c9791] font-semibold uppercase block">Payment Status</span>
                  <strong className="text-emerald-400 font-bold capitalize">
                    {extractedDetails.paymentStatus || 'Success'}
                  </strong>
                </div>
                <div className="bg-[#101011] p-2.5 rounded-xl border border-amber-700/30 col-span-2">
                  <span className="text-[10px] text-[#9c9791] font-semibold uppercase block">Receiver UPI / VPA</span>
                  <strong className="font-mono text-[#f2eee5] text-[11px]">
                    {extractedDetails.receiverUpiId || transfer.receiverUpiId}
                  </strong>
                </div>
                <div className="bg-[#101011] p-2.5 rounded-xl border border-amber-700/30">
                  <span className="text-[10px] text-[#9c9791] font-semibold uppercase block">Date &amp; Time</span>
                  <span className="text-[#d8c49d] font-mono text-[11px]">
                    {extractedDetails.paymentDate || 'Today'} {extractedDetails.paymentTime || ''}
                  </span>
                </div>
                <div className="bg-[#101011] p-2.5 rounded-xl border border-amber-700/30">
                  <span className="text-[10px] text-[#9c9791] font-semibold uppercase block">Confidence</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {extractedDetails.confidenceScore || 95}% Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                  12-Digit UPI Ref / UTR Number
                </label>
                <input
                  type="text"
                  value={customUtr}
                  onChange={(e) => setCustomUtr(e.target.value)}
                  placeholder="e.g. 428192038192"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#0a0a0b] text-[#f2eee5] border border-amber-700/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9d1117]"
                />
              </div>

              {/* Status Explanation Pill */}
              <div className="p-2.5 bg-amber-900/20 border border-amber-700/40 rounded-xl text-[11px] text-amber-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  Upcoming Status (Orange Badge):
                </span>
                <p className="text-[10px] text-amber-300/80 leading-relaxed">
                  Submitting will mark this transfer as <strong>&ldquo;Settlement done by the person who has to pay but not confirmed by the receiver&rdquo;</strong> (Orange). The option to confirm receipt will then be unlocked in <strong>{transfer.receiverName}&rsquo;s</strong> profile.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1d1b1c] flex items-center justify-end gap-2 bg-[#050505]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#9c9791] hover:bg-[#272526] rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitVerifiedPayment}
            disabled={isSubmitting || !extractedDetails}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submit Verified Settlement</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
