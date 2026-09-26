'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import MasterItineraryView from '@/components/MasterItineraryView';
import ExpensesView from '@/components/ExpensesView';
import WhatChangedDiffView from '@/components/WhatChangedDiffView';
import TripChatPolls from '@/components/TripChatPolls';
import VerificationQueueView from '@/components/VerificationQueueView';
import SettlementView from '@/components/SettlementView';
import FinancialHealthDashboard from '@/components/FinancialHealthDashboard';
import PersonalDashboardView from '@/components/PersonalDashboardView';
import WhatIfSimulatorView from '@/components/WhatIfSimulatorView';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';
import AddBookingModal from '@/components/AddBookingModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import AiExpenseParserModal from '@/components/AiExpenseParserModal';
import AiFinanceAssistantModal from '@/components/AiFinanceAssistantModal';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Copy, 
  Check, 
  UserPlus, 
  ArrowLeft,
  Share2,
  DollarSign,
  History,
  QrCode,
  Shield,
  Sparkles,
  MessageSquare,
  Vote,
  AlertCircle,
  PieChart as PieIcon,
  Sliders,
  UserCheck,
  Bot
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

  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAiExpenseOpen, setIsAiExpenseOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiInitialExpenseData, setAiInitialExpenseData] = useState(null);

  // Hook for Offline-First Sync
  const {
    isOnline,
    pendingOfflineCount,
    isSyncing,
    lastSyncToast,
    syncQueue,
    recordOffline
  } = useOfflineSync(id, () => {
    loadTripData();
  });

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
      const resSettle = await fetch(`/api/trips/${id}/settlements`);
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

  const handleBookingAdded = () => {
    loadTripData();
  };

  const handleExpenseAdded = async (newExpenseData) => {
    if (!navigator.onLine) {
      await recordOffline(newExpenseData);
      return;
    }
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
    });
    setIsAddExpenseOpen(true);
  };

  const handleRecalculationTriggered = () => {
    loadTripData();
    setActiveTab('diff');
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Offline Status & Auto-Sync Banner */}
      <OfflineSyncBanner
        isOnline={isOnline}
        pendingOfflineCount={pendingOfflineCount}
        isSyncing={isSyncing}
        lastSyncToast={lastSyncToast}
        onSyncNow={syncQueue}
      />

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

          </div>

          {/* Quick Ledger Snapshot Box */}
          <div className="w-full md:w-72 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm space-y-3 shrink-0">
            <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider block">
              Trip Ledger Snapshot
            </span>
            <div>
              <div className="text-xs text-slate-400">Total Group Spend:</div>
              <div className="text-2xl font-black font-mono">
                ₹{ledger?.totalTripCost?.toLocaleString() || '0'}
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
            { id: 'personal', label: 'My Dashboard', icon: UserCheck },
            { id: 'itinerary', label: `Master Itinerary (${bookings.length})`, icon: Calendar },
            { id: 'expenses', label: `Expenses & Splits (${expenses.length})`, icon: DollarSign },
            { id: 'diff', label: `What Changed? (${auditLogs.length})`, icon: History, highlight: true },
            { id: 'chat', label: `Chat & Polls (${chatMessages.length})`, icon: MessageSquare },
            { id: 'verify', label: `Verification (${pendingVerificationCount})`, icon: ShieldCheck, alert: pendingVerificationCount > 0 },
            { id: 'settle', label: `Settlement & UPI (${settlementTransfers.length})`, icon: QrCode },
            { id: 'health', label: 'Financial Health', icon: PieIcon },
            { id: 'simulate', label: 'What-If Sandbox', icon: Sliders }
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
                              {summary.isCreditor ? `+₹${summary.netBalance.toLocaleString()}` :
                               summary.isDebtor ? `-₹${Math.abs(summary.netBalance).toLocaleString()}` :
                               '₹0.00'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Paid: ₹{summary.totalPaid.toLocaleString()} | Share: ₹{summary.totalShare.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">No transactions</div>
                        )}
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        member.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {member.status === 'active' ? '● Active' : '○ Left Trip'}
                      </span>
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

      {/* Tab 3: Master & Personal Itinerary */}
      {activeTab === 'itinerary' && (
        <MasterItineraryView
          bookings={bookings}
          members={members}
          currentUserId={user?.id}
          canAddBooking={canAddBooking}
          onOpenAddModal={() => setIsAddBookingOpen(true)}
        />
      )}

      {/* Tab 4: Expenses & Splits */}
      {activeTab === 'expenses' && (
        <ExpensesView
          expenses={expenses}
          members={members}
          ledger={ledger}
          currentUserId={user?.id}
          onOpenAddExpense={() => {
            setAiInitialExpenseData(null);
            setIsAddExpenseOpen(true);
          }}
          onOpenAiAddExpense={() => setIsAiExpenseOpen(true)}
        />
      )}

      {/* Tab 5: "What Changed?" Dynamic Recalculation Diff Engine */}
      {activeTab === 'diff' && (
        <WhatChangedDiffView
          auditLogs={auditLogs}
          members={members}
          tripId={id}
          currentUserId={user?.id}
          onTriggerRecalculate={handleRecalculationTriggered}
        />
      )}

      {/* Tab 6: Group Chat & In-Chat Voting Polls */}
      {activeTab === 'chat' && (
        <TripChatPolls
          tripId={id}
          messages={chatMessages}
          members={members}
          currentUserId={user?.id}
          onMessageSent={loadTripData}
          onVoteCast={loadTripData}
        />
      )}

      {/* Tab 7: Multi-Tier Verification Queue */}
      {activeTab === 'verify' && (
        <VerificationQueueView
          tripId={id}
          expenses={expenses}
          members={members}
          isManager={isManager}
          isDemocratic={isDemocratic}
          currentUserId={user?.id}
          onVerificationUpdated={loadTripData}
        />
      )}

      {/* Tab 8: Smart Settlement & Device-Adaptive UPI */}
      {activeTab === 'settle' && (
        <SettlementView
          transfers={settlementTransfers}
          ledger={ledger}
          members={members}
          tripTitle={trip.title}
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

      {/* Tab 10: "What-If?" Simulation Sandbox */}
      {activeTab === 'simulate' && (
        <WhatIfSimulatorView
          bookings={bookings}
          expenses={expenses}
          members={members}
          ledger={ledger}
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

      {/* Modals */}
      <AddBookingModal
        isOpen={isAddBookingOpen}
        onClose={() => setIsAddBookingOpen(false)}
        tripId={id}
        members={members}
        onBookingAdded={handleBookingAdded}
      />

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
        members={members}
        currentUserId={user?.id}
        onParsedApply={handleAiParsedApply}
      />

      {/* Phase 7: AI Finance Copilot Assistant Modal */}
      <AiFinanceAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        ledger={ledger}
        bookings={bookings}
        expenses={expenses}
        members={members}
        auditLogs={auditLogs}
      />

    </div>
  );
}
