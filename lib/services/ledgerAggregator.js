import { round2 } from './splitEngine';

/**
 * TripSync — Financial Ledger Aggregator
 * Computes individual liabilities, total spend, category distributions,
 * and net balances in real-time across bookings and expenses.
 */
export function aggregateLedger({ members = [], bookings = [], expenses = [] }) {
  let totalTripCost = 0;
  const categoryTotals = {};

  // Initialize member ledger map
  const memberMap = new Map();
  members.forEach(member => {
    memberMap.set(member.id, {
      memberId: member.id,
      displayName: member.display_name,
      role: member.role,
      status: member.status,
      upiId: member.upi_id,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
      participatingBookingsCount: 0,
      itemizedLiabilities: [] // For explainability ("Why do I owe ₹X?")
    });
  });

  // 1. Process Bookings
  bookings.forEach(booking => {
    if (booking.status === 'cancelled') return;

    const cost = round2(booking.current_cost || booking.original_cost || 0);
    totalTripCost = round2(totalTripCost + cost);

    // Category aggregation
    const cat = booking.category || 'other';
    categoryTotals[cat] = round2((categoryTotals[cat] || 0) + cost);

    // Fronted payer credit
    const payer = memberMap.get(booking.paid_by_member_id);
    if (payer) {
      payer.totalPaid = round2(payer.totalPaid + cost);
    }

    // Process participant allocations
    const allocations = booking.allocations || [];
    allocations.forEach(alloc => {
      const target = memberMap.get(alloc.memberId);
      if (target) {
        const share = round2(alloc.shareAmount ?? alloc.amount ?? 0);
        target.totalShare = round2(target.totalShare + share);
        if (share > 0) {
          target.participatingBookingsCount += 1;
          target.itemizedLiabilities.push({
            type: 'booking',
            itemId: booking.id,
            title: booking.title,
            category: booking.category,
            vendorName: booking.vendor_name,
            totalCost: cost,
            shareAmount: share,
            paidByMemberId: booking.paid_by_member_id,
            paidByName: payer ? payer.displayName : 'Group',
            note: alloc.note || 'Booking share'
          });
        }
      }
    });
  });

  // 2. Process Expenses
  expenses.forEach(expense => {
    const cost = round2(expense.total_amount || 0);
    totalTripCost = round2(totalTripCost + cost);

    const cat = expense.category || 'other';
    categoryTotals[cat] = round2((categoryTotals[cat] || 0) + cost);

    // Fronted payer credit
    const payer = memberMap.get(expense.paid_by_member_id);
    if (payer) {
      payer.totalPaid = round2(payer.totalPaid + cost);
    }

    // Process participant allocations
    const allocations = expense.allocations || [];
    allocations.forEach(alloc => {
      const target = memberMap.get(alloc.memberId);
      if (target) {
        const share = round2(alloc.shareAmount ?? alloc.amount ?? 0);
        target.totalShare = round2(target.totalShare + share);
        if (share !== 0) {
          target.itemizedLiabilities.push({
            type: share < 0 ? 'refund' : 'expense',
            itemId: expense.id,
            title: expense.title,
            category: expense.category,
            totalCost: cost,
            shareAmount: share,
            paidByMemberId: expense.paid_by_member_id,
            paidByName: payer ? payer.displayName : 'Group',
            note: alloc.note || (share < 0 ? 'Refund credit' : 'Expense share')
          });
        }
      }
    });
  });

  // 3. Compute Net Balances
  // Net Balance = Total Paid - Total Share
  const memberSummaries = Array.from(memberMap.values()).map(m => {
    const totalPaid = round2(m.totalPaid || 0);
    const totalShare = round2(m.totalShare || 0);
    const net = round2(totalPaid - totalShare);
    return {
      ...m,
      totalPaid,
      totalShare,
      netBalance: net,
      isCreditor: net > 0,
      isDebtor: net < 0,
      isSettled: Math.abs(net) < 0.01
    };
  });

  return {
    totalTripCost: round2(totalTripCost || 0),
    categoryTotals,
    memberSummaries
  };
}
