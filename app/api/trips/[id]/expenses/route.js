import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockMembers, mockBookings, mockExpenses, mockChatMessages, isUsingPlaceholder } from '@/lib/mockStore';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// GET: Fetch all expenses for a trip
export async function GET(request, { params }) {
  const { id } = params;

  if (isUsingPlaceholder() || !isUuid(id)) {
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
    const enrichedExpenses = (expenses || []).map(e => ({
      ...e,
      participant_member_ids: e.participant_member_ids || e.extracted_details?.participantMemberIds || e.allocations?.map(a => a.memberId) || []
    }));
    return NextResponse.json({ success: true, expenses: enrichedExpenses });
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
      bookingReference,
      locationName,
      locationCoords,
      coordinates
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
      participantMemberIds,
      ...(vendorName ? { vendorName } : {}),
      ...(bookingReference ? { bookingReference } : {}),
      ...(locationName ? { locationName } : {}),
      ...(locationCoords ? { locationCoords } : {}),
      ...(coordinates ? { coordinates } : {})
    };

    // Mock store fallback
    if (isUsingPlaceholder() || !isUuid(id)) {
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

      // Automatically post verification poll to group chat if no proof is provided
      if (proofType === 'no_proof') {
        const payer = members.find(m => m.id === paidByMemberId || m.user_id === paidByMemberId);
        const payerName = payer?.display_name || 'Traveler';
        const pollId = 'poll-' + newExpense.id;

        mockChatMessages.push({
          id: 'chat-poll-' + Date.now(),
          trip_id: id,
          sender_id: paidByMemberId,
          sender_name: payerName,
          message_type: 'poll',
          content: `Added ₹${cost.toLocaleString()} for "${title}" without receipt. Please vote to verify this expense for the group ledger:`,
          expense_id: newExpense.id,
          poll_data: {
            id: pollId,
            expense_id: newExpense.id,
            title: title,
            amount: cost,
            paid_by: payerName,
            status: 'active',
            votes: {
              [paidByMemberId]: 'approve'
            },
            required_votes: 2
          },
          created_at: new Date().toISOString()
        });
      }

      return NextResponse.json({ success: true, expense: newExpense, ledger });
    }

    // Live Supabase insertion
    const supabase = createAdminClient();

    // Resolve payer member ID and name
    let resolvedPayerMemberId = paidByMemberId;
    let payerName = 'Traveler';

    const { data: memberById } = await supabase
      .from('trip_members')
      .select('id, display_name')
      .eq('id', paidByMemberId)
      .maybeSingle();

    if (memberById) {
      resolvedPayerMemberId = memberById.id;
      payerName = memberById.display_name;
    } else {
      const { data: memberByUser } = await supabase
        .from('trip_members')
        .select('id, display_name')
        .eq('trip_id', id)
        .eq('user_id', paidByMemberId)
        .maybeSingle();
      if (memberByUser) {
        resolvedPayerMemberId = memberByUser.id;
        payerName = memberByUser.display_name;
      }
    }

    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({
        trip_id: id,
        title,
        category: category || 'other',
        total_amount: cost,
        paid_by_member_id: resolvedPayerMemberId,
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

    // Automatically post verification poll to group chat if no proof is provided
    if (proofType === 'no_proof' && expense) {
      const pollId = 'poll-' + expense.id;
      const pollData = {
        id: pollId,
        expense_id: expense.id,
        title: title,
        amount: cost,
        paid_by: payerName,
        status: 'active',
        votes: {
          [resolvedPayerMemberId]: 'approve'
        },
        required_votes: 2
      };

      await supabase
        .from('chat_messages')
        .insert({
          trip_id: id,
          sender_id: resolvedPayerMemberId,
          message_type: 'poll',
          content: `Added ₹${cost.toLocaleString()} for "${title}" without receipt. Please vote to verify this expense for the group ledger:`,
          expense_id: expense.id,
          poll_data: pollData
        });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
