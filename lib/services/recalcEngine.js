import { round2, calculateSplit } from './splitEngine';

/**
 * TripSync — Dynamic Recalculation Engine
 * 
 * When a participant leaves a trip, cancels an activity, or when a refund occurs:
 * 1. Detects all affected bookings & expenses.
 * 2. Captures Snapshot Before (totalCost, participantCount, perPersonCost, allocations).
 * 3. Removes the member from the active allocation roster.
 * 4. Recalculates remaining members' shares deterministically.
 * 5. Captures Snapshot After & computes exact financial impact delta.
 * 6. Returns audit log records ready for the "What Changed?" view.
 */

/**
 * Handles a participant leaving the trip
 */
export function recalculateMemberLeaving({
  tripId,
  leavingMemberId,
  leavingMemberName,
  bookings = [],
  expenses = [],
  performedByMemberId = null
}) {
  const auditLogs = [];
  const updatedBookings = [];
  const updatedExpenses = [];

  // 1. Process Affected Bookings
  bookings.forEach(booking => {
    // Check if the leaving member was participating
    if (booking.participant_member_ids?.includes(leavingMemberId) && booking.status !== 'cancelled') {
      const originalCount = booking.participant_member_ids.length;
      const originalCost = round2(booking.current_cost || booking.original_cost || 0);
      const originalPerPerson = round2(originalCost / originalCount);

      // Snapshot Before
      const snapshotBefore = {
        totalCost: originalCost,
        participantCount: originalCount,
        perPersonCost: originalPerPerson,
        allocations: (booking.allocations || []).map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount
        }))
      };

      // New roster without the leaving member
      const newParticipantIds = booking.participant_member_ids.filter(id => id !== leavingMemberId);

      // If everyone left, cost is 0 or unallocated; otherwise re-split among remaining
      let newAllocations = [];
      let newPerPerson = 0;
      let impactSummary = '';

      if (newParticipantIds.length > 0) {
        newAllocations = calculateSplit({
          method: booking.split_method || 'equal',
          totalAmount: originalCost,
          selectedMemberIds: newParticipantIds
        });
        newPerPerson = round2(originalCost / newParticipantIds.length);
        const perPersonDelta = round2(newPerPerson - originalPerPerson);
        impactSummary = `Remaining ${newParticipantIds.length} travelers: +₹${perPersonDelta} each`;
      } else {
        impactSummary = 'All participants left this booking.';
      }

      // Snapshot After
      const snapshotAfter = {
        totalCost: originalCost,
        participantCount: newParticipantIds.length,
        perPersonCost: newPerPerson,
        allocations: newAllocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount
        }))
      };

      // Create updated booking
      const updated = {
        ...booking,
        participant_member_ids: newParticipantIds,
        allocations: newAllocations,
        updated_at: new Date().toISOString()
      };
      updatedBookings.push(updated);

      // Record Audit Log for "What Changed?"
      auditLogs.push({
        id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        trip_id: tripId,
        trigger_event: 'participant_left',
        description: `${leavingMemberName || 'A participant'} left the trip`,
        affected_item_title: booking.title,
        affected_item_type: 'booking',
        affected_booking_id: booking.id,
        affected_member_id: leavingMemberId,
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        impact_summary: impactSummary,
        performed_by: performedByMemberId,
        created_at: new Date().toISOString()
      });
    } else {
      updatedBookings.push(booking);
    }
  });

  // 2. Process Affected Ad-Hoc Expenses
  expenses.forEach(expense => {
    const hasAlloc = expense.allocations?.some(a => a.memberId === leavingMemberId && a.shareAmount > 0);
    if (hasAlloc) {
      const activeAllocs = expense.allocations.filter(a => a.shareAmount > 0);
      const originalCount = activeAllocs.length;
      const totalAmount = round2(expense.total_amount);
      const originalPerPerson = round2(totalAmount / originalCount);

      const snapshotBefore = {
        totalCost: totalAmount,
        participantCount: originalCount,
        perPersonCost: originalPerPerson,
        allocations: expense.allocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount
        }))
      };

      const remainingMemberIds = activeAllocs
        .filter(a => a.memberId !== leavingMemberId)
        .map(a => a.memberId);

      let newAllocations = [];
      let newPerPerson = 0;
      let impactSummary = '';

      if (remainingMemberIds.length > 0) {
        newAllocations = calculateSplit({
          method: expense.split_method || 'equal',
          totalAmount: totalAmount,
          selectedMemberIds: remainingMemberIds
        });
        newPerPerson = round2(totalAmount / remainingMemberIds.length);
        const delta = round2(newPerPerson - originalPerPerson);
        impactSummary = `Remaining ${remainingMemberIds.length} travelers: +₹${delta} each`;
      }

      const snapshotAfter = {
        totalCost: totalAmount,
        participantCount: remainingMemberIds.length,
        perPersonCost: newPerPerson,
        allocations: newAllocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount
        }))
      };

      const updatedExp = {
        ...expense,
        allocations: newAllocations,
        updated_at: new Date().toISOString()
      };
      updatedExpenses.push(updatedExp);

      auditLogs.push({
        id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        trip_id: tripId,
        trigger_event: 'participant_left',
        description: `${leavingMemberName || 'A participant'} left the trip`,
        affected_item_title: expense.title,
        affected_item_type: 'expense',
        affected_booking_id: null,
        affected_member_id: leavingMemberId,
        snapshot_before: snapshotBefore,
        snapshot_after: snapshotAfter,
        impact_summary: impactSummary,
        performed_by: performedByMemberId,
        created_at: new Date().toISOString()
      });
    } else {
      updatedExpenses.push(expense);
    }
  });

  return {
    updatedBookings,
    updatedExpenses,
    auditLogs
  };
}

/**
 * Handles Booking Cancellation and Refund Recalculation
 */
export function recalculateBookingCancellation({
  tripId,
  booking,
  refundAmount = 0,
  cancellationReason = 'Cancelled by group',
  performedByMemberId = null
}) {
  const originalCost = round2(booking.current_cost || booking.original_cost || 0);
  const refund = round2(refundAmount);
  const netLiability = Math.max(0, round2(originalCost - refund));
  const participants = booking.participant_member_ids || [];

  const snapshotBefore = {
    totalCost: originalCost,
    participantCount: participants.length,
    perPersonCost: participants.length > 0 ? round2(originalCost / participants.length) : 0,
    allocations: booking.allocations || []
  };

  // If refund received, remaining cost is divided among participants
  const newAllocations = calculateSplit({
    method: booking.split_method || 'equal',
    totalAmount: netLiability,
    selectedMemberIds: participants
  });

  const newPerPerson = participants.length > 0 ? round2(netLiability / participants.length) : 0;
  const savingsPerPerson = round2(snapshotBefore.perPersonCost - newPerPerson);

  const snapshotAfter = {
    totalCost: netLiability,
    participantCount: participants.length,
    perPersonCost: newPerPerson,
    allocations: newAllocations
  };

  const impactSummary = refund > 0 
    ? `Refund of ₹${refund.toLocaleString()} received: -₹${savingsPerPerson.toLocaleString()} per person`
    : `Booking cancelled: 100% liability removed`;

  const updatedBooking = {
    ...booking,
    current_cost: netLiability,
    refund_amount: refund,
    status: refund > 0 && netLiability > 0 ? 'modified' : 'cancelled',
    allocations: newAllocations,
    updated_at: new Date().toISOString()
  };

  const auditLog = {
    id: 'audit-' + Date.now(),
    trip_id: tripId,
    trigger_event: 'booking_cancelled',
    description: `Booking "${booking.title}" cancelled (${cancellationReason})`,
    affected_item_title: booking.title,
    affected_item_type: 'booking',
    affected_booking_id: booking.id,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
    impact_summary: impactSummary,
    performed_by: performedByMemberId,
    created_at: new Date().toISOString()
  };

  return {
    updatedBooking,
    auditLog
  };
}
