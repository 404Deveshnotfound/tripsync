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
  performedByMemberId = null,
  triggerEvent = 'participant_left',
  customDescription = null
}) {
  const auditLogs = [];
  const updatedBookings = [];
  const updatedExpenses = [];

  // 1. Process Affected Bookings
  bookings.forEach(booking => {
    const hasAlloc = booking.allocations?.some(a => a.memberId === leavingMemberId && (a.shareAmount > 0 || a.amount > 0));
    const isParticipant = booking.participant_member_ids?.includes(leavingMemberId);

    if ((hasAlloc || isParticipant) && booking.status !== 'cancelled') {
      const originalCost = round2(booking.current_cost || booking.original_cost || 0);
      const originalCount = booking.allocations?.length || booking.participant_member_ids?.length || 1;
      
      const memberAlloc = booking.allocations?.find(a => a.memberId === leavingMemberId);
      const lockedShare = memberAlloc ? round2(memberAlloc.shareAmount ?? memberAlloc.amount ?? 0) : round2(originalCost / originalCount);
      const remainingCount = Math.max(1, originalCount - 1);
      const perPersonShare = round2((originalCost - lockedShare) / remainingCount);

      // Snapshot Before
      const snapshotBefore = {
        totalCost: originalCost,
        participantCount: originalCount,
        perPersonCost: round2(originalCost / originalCount),
        allocations: (booking.allocations || []).map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount ?? a.amount
        }))
      };

      // Keep allocations locked so the leaving member's debt is preserved
      // Remaining travelers' shares remain unchanged at their pre-agreed figure (₹0 loss)
      const lockedAllocations = (booking.allocations || []).map(a => {
        if (a.memberId === leavingMemberId) {
          return {
            ...a,
            shareAmount: lockedShare,
            status: 'committed_debt_due',
            locked: true,
            note: 'Pre-committed itinerary share due on departure'
          };
        }
        return a;
      });

      const impactSummary = `${leavingMemberName || 'Departed traveler'}'s predecided share (₹${lockedShare.toLocaleString()}) is locked and payable. Remaining ${remainingCount} travelers incur ₹0 loss.`;

      // Snapshot After
      const snapshotAfter = {
        totalCost: originalCost,
        participantCount: originalCount,
        perPersonCost: perPersonShare,
        lockedMemberId: leavingMemberId,
        lockedShareAmount: lockedShare,
        allocations: lockedAllocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount ?? a.amount,
          locked: a.memberId === leavingMemberId
        }))
      };

      // Booking preserves the locked share
      const updated = {
        ...booking,
        allocations: lockedAllocations,
        updated_at: new Date().toISOString()
      };
      updatedBookings.push(updated);

      auditLogs.push({
        id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        trip_id: tripId,
        trigger_event: triggerEvent,
        description: customDescription || `${leavingMemberName || 'A participant'} left the trip`,
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
    const hasAlloc = expense.allocations?.some(a => a.memberId === leavingMemberId && (a.shareAmount > 0 || a.amount > 0));
    if (hasAlloc) {
      const activeAllocs = expense.allocations.filter(a => (a.shareAmount > 0 || a.amount > 0));
      const originalCount = activeAllocs.length;
      const totalAmount = round2(expense.total_amount);
      const memberAlloc = expense.allocations.find(a => a.memberId === leavingMemberId);
      const lockedShare = memberAlloc ? round2(memberAlloc.shareAmount ?? memberAlloc.amount ?? 0) : round2(totalAmount / originalCount);
      const remainingCount = Math.max(1, originalCount - 1);
      const perPersonShare = round2((totalAmount - lockedShare) / remainingCount);

      const snapshotBefore = {
        totalCost: totalAmount,
        participantCount: originalCount,
        perPersonCost: round2(totalAmount / originalCount),
        allocations: expense.allocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount ?? a.amount
        }))
      };

      // Keep allocations locked
      const lockedAllocations = expense.allocations.map(a => {
        if (a.memberId === leavingMemberId) {
          return {
            ...a,
            shareAmount: lockedShare,
            status: 'committed_debt_due',
            locked: true,
            note: 'Pre-committed expense share due on departure'
          };
        }
        return a;
      });

      const impactSummary = `${leavingMemberName || 'Departed traveler'}'s predecided share (₹${lockedShare.toLocaleString()}) is locked and payable. Remaining ${remainingCount} travelers incur ₹0 loss.`;

      const snapshotAfter = {
        totalCost: totalAmount,
        participantCount: originalCount,
        perPersonCost: perPersonShare,
        lockedMemberId: leavingMemberId,
        lockedShareAmount: lockedShare,
        allocations: lockedAllocations.map(a => ({
          memberId: a.memberId,
          amount: a.shareAmount ?? a.amount,
          locked: a.memberId === leavingMemberId
        }))
      };

      const updatedExp = {
        ...expense,
        allocations: lockedAllocations,
        updated_at: new Date().toISOString()
      };
      updatedExpenses.push(updatedExp);

      auditLogs.push({
        id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        trip_id: tripId,
        trigger_event: triggerEvent,
        description: customDescription || `${leavingMemberName || 'A participant'} left the trip`,
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
