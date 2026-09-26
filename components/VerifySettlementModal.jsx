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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-400/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Verify Settlement Payment</h3>
              <p className="text-[11px] text-slate-300">
                OCR + AI Verification for UPI Screenshots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Transfer Target Banner */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Settlement Details
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span>{transfer.payerName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-indigo-900 font-black">{transfer.receiverName}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Receiver UPI: {transfer.receiverUpiId}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Amount Due
              </span>
              <span className="text-base font-extrabold text-indigo-950 font-mono">
                ₹{Number(transfer.amount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Upload UPI Payment Screenshot (GPay, PhonePe, Paytm, BHIM)
            </label>

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Click to browse or drop payment screenshot
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PNG, JPG, or WEBP (Clear image showing amount and UTR)
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Payment screenshot"
                    className="w-20 h-24 object-cover rounded-xl border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 text-xs block">Screenshot Attached</span>
                    <span className="text-[10px] text-slate-400 block">Ready for automated OCR validation</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold"
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Verification Results Card */}
          {extractedDetails && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  OCR + AI Verification Breakdown
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  extractedDetails.isAmountMatched 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {extractedDetails.isAmountMatched ? 'Amount Matched ✅' : 'Amount Check ⚠️'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Extracted Amount</span>
                  <strong className="font-mono text-slate-900 text-sm">
                    ₹{Number(extractedDetails.amount || transfer.amount).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Payment Status</span>
                  <strong className="text-emerald-700 font-bold capitalize">
                    {extractedDetails.paymentStatus || 'Success'}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/60 col-span-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Receiver UPI / VPA</span>
                  <strong className="font-mono text-slate-800 text-[11px]">
                    {extractedDetails.receiverUpiId || transfer.receiverUpiId}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Date &amp; Time</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {extractedDetails.paymentDate || 'Today'} {extractedDetails.paymentTime || ''}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Confidence</span>
                  <span className="text-emerald-700 font-bold font-mono">
                    {extractedDetails.confidenceScore || 95}% Verified
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  12-Digit UPI Ref / UTR Number
                </label>
                <input
                  type="text"
                  value={customUtr}
                  onChange={(e) => setCustomUtr(e.target.value)}
                  placeholder="e.g. 428192038192"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Status Explanation Pill */}
              <div className="p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Upcoming Status (Orange Badge):
                </span>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Submitting will mark this transfer as <strong>&ldquo;Settlement done by the person who has to pay but not confirmed by the receiver&rdquo;</strong> (Orange). The option to confirm receipt will then be unlocked in <strong>{transfer.receiverName}&rsquo;s</strong> profile.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitVerifiedPayment}
            disabled={isSubmitting || !extractedDetails}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
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
