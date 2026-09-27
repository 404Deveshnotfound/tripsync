'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ExpensesView from '@/components/ExpensesView';
import TransactionLogView from '@/components/TransactionLogView';
import TripChatPolls from '@/components/TripChatPolls';
import RefundsView from '@/components/RefundsView';
import SettlementView from '@/components/SettlementView';
import FinancialHealthDashboard from '@/components/FinancialHealthDashboard';
import PersonalDashboardView from '@/components/PersonalDashboardView';
import AddExpenseModal from '@/components/AddExpenseModal';
import AiExpenseParserModal from '@/components/AiExpenseParserModal';
import AiFinanceAssistantModal from '@/components/AiFinanceAssistantModal';
import OcrExpenseModal from '@/components/OcrExpenseModal';
import WeatherDigitalTwinView from '@/components/WeatherDigitalTwinView';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  CloudRain,
  Radio,
  Copy, 
  Check, 
  UserPlus, 
  ArrowLeft,
  Share2,
  DollarSign,
  History,
  RotateCcw,
  QrCode,
  Shield,
  Sparkles,
  MessageSquare,
  Vote,
  AlertCircle,
  PieChart as PieIcon,
  UserCheck,
  Bot,
  LogOut,
  UserMinus,
  X
} from 'lucide-react';

export default function TripOverviewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [settlementTransfers, setSettlementTransfers] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isDemocratic, setIsDemocratic] = useState(false);

  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAiExpenseOpen, setIsAiExpenseOpen] = useState(false);
  const [isOcrExpenseOpen, setIsOcrExpenseOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiInitialExpenseData, setAiInitialExpenseData] = useState(null);

  // Member leave & remove states
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);

  const myMember = members.find(m => m.user_id === user?.id);



  // Fetch full trip data, bookings, expenses, chat, audit logs, and settlements
  const loadTripData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch trip metadata & members
      const resTrip = await fetch(`/api/trips/${id}?userId=${user?.id || ''}`);
      const dataTrip = await resTrip.json();
      if (dataTrip.success) {
        setTrip(dataTrip.trip);
        setMembers(dataTrip.members || []);
        setMyRole(dataTrip.myRole);
        setIsOwner(dataTrip.isOwner);
        setIsManager(dataTrip.isManager);
        setIsDemocratic(dataTrip.isDemocratic);
      }

      // 2. Fetch bookings & live ledger
      const resBookings = await fetch(`/api/trips/${id}/bookings`);
      const dataBookings = await resBookings.json();
      if (dataBookings.success) {
        setBookings(dataBookings.bookings || []);
        setLedger(dataBookings.ledger || null);
      }

      // 3. Fetch expenses
      const resExp = await fetch(`/api/trips/${id}/expenses`);
      const dataExp = await resExp.json();
      if (dataExp.success) {
        setExpenses(dataExp.expenses || []);
      }

      // 4. Fetch audit logs (What Changed?)
      const resAudit = await fetch(`/api/trips/${id}/audit-logs`);
      const dataAudit = await resAudit.json();
      if (dataAudit.success) {
        setAuditLogs(dataAudit.auditLogs || []);
      }

      // 5. Fetch Chat Messages & Polls
      const resChat = await fetch(`/api/trips/${id}/chat`);
      const dataChat = await resChat.json();
      if (dataChat.success) {
        setChatMessages(dataChat.messages || []);
      }

      // 6. Fetch Greedy Settlements & Explainability Breakdowns
      const resSettle = await fetch(`/api/trips/${id}/settlements?t=${Date.now()}`, { cache: 'no-store' });
      const dataSettle = await resSettle.json();
      if (dataSettle.success) {
        setSettlementTransfers(dataSettle.transfers || []);
      }
    } catch (err) {
      console.error('Error fetching trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripData();
  }, [id, user]);

  const copyInviteCode = () => {
    if (!trip?.invite_code) return;
    navigator.clipboard.writeText(trip.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join?code=${trip?.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };



  const handleExpenseAdded = () => {
    loadTripData();
  };

  const handleAiParsedApply = (parsedData) => {
    setAiInitialExpenseData({
      title: parsedData.title,
      category: parsedData.category,
      totalAmount: parsedData.totalAmount,
      paidByMemberId: parsedData.paidByMemberId,
      participantMemberIds: parsedData.participantMemberIds,
      splitMethod: parsedData.splitMethod,
      proofType: parsedData.proofType || 'no_proof',
      proofUrl: parsedData.proofUrl || null,
      utr: parsedData.utr || '',
    });
    setIsAddExpenseOpen(true);
  };

  const handleRecalculationTriggered = () => {
    loadTripData();
    setActiveTab('logs');
  };

  const handleConfirmLeave = async () => {
    if (!myMember) return;
    setIsLeaveLoading(true);
    try {
      const res = await fetch(`/api/trips/${id}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'member_leave',
          memberId: myMember.id,
          reason: leaveReason || 'Left trip early',
          performedByMemberId: myMember.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsLeaveModalOpen(false);
        setLeaveReason('');
        await loadTripData();
      } else {
        alert(data.error || 'Failed to leave trip');
      }
    } catch (err) {
      console.error('Leave trip error:', err);
      alert('Error leaving trip: ' + err.message);
    } finally {
      setIsLeaveLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setIsRemoveLoading(true);
    try {
      const res = await fetch(`/api/trips/${id}/recalculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'member_removed',
          memberId: memberToRemove.id,
          reason: removeReason || 'Removed by Manager',
          performedByMemberId: myMember?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setMemberToRemove(null);
        setRemoveReason('');
        await loadTripData();
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Remove member error:', err);
      alert('Error removing member: ' + err.message);
    } finally {
      setIsRemoveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800">Trip Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">The requested trip ledger does not exist or has been archived.</p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isManagerTrip = trip.governance_mode === 'manager_based';
  const canAddBooking = isDemocratic || isManager;
  const pendingVerificationCount = expenses.filter(e => e.verification_status === 'pending_verification').length;
  const refundsCount = expenses.filter(e => e.category === 'refund' || e.type === 'refund' || Number(e.total_amount) < 0).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      


      {/* Top Breadcrumb & Share Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Trips
        </Link>

        {/* Invite Code Quick Copy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs">
            <span className="text-slate-400 font-medium">Invite Code:</span>
            <span className="font-mono font-bold text-slate-900">{trip.invite_code}</span>
            <button
              onClick={copyInviteCode}
              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
              title="Copy invite code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={copyInviteLink}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copiedLink ? 'Link Copied!' : 'Share Link'}
          </button>
        </div>
      </div>

      {/* Hero Trip Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isManagerTrip 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isManagerTrip ? <ShieldCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                {isManagerTrip ? 'Manager-Based Trip' : 'Democratic (Group-Managed)'}
              </span>

              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                Status: {trip.status}
              </span>

              {myRole && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                  Your Role: {myRole}
                </span>
              )}
            </div>

            {/* Title & Metadata */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {trip.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{trip.destination}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{trip.start_date} &rarr; {trip.end_date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>{members.filter(m => m.status === 'active').length} Active Travelers</span>
              </div>
            </div>

            {trip.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                {trip.description}
              </p>
            )}

            {/* Self-Leave Trip Action (Below Description) */}
            {myMember && myMember.status === 'active' && !isOwner && (
              <div className="pt-2">
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition shadow-sm"
                  title="Leave this trip early and trigger automatic cost recalculation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Leave Trip
                </button>
              </div>
            )}
            {myMember && (myMember.status === 'left' || myMember.status === 'removed') && (
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200">
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  {myMember.status === 'left' ? 'You have left this trip' : 'You were removed from this trip'}
                </span>
              </div>
            )}

          </div>

          {/* Quick Ledger Snapshot Box */}
          <div className="w-full md:w-72 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
            <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider block">
              Trip Ledger Snapshot
            </span>
            <div>
              <div className="text-xs text-slate-400">Total Group Spend:</div>
              <div className="text-2xl font-black font-mono">
                ₹{Number(ledger?.totalTripCost || 0).toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span>Bookings: <strong>{bookings.length}</strong></span>
              <span>Transfers: <strong>{settlementTransfers.length}</strong></span>
            </div>
          </div>

        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Members', icon: Users },
            { id: 'digital-twin', label: 'Weather Digital Twin 🌪️', icon: CloudRain, highlight: true },
            { id: 'personal', label: 'My Dashboard', icon: UserCheck },
            { id: 'expenses', label: `Expenses & Splits (${expenses.length + bookings.length})`, icon: DollarSign },
            { id: 'logs', label: `Transaction Log (${auditLogs.length + expenses.length + bookings.length})`, icon: History },
            { id: 'refunds', label: `Refunds (${refundsCount})`, icon: RotateCcw },
            { id: 'chat', label: `Group Chat (${chatMessages.length})`, icon: MessageSquare },
            { id: 'settle', label: `Settlement & UPI (${settlementTransfers.length})`, icon: QrCode },
            { id: 'health', label: 'Financial Health', icon: PieIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                    : tab.highlight
                    ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-700 border border-indigo-300 font-bold hover:from-purple-100 hover:to-indigo-100 shadow-sm'
                    : tab.alert
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Tab 1: Overview & Members */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Trip Participants & Balances</h3>
                <p className="text-xs text-slate-500">Live balance breakdown per participant</p>
              </div>
              <button
                onClick={copyInviteCode}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Invite Friend
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const summary = ledger?.memberSummaries?.find(s => s.memberId === member.id);
                const isCurrent = member.user_id === user?.id;

                return (
                  <div key={member.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {member.display_name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{member.display_name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">You</span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border capitalize bg-slate-50 border-slate-200 text-slate-700">
                            {member.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          UPI: {member.upi_id || 'Not linked'} &bull; {summary?.participatingBookingsCount || 0} active activities
                        </div>
                      </div>
                    </div>

                    {/* Member Net Balance & Status */}
                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right">
                        {summary ? (
                          <div>
                            <div className={`text-sm font-black font-mono ${
                              summary.isCreditor ? 'text-emerald-600' :
                              summary.isDebtor ? 'text-rose-600' :
                              'text-slate-600'
                            }`}>
                              {summary.isCreditor ? `+₹${Number(summary.netBalance || 0).toLocaleString()}` :
                               summary.isDebtor ? `-₹${Number(Math.abs(summary.netBalance || 0)).toLocaleString()}` :
                               '₹0.00'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Paid: ₹{Number(summary.totalPaid || 0).toLocaleString()} | Share: ₹{Number(summary.totalShare || 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No transactions</div>
                        )}
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        member.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : member.status === 'removed'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {member.status === 'active' ? '● Active' : member.status === 'removed' ? '○ Removed' : '○ Left Trip'}
                      </span>

                      {/* Manager Remove Participant Action */}
                      {isManagerTrip && (isOwner || isManager) && member.status === 'active' && member.role !== 'owner' && member.user_id !== user?.id && (
                        <button
                          onClick={() => {
                            setMemberToRemove(member);
                            setRemoveReason('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title={`Remove ${member.display_name} from trip (triggers cost recalculation)`}
                        >
                          <UserMinus className="w-4 h-4 text-rose-500" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: Personal Dashboard */}
      {activeTab === 'personal' && (
        <PersonalDashboardView
          members={members}
          bookings={bookings}
          expenses={expenses}
          transfers={settlementTransfers}
          ledger={ledger}
          currentUserId={user?.id}
          onNavigateToSettle={() => setActiveTab('settle')}
        />
      )}

      {/* Tab 3: Expenses & Splits (Consolidated Master Log & My Personal) */}
      {activeTab === 'expenses' && (
        <ExpensesView
          expenses={expenses}
          bookings={bookings}
          members={members}
          ledger={ledger}
          currentUserId={user?.id}
          onOpenAddExpense={() => {
            setAiInitialExpenseData(null);
            setIsAddExpenseOpen(true);
          }}
          onOpenAiAddExpense={() => setIsAiExpenseOpen(true)}
          onOpenOcrExpense={() => setIsOcrExpenseOpen(true)}
        />
      )}

      {/* Tab 4: Transaction & Recalculation Log */}
      {activeTab === 'logs' && (
        <TransactionLogView
          expenses={expenses}
          bookings={bookings}
          auditLogs={auditLogs}
          members={members}
          currentUserId={user?.id}
        />
      )}

      {/* Tab 5: Refunds Log & Dedicated Split Reversal Manager */}
      {activeTab === 'refunds' && (
        <RefundsView
          tripId={id}
          expenses={expenses}
          bookings={bookings}
          auditLogs={auditLogs}
          members={members}
          ledger={ledger}
          currentUserId={user?.id}
          onRefundAdded={loadTripData}
        />
      )}

      {/* Tab 6: Group Chat & In-Chat Voting Polls */}
      {activeTab === 'chat' && (
        <TripChatPolls
          tripId={id}
          messages={chatMessages}
          members={members}
          currentUserId={user?.id}
          isManager={isManager}
          isDemocratic={isDemocratic}
          onMessageSent={loadTripData}
          onVoteCast={loadTripData}
          onExpenseVerified={loadTripData}
        />
      )}

      {/* Tab 8: Smart Settlement & Device-Adaptive UPI */}
      {activeTab === 'settle' && (
        <SettlementView
          transfers={settlementTransfers}
          ledger={ledger}
          members={members}
          tripTitle={trip.title}
          tripId={id}
          currentUserId={user?.id}
          onSettlementUpdated={loadTripData}
        />
      )}

      {/* Tab 9: Executive Financial Health (Recharts) */}
      {activeTab === 'health' && (
        <FinancialHealthDashboard
          ledger={ledger}
          bookings={bookings}
          expenses={expenses}
          members={members}
        />
      )}

      {/* Tab: Weather-Driven AI Digital Twin (HackCelestial 3.0 Midnight Task & Nugen Aligned) */}
      {activeTab === 'digital-twin' && (
        <WeatherDigitalTwinView
          tripId={id}
          destination={trip?.destination || 'Goa, India'}
          onLedgerUpdated={loadTripData}
          expenses={expenses}
          bookings={bookings}
        />
      )}



      {/* Floating AI Finance Copilot Trigger */}
      <button
        onClick={() => setIsAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center gap-2.5 font-bold text-xs tracking-wide transition-all transform hover:scale-105 active:scale-95 border border-indigo-300/30"
        title="Ask AI Finance Copilot"
      >
        <Bot className="w-5 h-5 text-indigo-200" />
        <span className="font-semibold">Ask AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>



      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setAiInitialExpenseData(null);
        }}
        tripId={id}
        members={members}
        initialData={aiInitialExpenseData}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Phase 7: AI Natural Language Expense Parser Modal */}
      <AiExpenseParserModal
        isOpen={isAiExpenseOpen}
        onClose={() => setIsAiExpenseOpen(false)}
        tripId={id}
        members={members}
        currentUserId={user?.id}
        onParsedApply={handleAiParsedApply}
      />

      {/* Phase 8: OCR + AI Receipt & UPI Screenshot Scanner Modal */}
      <OcrExpenseModal
        isOpen={isOcrExpenseOpen}
        onClose={() => setIsOcrExpenseOpen(false)}
        tripId={id}
        members={members}
        currentUserId={user?.id}
        onParsedApply={handleAiParsedApply}
      />

      {/* Phase 7: AI Finance Copilot Assistant Modal */}
      <AiFinanceAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        tripId={id}
        trip={trip}
        ledger={ledger}
        bookings={bookings}
        expenses={expenses}
        members={members}
        auditLogs={auditLogs}
      />

      {/* Leave Trip Confirmation Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <LogOut className="w-5 h-5" />
                <span>Leave Trip</span>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const mySummary = ledger?.memberSummaries?.find(s => s.memberId === myMember?.id);
              const myCommittedShare = Number(mySummary?.totalShare || 0);
              const myNetBalance = Number(mySummary?.netBalance || 0);

              return (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Are you sure you want to leave <strong>{trip?.title}</strong>?
                  </p>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-2">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Pre-Decided Share Obligation &amp; No-Loss Policy
                    </span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      All predecided amounts for itineraries and shared expenses already booked or paid remain your financial liability. Remaining travelers will <strong>not</strong> incur an unfair loss or absorb your share.
                    </p>
                    <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-800">Your Locked Pre-Committed Share:</span>
                      <span className="font-mono text-rose-700 font-bold text-sm">₹{myCommittedShare.toLocaleString()}</span>
                    </div>
                    {myNetBalance < 0 && (
                      <div className="text-[11px] text-rose-800 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                        <span>
                          You currently have an outstanding balance of <strong>₹{Math.abs(myNetBalance).toLocaleString()}</strong>. This amount remains an active debt payable by you to the payer(s) via UPI.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Leaving (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Flight booked early / Emergency"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={isLeaveLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={isLeaveLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLeaveLoading ? 'Recalculating...' : 'Confirm & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Participant Modal (Manager / Owner) */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <UserMinus className="w-5 h-5" />
                <span>Remove Participant</span>
              </div>
              <button
                onClick={() => setMemberToRemove(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const removeSummary = ledger?.memberSummaries?.find(s => s.memberId === memberToRemove?.id);
              const removeCommittedShare = Number(removeSummary?.totalShare || 0);
              const removeNetBalance = Number(removeSummary?.netBalance || 0);

              return (
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Are you sure you want to remove <strong>{memberToRemove.display_name}</strong> from this trip?
                  </p>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-2">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Pre-Committed Share Locked (Remaining Travelers Protected)
                    </span>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      In accordance with the fair split policy, removing this participant will <strong>not</strong> impose extra costs or losses on the remaining travelers. Their predecided share for already booked itineraries remains locked as their payable liability.
                    </p>
                    <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-800">Their Locked Share Obligation:</span>
                      <span className="font-mono text-rose-700 font-bold text-sm">₹{removeCommittedShare.toLocaleString()}</span>
                    </div>
                    {removeNetBalance < 0 && (
                      <div className="text-[11px] text-amber-900 font-medium bg-amber-100/60 p-2.5 rounded-lg border border-amber-300 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                        <span>
                          Outstanding debt due: <strong>₹{Math.abs(removeNetBalance).toLocaleString()}</strong> remains recorded in the settlement ledger and payable by {memberToRemove.display_name}.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Removal (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cancelled attendance / Disputed terms"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isRemoveLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isRemoveLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRemoveLoading ? 'Recalculating...' : 'Remove & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
