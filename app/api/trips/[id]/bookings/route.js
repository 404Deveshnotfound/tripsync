import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockTrips, mockMembers, mockBookings, mockExpenses, isUsingPlaceholder } from '@/lib/mockStore';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

// GET: Fetch all bookings and live ledger balance for a trip
export async function GET(request, { params }) {
  const { id } = params;

  // Mock store fallback
  if (isUsingPlaceholder()) {
    const bookings = mockBookings.filter(b => b.trip_id === id);
    const expenses = mockExpenses.filter(e => e.trip_id === id);
    const members = mockMembers.filter(m => m.trip_id === id);

    const ledger = aggregateLedger({ members, bookings, expenses });

    return NextResponse.json({
      success: true,
      bookings,
      ledger
    });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch bookings
    const { data: bookings, error: bookErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', id)
      .order('start_time', { ascending: true });

    if (bookErr) throw bookErr;

    // 2. Fetch expenses
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', id);

    if (expErr) throw expErr;

    // 3. Fetch members
    const { data: members, error: memErr } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', id);

    if (memErr) throw memErr;

    const ledger = aggregateLedger({ members, bookings, expenses });

    return NextResponse.json({
      success: true,
      bookings,
      ledger
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new booking linked to itinerary and finances
export async function POST(request, { params }) {
  const { id } = params;

  try {
    const body = await request.json();
    const {
      title,
      category,
      vendorName,
      bookingReference,
      startTime,
      endTime,
      location,
      cost,
      paidByMemberId,
      participantMemberIds,
      splitMethod = 'equal',
      customMap = {},
      rooms = [],
      cancellationPolicy
    } = body;

    if (!title || !category || !vendorName || !cost || !paidByMemberId || !participantMemberIds?.length) {
      return NextResponse.json({ success: false, error: 'Missing required booking fields' }, { status: 400 });
    }

    const totalCost = round2(cost);

    // Run deterministic split engine
    const allocations = calculateSplit({
      method: splitMethod,
      totalAmount: totalCost,
      selectedMemberIds: participantMemberIds,
      customMap,
      rooms
    });

    // Mock store fallback
    if (isUsingPlaceholder()) {
      const newBooking = {
        id: 'book-' + Date.now(),
        trip_id: id,
        title,
        category,
        vendor_name: vendorName,
        booking_reference: bookingReference || `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        start_time: startTime || new Date().toISOString(),
        end_time: endTime || null,
        location: location || '',
        original_cost: totalCost,
        current_cost: totalCost,
        refund_amount: 0,
        currency: 'INR',
        status: 'confirmed',
        paid_by_member_id: paidByMemberId,
        participant_member_ids: participantMemberIds,
        split_method: splitMethod,
        allocations,
        cancellation_policy: cancellationPolicy || '',
        created_at: new Date().toISOString()
      };

      mockBookings.push(newBooking);

      const members = mockMembers.filter(m => m.trip_id === id);
      const expenses = mockExpenses.filter(e => e.trip_id === id);
      const ledger = aggregateLedger({ members, bookings: mockBookings.filter(b => b.trip_id === id), expenses });

      return NextResponse.json({ success: true, booking: newBooking, ledger });
    }

    // Live Supabase insertion
    const supabase = createAdminClient();

    const { data: booking, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        trip_id: id,
        title,
        category,
        vendor_name: vendorName,
        booking_reference: bookingReference || `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        start_time: startTime,
        end_time: endTime,
        location,
        original_cost: totalCost,
        current_cost: totalCost,
        refund_amount: 0,
        currency: 'INR',
        status: 'confirmed',
        paid_by_member_id: paidByMemberId,
        participant_member_ids: participantMemberIds,
        split_method: splitMethod,
        cancellation_policy: cancellationPolicy
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Attach computed allocations into booking object
    const createdBooking = { ...booking, allocations };

    return NextResponse.json({ success: true, booking: createdBooking });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
