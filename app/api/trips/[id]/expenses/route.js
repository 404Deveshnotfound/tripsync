import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockMembers, mockBookings, mockExpenses, isUsingPlaceholder } from '@/lib/mockStore';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

// GET: Fetch all expenses for a trip
export async function GET(request, { params }) {
  const { id } = params;

  if (isUsingPlaceholder()) {
    const expenses = mockExpenses.filter(e => e.trip_id === id);
    return NextResponse.json({ success: true, expenses });
  }

  try {
    const supabase = createAdminClient();
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add a new expense with deterministic split
export async function POST(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();
    const {
      title,
      category,
      totalAmount,
      paidByMemberId,
      splitMethod = 'equal',
      participantMemberIds = [],
      customMap = {},
      rooms = [],
      proofType = 'no_proof',
      proofUrl,
      extractedDetails,
      date,
      vendorName,
      bookingReference
    } = body;

    if (!title || !totalAmount || !paidByMemberId || !participantMemberIds?.length) {
      return NextResponse.json({ success: false, error: 'Missing required expense fields' }, { status: 400 });
    }

    const cost = round2(totalAmount);

    // Run deterministic split
    const allocations = calculateSplit({
      method: splitMethod,
      totalAmount: cost,
      selectedMemberIds: participantMemberIds,
      customMap,
      rooms
    });

    const finalExtractedDetails = {
      ...(extractedDetails || {}),
      ...(vendorName ? { vendorName } : {}),
      ...(bookingReference ? { bookingReference } : {})
    };

    // Mock store fallback
    if (isUsingPlaceholder()) {
      const newExpense = {
        id: 'exp-' + Date.now(),
        trip_id: id,
        title,
        category: category || 'other',
        total_amount: cost,
        paid_by_member_id: paidByMemberId,
        date: date || new Date().toISOString().split('T')[0],
        split_method: splitMethod,
        allocations,
        verification_status: proofType === 'no_proof' ? 'pending_verification' : 'verified',
        proof_type: proofType,
        proof_url: proofUrl || null,
        vendor_name: vendorName || null,
        booking_reference: bookingReference || null,
        extracted_details: finalExtractedDetails,
        created_at: new Date().toISOString()
      };

      mockExpenses.push(newExpense);

      const members = mockMembers.filter(m => m.trip_id === id);
      const bookings = mockBookings.filter(b => b.trip_id === id);
      const ledger = aggregateLedger({ members, bookings, expenses: mockExpenses.filter(e => e.trip_id === id) });

      return NextResponse.json({ success: true, expense: newExpense, ledger });
    }

    // Live Supabase insertion
    const supabase = createAdminClient();

    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({
        trip_id: id,
        title,
        category: category || 'other',
        total_amount: cost,
        paid_by_member_id: paidByMemberId,
        date: date || new Date().toISOString().split('T')[0],
        split_method: splitMethod,
        allocations, // Stored as JSONB in Supabase PostgreSQL!
        verification_status: proofType === 'no_proof' ? 'pending_verification' : 'verified',
        proof_type: proofType,
        proof_url: proofUrl,
        extracted_details: finalExtractedDetails
      })
      .select()
      .single();

    if (expErr) throw expErr;

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
