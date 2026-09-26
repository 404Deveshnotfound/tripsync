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
import { recalculateMemberLeaving, recalculateBookingCancellation } from '@/lib/services/recalcEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const body = await request.json();
    const { 
      action, // 'member_leave' | 'cancel_booking'
      memberId, 
      bookingId, 
      refundAmount = 0,
      reason = 'Trip change',
      performedByMemberId 
    } = body;

    // Handle Mock Store
    if (isUsingPlaceholder()) {
      let resultAuditLogs = [];

      if (action === 'member_leave' || action === 'member_removed') {
        const isRemoved = action === 'member_removed';
        const member = mockMembers.find(m => m.id === memberId && m.trip_id === tripId);
        if (!member) {
          return NextResponse.json({ success: false, error: 'Member not found in trip' }, { status: 404 });
        }

        // Mark member as left or removed
        member.status = isRemoved ? 'removed' : 'left';
        member.left_at = new Date().toISOString();
        member.reason_for_leaving = reason || (isRemoved ? 'Removed by Manager' : 'Left trip');

        const currentBookings = mockBookings.filter(b => b.trip_id === tripId);
        const currentExpenses = mockExpenses.filter(e => e.trip_id === tripId);

        // Run Dynamic Recalculation Engine
        const recalc = recalculateMemberLeaving({
          tripId,
          leavingMemberId: memberId,
          leavingMemberName: member.display_name,
          bookings: currentBookings,
          expenses: currentExpenses,
          performedByMemberId,
          triggerEvent: isRemoved ? 'member_removed' : 'participant_left',
          customDescription: isRemoved 
            ? `${member.display_name} was removed from the trip` 
            : `${member.display_name} left the trip`
        });

        // Update mock store
        recalc.updatedBookings.forEach(ub => {
          const idx = mockBookings.findIndex(b => b.id === ub.id);
          if (idx !== -1) mockBookings[idx] = ub;
        });

        recalc.updatedExpenses.forEach(ue => {
          const idx = mockExpenses.findIndex(e => e.id === ue.id);
          if (idx !== -1) mockExpenses[idx] = ue;
        });

        recalc.auditLogs.forEach(al => mockAuditLogs.unshift(al));
        resultAuditLogs = recalc.auditLogs;
      } else if (action === 'cancel_booking') {
        const booking = mockBookings.find(b => b.id === bookingId && b.trip_id === tripId);
        if (!booking) {
          return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
        }

        const recalc = recalculateBookingCancellation({
          tripId,
          booking,
          refundAmount,
          cancellationReason: reason,
          performedByMemberId
        });

        const idx = mockBookings.findIndex(b => b.id === recalc.updatedBooking.id);
        if (idx !== -1) mockBookings[idx] = recalc.updatedBooking;

        mockAuditLogs.unshift(recalc.auditLog);
        resultAuditLogs = [recalc.auditLog];
      }

      // Compute new ledger balances
      const members = mockMembers.filter(m => m.trip_id === tripId);
      const bookings = mockBookings.filter(b => b.trip_id === tripId);
      const expenses = mockExpenses.filter(e => e.trip_id === tripId);
      const ledger = aggregateLedger({ members, bookings, expenses });

      return NextResponse.json({
        success: true,
        auditLogs: resultAuditLogs,
        ledger
      });
    }

    // Live Supabase Execution
    const supabase = createAdminClient();

    if (action === 'member_leave' || action === 'member_removed') {
      const isRemoved = action === 'member_removed';
      // 1. Fetch member details
      const { data: member } = await supabase
        .from('trip_members')
        .select('*')
        .eq('id', memberId)
        .single();

      // 2. Fetch bookings & expenses
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('trip_id', tripId);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId);

      // 3. Run Recalculation Engine
      const recalc = recalculateMemberLeaving({
        tripId,
        leavingMemberId: memberId,
        leavingMemberName: member?.display_name || 'Traveler',
        bookings: bookings || [],
        expenses: expenses || [],
        performedByMemberId,
        triggerEvent: isRemoved ? 'member_removed' : 'participant_left',
        customDescription: isRemoved 
          ? `${member?.display_name || 'A participant'} was removed from the trip` 
          : `${member?.display_name || 'A participant'} left the trip`
      });

      // 4. Update member status to left or removed
      await supabase
        .from('trip_members')
        .update({
          status: isRemoved ? 'removed' : 'left',
          left_at: new Date().toISOString(),
          reason_for_leaving: reason || (isRemoved ? 'Removed by Manager' : 'Left trip')
        })
        .eq('id', memberId);

      // 5. Persist updated bookings
      for (const ub of recalc.updatedBookings) {
        await supabase
          .from('bookings')
          .update({
            participant_member_ids: ub.participant_member_ids,
            updated_at: new Date().toISOString()
          })
          .eq('id', ub.id);
      }

      // 6. Persist updated expenses
      for (const ue of recalc.updatedExpenses) {
        await supabase
          .from('expenses')
          .update({
            allocations: ue.allocations,
            updated_at: new Date().toISOString()
          })
          .eq('id', ue.id);
      }

      // 7. Insert audit logs
      if (recalc.auditLogs.length > 0) {
        await supabase
          .from('ledger_audit_logs')
          .insert(recalc.auditLogs.map(log => ({
            trip_id: tripId,
            trigger_event: log.trigger_event,
            description: log.description,
            affected_booking_id: log.affected_booking_id,
            affected_member_id: log.affected_member_id,
            snapshot_before: log.snapshot_before,
            snapshot_after: log.snapshot_after,
            impact_summary: log.impact_summary,
            performed_by: log.performed_by
          })));
      }

      return NextResponse.json({
        success: true,
        auditLogs: recalc.auditLogs
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown recalculation action' }, { status: 400 });
  } catch (error) {
    console.error('Recalculation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
