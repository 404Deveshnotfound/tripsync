'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  Check, 
  ArrowRight, 
  FileText, 
  Zap, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  RefreshCw,
  QrCode
} from 'lucide-react';

export default function OcrExpenseModal({
  isOpen,
  onClose,
  tripId,
  members = [],
  currentUserId,
  onParsedApply
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState('idle'); // idle | ocr | decoding | done
  const [rawOcrText, setRawOcrText] = useState('');
  const [ocrEngine, setOcrEngine] = useState('');
  const [aiEngine, setAiEngine] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [error, setError] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const currentMember = members.find(m => m.user_id === currentUserId);

  // Sample SVG Data URLs for quick 1-click hackathon/demo testing
  const sampleUpiScreenshot = () => {
    // Generate clean canvas data URL for demo UPI screenshot
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 500);

    // GPay Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Google Pay', 30, 50);

    // Success tick
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(200, 130, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('✓', 186, 142);

    // Paid to
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Paid to', 175, 195);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText("Fisherman's Wharf", 110, 225);

    // Amount
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('₹2,450.00', 120, 280);

    // Transaction Details Box
    ctx.fillStyle = '#1e293b';
    ctx.roundRect(30, 320, 340, 140, 16);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('UPI Transaction ID:', 50, 355);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('428192038192', 50, 375);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Date & Time:', 50, 405);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('12 Oct 2026, 02:45 PM', 50, 425);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    processImage(dataUrl, 'image/png');
  };

  const sampleRestaurantReceipt = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    // Receipt Paper Background
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, 400, 500);

    // Bill Header
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 22px serif';
    ctx.fillText('BAY VIEW SEAFOOD VILLA', 50, 50);
    ctx.font = '12px sans-serif';
    ctx.fillText('Calangute Beach Road, Goa', 120, 75);
    ctx.fillText('TAX INVOICE: #BV-98214', 130, 95);

    // Divider
    ctx.strokeStyle = '#a8a29e';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, 115);
    ctx.lineTo(370, 115);
    ctx.stroke();

    // Items
    ctx.font = '14px monospace';
    ctx.fillText('1x Jumbo King Prawns', 40, 150);
    ctx.fillText('₹1,400.00', 290, 150);
    ctx.fillText('2x Garlic Butter Naan', 40, 180);
    ctx.fillText('₹240.00', 305, 180);
    ctx.fillText('1x Mocktail Pitcher', 40, 210);
    ctx.fillText('₹650.00', 305, 210);

    // Divider
    ctx.beginPath();
    ctx.moveTo(30, 240);
    ctx.lineTo(370, 240);
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.fillText('TOTAL DUE:', 40, 280);
    ctx.fillText('₹2,290.00', 270, 280);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.fillText('Paid via GPay UPI Ref: 529103847291', 80, 340);
    ctx.fillText('Thank you for dining with us!', 110, 390);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    processImage(dataUrl, 'image/png');
  };

  const compressAndResizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Return high quality lightweight JPEG data URL
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressed);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or WEBP).');
      return;
    }

    setSelectedFile(file);
    try {
      const dataUrl = await compressAndResizeImage(file);
      setPreviewUrl(dataUrl);
      processImage(dataUrl, 'image/jpeg');
    } catch (err) {
      console.warn('Compression failed, using original reader:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        setPreviewUrl(result);
        processImage(result, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading) return;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please drop a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    setSelectedFile(file);
    try {
      const dataUrl = await compressAndResizeImage(file);
      setPreviewUrl(dataUrl);
      processImage(dataUrl, 'image/jpeg');
    } catch (err) {
      console.warn('Compression failed on drop, using original reader:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        setPreviewUrl(result);
        processImage(result, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Data, mimeType) => {
    setLoading(true);
    setError('');
    setParsedResult(null);
    setRawOcrText('');
    setStep('ocr');

    try {
      const endpoint = tripId ? `/api/trips/${tripId}/ai/ocr-expense` : `/api/trips/current/ai/ocr-expense`;
      
      setStep('decoding');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType || 'image/jpeg',
          members,
          currentMemberId: currentMember?.id
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze receipt image');
      }

      setRawOcrText(data.rawText || '');
      setOcrEngine(data.ocrEngine || 'Vision OCR');
      setAiEngine(data.aiEngine || 'Generative AI');
      setParsedResult(data.parsed);
      setStep('done');
    } catch (err) {
      console.error('OCR Process Error:', err);
      setError(err.message || 'Error scanning image');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onParsedApply({
      ...parsedResult,
      proofUrl: previewUrl,
      proofType: parsedResult.proofType || 'upi_screenshot'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/72 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#101011] w-full max-w-xl rounded-3xl shadow-2xl border border-[#272526] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1d1b1c] flex items-center justify-between bg-gradient-to-r from-[#1a090a] via-[#0d0b0c] to-[#050505] text-[#f2eee5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9d1117]/20 border border-[#9d1117]/40 text-[#d8c49d] flex items-center justify-center shadow-inner">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Scan Receipt or UPI Screenshot
                </h2>
                <span className="text-[9px] bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                  OCR + AI
                </span>
              </div>
              <p className="text-[11px] text-[#9c9791]">Optical character recognition &amp; automatic expense decoding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9c9791] hover:text-[#f2eee5] hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* Quick Demo Previews Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#9c9791] uppercase tracking-wider block">
              Quick test with sample images:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={sampleUpiScreenshot}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#050505] hover:bg-[#9d1117]/10 border border-[#272526] text-left transition flex items-center gap-2 text-xs font-semibold text-[#d8c49d] hover:text-[#d8c49d] disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-lg bg-[#9d1117] text-[#f2eee5] flex items-center justify-center shrink-0">
                  <QrCode className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="block truncate">GPay UPI Screenshot</span>
                  <span className="text-[10px] text-[#9c9791] font-normal">₹2,450.00 &bull; UTR: 428192038192</span>
                </div>
              </button>

              <button
                type="button"
                onClick={sampleRestaurantReceipt}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#050505] hover:bg-[#9d1117]/10 border border-[#272526] text-left transition flex items-center gap-2 text-xs font-semibold text-[#d8c49d] hover:text-[#d8c49d] disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-600 text-[#f2eee5] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="block truncate">Restaurant Bill Receipt</span>
                  <span className="text-[10px] text-[#9c9791] font-normal">₹2,290.00 &bull; Bay View Seafood</span>
                </div>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-[#9d1117] bg-[#9d1117]/12 scale-[1.01] shadow-lg shadow-[#9d1117]/15 ring-4 ring-[#9d1117]/30'
                : previewUrl
                ? 'border-[#9d1117]/40 bg-[#9d1117]/8 hover:bg-[#9d1117]/10'
                : 'border-[#272526] hover:border-[#9d1117]/50 hover:bg-[#050505]'
            }`}
          >
            {isDragging ? (
              <div className="py-4 space-y-2 animate-bounce">
                <div className="w-12 h-12 rounded-2xl bg-[#9d1117] text-[#f2eee5] flex items-center justify-center mx-auto shadow-md shadow-[#9d1117]/25">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-[#d8c49d] block">
                  Drop your screenshot or receipt here!
                </span>
                <span className="text-xs text-[#d42a2f] font-medium">
                  We will immediately run OCR + AI
                </span>
              </div>
            ) : previewUrl ? (
              <div className="flex items-center gap-4 w-full">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-[#272526] bg-[#151516] shrink-0 relative shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-left flex-1 truncate">
                  <span className="text-xs font-bold text-[#f2eee5] block truncate">
                    {selectedFile?.name || 'Scanned Payment Evidence'}
                  </span>
                  <span className="text-[11px] text-[#9c9791] block">
                    Click or drag &amp; drop to change image
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-700/30 mt-1">
                    <Check className="w-3 h-3" /> Image Loaded as Proof
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-3">
                <div className="w-10 h-10 rounded-2xl bg-[#9d1117]/15 text-[#d8c49d] flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#f2eee5] block">
                  Drag &amp; Drop or Upload UPI Screenshot / Cash Bill
                </span>
                <span className="text-[11px] text-[#9c9791]">
                  Drop image directly here &bull; PNG, JPG, WEBP up to 5MB
                </span>
              </div>
            )}
          </div>

          {/* Progress / Loading Indicator */}
          {loading && (
            <div className="p-4 rounded-2xl bg-[#9d1117]/10 border border-[#9d1117]/30 text-xs space-y-2 animate-pulse">
              <div className="flex items-center gap-2 font-bold text-[#d8c49d]">
                <RefreshCw className="w-4 h-4 animate-spin text-[#d8c49d]" />
                <span>
                  {step === 'ocr' ? 'Extracting raw text via Optical Character Recognition (OCR)...' : 'AI Decoding amount, merchant & UTR reference...'}
                </span>
              </div>
              <p className="text-[11px] text-[#d8c49d]">
                Transcribing amounts, UPI transaction IDs, and merchant details using Google Gemini &amp; Groq.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-700/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-[#a8c49b]" />
                  Decoded Expense Parameters
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#9d1117]/15 text-[#d8c49d] border border-[#9d1117]/20">
                    {ocrEngine} + {aiEngine}
                  </span>
                  <span className="text-sm font-black font-mono text-[#f2eee5]">
                    ₹{Number(parsedResult.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#101011]/90 p-2.5 rounded-xl border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block font-medium">Merchant / Title:</span>
                  <span className="font-bold text-[#f2eee5] truncate block">{parsedResult.title}</span>
                </div>

                <div className="bg-[#101011]/90 p-2.5 rounded-xl border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block font-medium">Category:</span>
                  <span className="font-bold text-[#f2eee5] capitalize block">{parsedResult.category}</span>
                </div>

                <div className="bg-[#101011]/90 p-2.5 rounded-xl border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block font-medium">UPI UTR / Reference ID:</span>
                  <span className="font-mono font-bold text-[#d8c49d] block truncate">
                    {parsedResult.utr || 'N/A (Cash Bill)'}
                  </span>
                </div>

                <div className="bg-[#101011]/90 p-2.5 rounded-xl border border-emerald-700/30">
                  <span className="text-[10px] text-[#9c9791] block font-medium">Evidence Type:</span>
                  <span className="font-bold text-[#f2eee5] capitalize block">
                    {parsedResult.proofType === 'upi_screenshot' ? '📱 UPI Screenshot' : '🧾 Cash Bill'}
                  </span>
                </div>
              </div>

              {/* View Raw OCR Transcribed Text Toggle */}
              {rawOcrText && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-400 flex items-center gap-1 transition"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showRawText ? 'Hide Raw OCR Text' : 'View Extracted OCR Text'}</span>
                  </button>

                  {showRawText && (
                    <div className="mt-2 p-2.5 bg-black/72 text-[#9c9791] rounded-xl text-[10px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto border border-[#272526]">
                      {rawOcrText}
                    </div>
                  )}
                </div>
              )}

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-[#f2eee5] font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>Autofill &amp; Record Expense with Proof</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
