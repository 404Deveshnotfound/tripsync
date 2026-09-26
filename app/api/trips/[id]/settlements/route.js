import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  mockTrips, 
  mockMembers, 
  mockBookings, 
  mockExpenses, 
  mockSettlements,
  isUsingPlaceholder 
} from '@/lib/mockStore';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';
import { solveMinimalSettlements, buildExplainabilityTree } from '@/lib/services/settlementSolver';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Calculate greedy debt minimization transfers and explainability breakdowns
export async function GET(request, { params }) {
  const { id: tripId } = params;

  if (isUsingPlaceholder()) {
    const members = mockMembers.filter(m => m.trip_id === tripId);
    const bookings = mockBookings.filter(b => b.trip_id === tripId);
    const expenses = mockExpenses.filter(e => e.trip_id === tripId);

    const ledger = aggregateLedger({ members, bookings, expenses });
    const rawTransfers = solveMinimalSettlements(ledger.memberSummaries);

    // Attach explainability line-item breakdown to each transfer
    const transfers = rawTransfers.map(tr => {
      const debtorSummary = ledger.memberSummaries.find(m => m.memberId === tr.payerMemberId);
      const breakdown = buildExplainabilityTree(debtorSummary, tr.receiverMemberId);

      // Check if persistent settlement transaction exists in mockSettlements
      const existing = mockSettlements.find(
        s => (s.id === tr.id) || (s.payer_member_id === tr.payerMemberId && s.receiver_member_id === tr.receiverMemberId)
      );

      return {
        ...tr,
        dbId: existing?.id || null,
        status: existing?.status || 'pending',
        utrNumber: existing?.utr_number || existing?.utrNumber || null,
        proofData: existing?.breakdown_summary || null,
        breakdown
      };
    });

    return NextResponse.json({
      success: true,
      transfers,
      ledger
    });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch bookings, expenses, members
    const { data: members } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId);

    const ledger = aggregateLedger({ 
      members: members || [], 
      bookings: bookings || [], 
      expenses: expenses || [] 
    });

    const rawTransfers = solveMinimalSettlements(ledger.memberSummaries);

    // Fetch existing settlements from database
    const { data: existingSettlements } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId);

    const transfers = rawTransfers.map(tr => {
      const debtorSummary = ledger.memberSummaries.find(m => m.memberId === tr.payerMemberId);
      const breakdown = buildExplainabilityTree(debtorSummary, tr.receiverMemberId);

      const existing = existingSettlements?.find(
        s => s.payer_member_id === tr.payerMemberId && s.receiver_member_id === tr.receiverMemberId
      );

      return {
        ...tr,
        dbId: existing?.id || null,
        status: existing?.status || 'pending',
        utrNumber: existing?.utr_number || null,
        proofData: existing?.breakdown_summary || null,
        breakdown
      };
    });

    return NextResponse.json({
      success: true,
      transfers,
      ledger
    });
  } catch (error) {
    console.error('Fetch settlements error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
