import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  mockTrips, 
  mockMembers, 
  mockBookings, 
  mockExpenses, 
  mockAuditLogs, 
  isUsingPlaceholder 
} from '@/lib/mockStore';
import { round2, calculateSplit } from '@/lib/services/splitEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch all refunds recorded for this trip
export async function GET(request, { params }) {
  const { id: tripId } = params;

  if (isUsingPlaceholder()) {
    const expenses = mockExpenses.filter(e => e.trip_id === tripId && (e.category === 'refund' || e.total_amount < 0));
    const auditLogs = mockAuditLogs.filter(a => a.trip_id === tripId && a.trigger_event === 'refund_issued');
    return NextResponse.json({ success: true, refunds: expenses, auditLogs });
  }

  try {
    const supabase = createAdminClient();
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .eq('category', 'refund')
      .order('created_at', { ascending: false });

    if (expErr) throw expErr;

    const { data: auditLogs, error: auditErr } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('trip_id', tripId)
      .eq('trigger_event', 'refund_issued')
      .order('created_at', { ascending: false });

    if (auditErr) throw auditErr;

    return NextResponse.json({ success: true, refunds: expenses || [], auditLogs: auditLogs || [] });
  } catch (error) {
    console.error('Fetch refunds error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Record a new refund and update settlement ledger
export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const body = await request.json();
    const {
      title,
      amount,
      payerMemberId, // Who received the refund in their account / original payer
      isSpecificPerson = true,
      beneficiaryMemberId = null, // Whose expense/ticket got cancelled (can be active, left, or removed)
      reason = '',
      performedByMemberId = null
    } = body;

    const refundAmount = round2(Math.abs(Number(amount || 0)));
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Please enter a valid refund amount.' }, { status: 400 });
    }

    if (!payerMemberId) {
      return NextResponse.json({ success: false, error: 'Please specify who received the refund from vendor.' }, { status: 400 });
    }

    if (isSpecificPerson && !beneficiaryMemberId) {
      return NextResponse.json({ success: false, error: 'Please select which traveler this refund belongs to.' }, { status: 400 });
    }

    const isSelfRefund = isSpecificPerson && payerMemberId === beneficiaryMemberId;

    if (isUsingPlaceholder()) {
      const members = mockMembers.filter(m => m.trip_id === tripId);
      const payer = members.find(m => m.id === payerMemberId);
      const beneficiary = isSpecificPerson ? members.find(m => m.id === beneficiaryMemberId) : null;

      let allocations = [];
      if (isSpecificPerson) {
        allocations = [{
          memberId: beneficiaryMemberId,
          shareAmount: -refundAmount,
          note: reason || 'Vendor refund'
        }];
      } else {
        const activeMemberIds = members.filter(m => m.status === 'active').map(m => m.id);
        const perPerson = round2(refundAmount / Math.max(1, activeMemberIds.length));
        allocations = activeMemberIds.map(mId => ({
          memberId: mId,
          shareAmount: -perPerson,
          note: reason || 'Group-wide vendor refund'
        }));
      }

      const newExpense = {
        id: 'refund-' + Date.now(),
        trip_id: tripId,
        booking_id: null,
        title: title ? `Refund: ${title}` : 'Vendor Refund',
        category: 'refund',
        total_amount: -refundAmount,
        paid_by_member_id: payerMemberId,
        date: new Date().toISOString().split('T')[0],
        split_method: isSpecificPerson ? 'exact' : 'equal',
        allocations,
        verification_status: 'verified',
        proof_type: 'no_proof',
        mismatch_flag: false,
        extracted_details: {
          isSpecificPerson,
          beneficiaryMemberId,
          beneficiaryName: beneficiary?.display_name || 'Group',
          payerMemberId,
          payerName: payer?.display_name || 'Traveler',
          reason,
          isSelfRefund
        },
        created_at: new Date().toISOString()
      };

      mockExpenses.unshift(newExpense);

      const auditLog = {
        id: 'audit-ref-' + Date.now(),
        trip_id: tripId,
        trigger_event: 'refund_issued',
        description: `Refund of ₹${refundAmount} recorded: "${newExpense.title}"`,
        affected_item_title: newExpense.title,
        affected_item_type: 'refund',
        affected_member_id: beneficiaryMemberId || payerMemberId,
        impact_summary: isSelfRefund
          ? `Self-paid refund: ${payer?.display_name} paid for this expense and received the refund back directly. ₹0 change in group settlement debts.`
          : `Settlement adjusted: ${beneficiary?.display_name}'s debt reduced by ₹${refundAmount.toLocaleString()}, credited to ${payer?.display_name}.`,
        performed_by: performedByMemberId || payerMemberId,
        created_at: new Date().toISOString()
      };

      mockAuditLogs.unshift(auditLog);

      return NextResponse.json({ success: true, refund: newExpense, auditLog });
    }

    const supabase = createAdminClient();

    // Fetch members to resolve display names
    const { data: members } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId);

    const payer = members?.find(m => m.id === payerMemberId);
    const beneficiary = isSpecificPerson ? members?.find(m => m.id === beneficiaryMemberId) : null;

    let allocations = [];
    if (isSpecificPerson) {
      allocations = [{
        memberId: beneficiaryMemberId,
        shareAmount: -refundAmount,
        note: reason || 'Vendor refund'
      }];
    } else {
      const activeMemberIds = members?.filter(m => m.status === 'active').map(m => m.id) || [];
      const perPerson = round2(refundAmount / Math.max(1, activeMemberIds.length));
      allocations = activeMemberIds.map(mId => ({
        memberId: mId,
        shareAmount: -perPerson,
        note: reason || 'Group-wide vendor refund'
      }));
    }

    // Insert into expenses table
    const { data: insertedExpense, error: insertErr } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        title: title ? `Refund: ${title}` : 'Vendor Refund',
        category: 'refund',
        total_amount: -refundAmount,
        paid_by_member_id: payerMemberId,
        date: new Date().toISOString().split('T')[0],
        split_method: isSpecificPerson ? 'exact' : 'equal',
        allocations,
        verification_status: 'verified',
        proof_type: 'no_proof',
        extracted_details: {
          isSpecificPerson,
          beneficiaryMemberId,
          beneficiaryName: beneficiary?.display_name || 'Group',
          payerMemberId,
          payerName: payer?.display_name || 'Traveler',
          reason,
          isSelfRefund
        }
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Create Audit Log
    const impactSummary = isSelfRefund
      ? `Self-paid refund: ${payer?.display_name} paid for this expense and received the refund back directly. ₹0 change in group settlement debts.`
      : `Settlement adjusted: ${beneficiary?.display_name}'s debt reduced by ₹${refundAmount.toLocaleString()}, credited to ${payer?.display_name}.`;

    const { data: insertedAudit, error: auditErr } = await supabase
      .from('audit_logs')
      .insert({
        trip_id: tripId,
        trigger_event: 'refund_issued',
        description: `Refund of ₹${refundAmount} recorded: "${insertedExpense.title}"`,
        affected_item_title: insertedExpense.title,
        affected_item_type: 'refund',
        affected_member_id: beneficiaryMemberId || payerMemberId,
        impact_summary: impactSummary,
        performed_by: performedByMemberId || payerMemberId
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      refund: insertedExpense,
      auditLog: insertedAudit
    });
  } catch (error) {
    console.error('Record refund error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
