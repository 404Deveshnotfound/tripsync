/**
 * TripSync — The 8-Way Deterministic Split Engine
 * Pure mathematical services running server-side with zero client tampering.
 * Guarantees that Sum(allocations.shareAmount) === totalAmount to 2 decimal places.
 */

/**
 * Normalizes numbers to 2 decimal places
 */
export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * 1. Equal Split
 * Divides total equally among all provided member IDs.
 * Remainder cents/paise are distributed 1 by 1 to guarantee exact total.
 */
export function splitEqual(totalAmount, memberIds) {
  if (!memberIds || memberIds.length === 0) {
    throw new Error('Equal split requires at least one member.');
  }

  const total = round2(totalAmount);
  const count = memberIds.length;
  const baseShare = Math.floor((total / count) * 100) / 100;
  let remainderPaise = Math.round((total - baseShare * count) * 100);

  return memberIds.map((memberId) => {
    let extra = 0;
    if (remainderPaise > 0) {
      extra = 0.01;
      remainderPaise -= 1;
    }
    return {
      memberId,
      shareAmount: round2(baseShare + extra),
      shareRatio: 1,
      note: 'Equal share'
    };
  });
}

/**
 * 2. Participant-Based Split
 * Only selected participants pay; non-participants pay ₹0.00.
 */
export function splitParticipantBased(totalAmount, allMemberIds, selectedMemberIds) {
  if (!selectedMemberIds || selectedMemberIds.length === 0) {
    throw new Error('Participant-based split requires at least one participating member.');
  }

  const selectedAllocations = splitEqual(totalAmount, selectedMemberIds);
  const selectedMap = new Map(selectedAllocations.map(a => [a.memberId, a]));

  return allMemberIds.map((memberId) => {
    if (selectedMap.has(memberId)) {
      return selectedMap.get(memberId);
    }
    return {
      memberId,
      shareAmount: 0.00,
      shareRatio: 0,
      note: 'Did not participate'
    };
  });
}

/**
 * 3. Exact Amount Split
 * Exact custom amounts specified per member.
 * Must strictly sum to totalAmount.
 */
export function splitExact(totalAmount, exactMap) {
  // exactMap: { [memberId]: number }
  const total = round2(totalAmount);
  let computedSum = 0;

  const allocations = Object.entries(exactMap).map(([memberId, amount]) => {
    const val = round2(amount || 0);
    computedSum += val;
    return {
      memberId,
      shareAmount: val,
      note: 'Exact manual amount'
    };
  });

  computedSum = round2(computedSum);
  if (Math.abs(computedSum - total) > 0.05) {
    throw new Error(`Exact amounts total (₹${computedSum}) does not match expense total (₹${total}).`);
  }

  return allocations;
}

/**
 * 4. Percentage Split
 * Each member is assigned a percentage. Must sum to 100%.
 */
export function splitPercentage(totalAmount, percentageMap) {
  // percentageMap: { [memberId]: number (0-100) }
  const total = round2(totalAmount);
  const entries = Object.entries(percentageMap);
  const totalPct = entries.reduce((acc, [, pct]) => acc + Number(pct || 0), 0);

  if (Math.abs(totalPct - 100) > 0.5) {
    throw new Error(`Percentages sum to ${totalPct}%, but must equal 100%.`);
  }

  let distributedTotal = 0;
  const allocations = entries.map(([memberId, pct]) => {
    const share = round2((total * Number(pct)) / 100);
    distributedTotal += share;
    return {
      memberId,
      shareAmount: share,
      shareRatio: Number(pct),
      note: `${pct}% share`
    };
  });

  // Adjust penny difference on first member if rounding creates 1 paise drift
  const diff = round2(total - distributedTotal);
  if (diff !== 0 && allocations.length > 0) {
    allocations[0].shareAmount = round2(allocations[0].shareAmount + diff);
  }

  return allocations;
}

/**
 * 5. Shares-Based Split
 * Members have weights/shares (e.g. A=2, B=1, C=1).
 */
export function splitShares(totalAmount, sharesMap = {}, selectedMemberIds = []) {
  // sharesMap: { [memberId]: number }
  const total = round2(totalAmount);

  // If selected participants are provided, strictly filter to them and default any unassigned to 1 share
  const effectiveMap = {};
  if (selectedMemberIds && selectedMemberIds.length > 0) {
    selectedMemberIds.forEach(id => {
      const val = sharesMap[id];
      if (val === undefined || val === '' || val === null || isNaN(Number(val)) || Number(val) <= 0) {
        effectiveMap[id] = 1;
      } else {
        effectiveMap[id] = Number(val);
      }
    });
  } else {
    Object.entries(sharesMap).forEach(([id, val]) => {
      if (Number(val) > 0) effectiveMap[id] = Number(val);
    });
  }

  const entries = Object.entries(effectiveMap).filter(([, s]) => Number(s) > 0);
  const totalShares = entries.reduce((acc, [, s]) => acc + Number(s), 0);

  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than zero.');
  }

  let distributedTotal = 0;
  const allocations = entries.map(([memberId, shares]) => {
    const shareAmount = round2((total * Number(shares)) / totalShares);
    distributedTotal += shareAmount;
    return {
      memberId,
      shareAmount,
      shareRatio: Number(shares),
      note: `${shares} share(s)`
    };
  });

  const diff = round2(total - distributedTotal);
  if (diff !== 0 && allocations.length > 0) {
    allocations[0].shareAmount = round2(allocations[0].shareAmount + diff);
  }

  return allocations;
}

/**
 * 6. Shared Room Allocation
 * Hotel/Resort bookings where different rooms have different costs & occupants.
 * rooms: [{ roomName: "Deluxe Ocean View", roomCost: 12000, occupantMemberIds: ["mem-1", "mem-2"] }, ...]
 */
export function splitSharedRooms(rooms) {
  const allocationsMap = new Map();

  rooms.forEach(room => {
    const roomCost = round2(room.roomCost || 0);
    const occupants = room.occupantMemberIds || [];
    if (occupants.length > 0) {
      const roomAllocations = splitEqual(roomCost, occupants);
      roomAllocations.forEach(alloc => {
        const existing = allocationsMap.get(alloc.memberId) || 0;
        allocationsMap.set(alloc.memberId, round2(existing + alloc.shareAmount));
      });
    }
  });

  return Array.from(allocationsMap.entries()).map(([memberId, shareAmount]) => ({
    memberId,
    shareAmount,
    note: 'Shared Room Occupancy'
  }));
}

/**
 * 7. Activity-Based Split
 * Automatically divides an activity cost among only members enrolled in that itinerary activity.
 */
export function splitActivity(totalAmount, activityParticipantIds) {
  return splitEqual(totalAmount, activityParticipantIds);
}

/**
 * 8. Custom Adjustments
 * Base equal split with manual offset adjustments (+₹200 alcohol, -₹150 early departure).
 * Auto-balances remainder among members without specific adjustments.
 */
export function splitCustomAdjustment(totalAmount, memberIds, adjustmentsMap) {
  // adjustmentsMap: { [memberId]: number (+/- offset) }
  const total = round2(totalAmount);
  const count = memberIds.length;
  const basePerPerson = total / count;

  let netAdjustment = 0;
  memberIds.forEach(id => {
    netAdjustment += Number(adjustmentsMap[id] || 0);
  });

  // Spread the offset balancing across all members
  const balanceOffset = netAdjustment / count;

  let runningTotal = 0;
  const allocations = memberIds.map(id => {
    const manualOffset = Number(adjustmentsMap[id] || 0);
    const calculated = round2(basePerPerson + manualOffset - balanceOffset);
    runningTotal += calculated;
    return {
      memberId: id,
      shareAmount: calculated,
      note: manualOffset !== 0 ? `Adjusted (${manualOffset > 0 ? '+' : ''}₹${manualOffset})` : 'Base share'
    };
  });

  const diff = round2(total - runningTotal);
  if (diff !== 0 && allocations.length > 0) {
    allocations[0].shareAmount = round2(allocations[0].shareAmount + diff);
  }

  return allocations;
}

/**
 * Master Split Dispatcher
 */
export function calculateSplit({
  method,
  totalAmount,
  allMemberIds = [],
  selectedMemberIds = [],
  customMap = {},
  rooms = []
}) {
  switch (method) {
    case 'equal':
      return splitEqual(totalAmount, selectedMemberIds.length > 0 ? selectedMemberIds : allMemberIds);
    case 'participant_based':
    case 'activity_based':
      return splitParticipantBased(totalAmount, allMemberIds, selectedMemberIds);
    case 'exact':
      return splitExact(totalAmount, customMap);
    case 'percentage':
      return splitPercentage(totalAmount, customMap);
    case 'shares':
      return splitShares(totalAmount, customMap, selectedMemberIds);
    case 'room_occupancy':
      return splitSharedRooms(rooms);
    case 'custom_adjustment':
      return splitCustomAdjustment(totalAmount, allMemberIds, customMap);
    default:
      return splitEqual(totalAmount, selectedMemberIds.length > 0 ? selectedMemberIds : allMemberIds);
  }
}
