'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Users, Check, Sparkles, Receipt, Camera, AlertCircle, Building, Plane, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';

export default function AddExpenseModal({ 
  isOpen, 
  onClose, 
  tripId, 
  members = [], 
  initialData = null,
  onExpenseAdded 
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('meal');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState(members[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState(members.map(m => m.id));
  const [splitMethod, setSplitMethod] = useState('equal');
  const [proofType, setProofType] = useState('no_proof');
  const [proofUrl, setProofUrl] = useState('');
  const [utr, setUtr] = useState('');
  const [isDraggingProof, setIsDraggingProof] = useState(false);
  
  // Booking & Travel details
  const [vendorName, setVendorName] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [isBookingDetailsOpen, setIsBookingDetailsOpen] = useState(false);

  const [customMap, setCustomMap] = useState({});
  const [splitPreview, setSplitPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.totalAmount) setTotalAmount(String(initialData.totalAmount));
      if (initialData.paidByMemberId) setPaidByMemberId(initialData.paidByMemberId);
      if (initialData.participantMemberIds?.length) setSelectedMemberIds(initialData.participantMemberIds);
      if (initialData.splitMethod) setSplitMethod(initialData.splitMethod);
      if (initialData.proofType) setProofType(initialData.proofType);
      if (initialData.proofUrl) setProofUrl(initialData.proofUrl);
      if (initialData.utr) setUtr(initialData.utr);
    } else if (members.length > 0) {
      const active = members.filter(m => m.status === 'active');
      if (!paidByMemberId) setPaidByMemberId(active[0]?.id || members[0]?.id);
      if (selectedMemberIds.length === 0) setSelectedMemberIds((active.length > 0 ? active : members).map(m => m.id));
    }
  }, [initialData, members]);

  useEffect(() => {
    const num = parseFloat(totalAmount);
    if (!isNaN(num) && num > 0 && selectedMemberIds.length > 0) {
      try {
        const preview = calculateSplit({
          method: splitMethod,
          totalAmount: num,
          allMemberIds: members.map(m => m.id),
          selectedMemberIds,
          customMap
        });
        setSplitPreview(preview);
        setError('');
      } catch (err) {
        setSplitPreview([]);
      }
    } else {
      setSplitPreview([]);
    }
  }, [totalAmount, splitMethod, selectedMemberIds, customMap, members]);

  if (!isOpen) return null;

  const toggleMember = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const selectAll = () => {
    const active = members.filter(m => m.status === 'active');
    setSelectedMemberIds((active.length > 0 ? active : members).map(m => m.id));
  };

  const handleCustomValueChange = (memberId, val) => {
    setCustomMap(prev => ({
      ...prev,
      [memberId]: val
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setError('Please enter a valid expense amount');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Please select at least one participating traveler');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          totalAmount: parseFloat(totalAmount),
          paidByMemberId,
          splitMethod,
          participantMemberIds: selectedMemberIds,
          customMap,
          vendorName: vendorName || undefined,
          bookingReference: bookingReference || undefined,
          date: travelDate || undefined,
          proofType,
          proofUrl: proofUrl || (proofType === 'upi_screenshot' ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80' : null),
          extractedDetails: {
            ...(utr ? { utr } : {}),
            ...(vendorName ? { vendorName } : {}),
            ...(bookingReference ? { bookingReference } : {}),
            amount: parseFloat(totalAmount)
          }
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to record expense');
      }

      onExpenseAdded(data.expense);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Record Expense & Booking</h2>
            <p className="text-xs text-slate-500">Group meals, stays, flights, cabs, or activities</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {initialData && (
          <div className="mx-6 mt-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 font-medium shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Autofilled from your AI Natural Language Prompt!</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Description</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Seafood Dinner or Highway Toll"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="meal">🍽️ Food & Meals</option>
                <option value="hotel">🏨 Hotel / Stay</option>
                <option value="flight">✈️ Flight</option>
                <option value="train">🚆 Train</option>
                <option value="bus">🚌 Bus</option>
                <option value="cab">🚕 Cab / Rental Vehicle</option>
                <option value="activity">🤿 Activity / Tour</option>
                <option value="entertainment">🎉 Club / Entertainment</option>
                <option value="utilities">🛒 Groceries / Utilities</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
          </div>

          {/* Amount & Paid By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="3500"
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Who Paid?</label>
              <select
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Participating Members */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Who is Splitting this? ({selectedMemberIds.length}/{members.filter(m => m.status === 'active').length || members.length})
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-indigo-600 font-semibold hover:underline"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(members.filter(m => m.status === 'active').length > 0 ? members.filter(m => m.status === 'active') : members).map(m => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`p-2 rounded-xl text-left border text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="truncate">{m.display_name.split(' ')[0]}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Method Selector (5-Way Split Engine) */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700">
              Split Method <span className="text-indigo-600 font-normal">(Deterministic Engine)</span>
            </label>

            <select
              value={splitMethod}
              onChange={(e) => setSplitMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="equal">⚖️ Equal Split (Split evenly among participants)</option>
              <option value="activity_based">🎯 Activity-Based (Only selected travelers share)</option>
              <option value="percentage">📊 Percentage Split (Custom % per person)</option>
              <option value="shares">🔢 Shares Split (e.g. 2 shares, 1 share)</option>
              <option value="exact">💵 Exact Amounts (Enter exact rupee figures)</option>
            </select>
          </div>

          {/* Custom Percentage / Shares / Exact Inputs */}
          {(splitMethod === 'percentage' || splitMethod === 'shares' || splitMethod === 'exact') && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">
                Assign {splitMethod === 'percentage' ? 'Percentages (%)' : splitMethod === 'shares' ? 'Shares (e.g. 1, 2)' : 'Exact Amounts (₹)'}:
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedMemberIds.map(memId => {
                  const member = members.find(m => m.id === memId);
                  return (
                    <div key={memId} className="flex items-center justify-between text-xs gap-3">
                      <span className="text-slate-700 font-medium truncate">{member?.display_name}:</span>
                      <div className="flex items-center gap-1">
                        {splitMethod === 'exact' && <span className="text-slate-400 font-bold">₹</span>}
                        <input
                          type="number"
                          placeholder={splitMethod === 'percentage' ? '20' : splitMethod === 'shares' ? '1' : '1000'}
                          value={customMap[memId] || ''}
                          onChange={(e) => handleCustomValueChange(memId, e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right font-mono"
                        />
                        {splitMethod === 'percentage' && <span className="text-slate-400 font-bold">%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Travel & Booking Details Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
            <button
              type="button"
              onClick={() => setIsBookingDetailsOpen(!isBookingDetailsOpen)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2">
                <Plane className="w-3.5 h-3.5 text-indigo-600" />
                <span>Travel & Booking Details (Vendor, PNR, Date)</span>
                <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
              </div>
              {isBookingDetailsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {isBookingDetailsOpen && (
              <div className="p-3.5 bg-white border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vendor / Booking Platform</label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="e.g. MakeMyTrip / Airbnb / IndiGo"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Booking Ref / PNR</label>
                    <input
                      type="text"
                      value={bookingReference}
                      onChange={(e) => setBookingReference(e.target.value)}
                      placeholder="e.g. PNR-8921 or MMT-RES"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Travel / Activity Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Verification Evidence */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700">
              Payment Evidence / Verification Mode
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'upi_screenshot', label: 'UPI Screenshot', icon: Camera },
                { id: 'bill_receipt', label: 'Cash Bill', icon: Receipt },
                { id: 'no_proof', label: 'No Proof', icon: AlertCircle }
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = proofType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setProofType(opt.id)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {(proofType === 'upi_screenshot' || proofType === 'bill_receipt') && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                
                {/* Proof Image Upload & Preview */}
                <input
                  type="file"
                  accept="image/*"
                  id="proof-upload-input"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const dataUrl = reader.result;
                      setProofUrl(dataUrl);
                      
                      // Run OCR Scan
                      try {
                        const res = await fetch(`/api/trips/${tripId}/ai/ocr-expense`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            imageBase64: dataUrl,
                            mimeType: file.type,
                            members,
                            currentMemberId: paidByMemberId
                          })
                        });
                        const data = await res.json();
                        if (data.success && data.parsed) {
                          if (data.parsed.utr) setUtr(data.parsed.utr);
                          if (!totalAmount && data.parsed.totalAmount) setTotalAmount(String(data.parsed.totalAmount));
                          if (!title && data.parsed.title) setTitle(data.parsed.title);
                          if (data.parsed.category) setCategory(data.parsed.category);
                        }
                      } catch (err) {
                        console.error('OCR error in modal:', err);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">
                    {proofType === 'upi_screenshot' ? 'Upload Payment Screenshot:' : 'Upload Cash Receipt:'}
                  </label>
                  {proofUrl && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Proof Attached
                    </span>
                  )}
                </div>

                {proofUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                    <img
                      src={proofUrl}
                      alt="Proof"
                      className="w-12 h-12 object-cover rounded-md border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-slate-700 font-bold block truncate text-[11px]">Payment Evidence Image</span>
                      <span className="text-slate-400 text-[10px] block">Attached for verification</span>
                    </div>
                    <label
                      htmlFor="proof-upload-input"
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition shrink-0"
                    >
                      Change
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="proof-upload-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingProof(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingProof(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDraggingProof(false);
                      const file = e.dataTransfer?.files?.[0];
                      if (!file || !file.type.startsWith('image/')) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const dataUrl = reader.result;
                        setProofUrl(dataUrl);
                        try {
                          const res = await fetch(`/api/trips/${tripId}/ai/ocr-expense`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              imageBase64: dataUrl,
                              mimeType: file.type,
                              members,
                              currentMemberId: paidByMemberId
                            })
                          });
                          const data = await res.json();
                          if (data.success && data.parsed) {
                            if (data.parsed.utr) setUtr(data.parsed.utr);
                            if (!totalAmount && data.parsed.totalAmount) setTotalAmount(String(data.parsed.totalAmount));
                            if (!title && data.parsed.title) setTitle(data.parsed.title);
                            if (data.parsed.category) setCategory(data.parsed.category);
                          }
                        } catch (err) {
                          console.error('OCR drop error:', err);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className={`p-3 border-2 border-dashed rounded-xl text-center cursor-pointer transition block ${
                      isDraggingProof
                        ? 'border-indigo-600 bg-indigo-100/70 ring-2 ring-indigo-400 scale-[1.01]'
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-[11px]">
                      <Camera className="w-4 h-4" />
                      <span>{isDraggingProof ? 'Drop image here to scan with OCR!' : 'Drag & Drop or Click to Upload Image (Auto-OCR)'}</span>
                    </div>
                  </label>
                )}

                {/* UTR Input */}
                {proofType === 'upi_screenshot' && (
                  <div className="pt-1">
                    <label className="font-semibold text-slate-700 block mb-1">UPI UTR / Reference ID (12 Digits):</label>
                    <input
                      type="text"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      placeholder="e.g. 428192038192"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            )}

            {proofType === 'no_proof' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
                ℹ️ Without proof, this expense will remain in <strong>Pending Verification</strong> until approved by the Manager (Manager Mode) or approved via In-Chat Group Poll (Democratic Mode).
              </p>
            )}
          </div>

          {/* Split Preview */}
          {splitPreview.length > 0 && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1.5">
              <span className="font-bold text-indigo-900 block">Split Preview:</span>
              <div className="grid grid-cols-2 gap-2">
                {splitPreview.map(p => {
                  const m = members.find(mem => mem.id === p.memberId);
                  return (
                    <div key={p.memberId} className="flex justify-between bg-white/80 p-1.5 rounded border border-indigo-100/50">
                      <span className="text-slate-700 truncate">{m?.display_name?.split(' ')[0]}:</span>
                      <span className="font-bold font-mono text-indigo-950">₹{p.shareAmount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Expense'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
