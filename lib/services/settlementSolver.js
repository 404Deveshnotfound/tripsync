import { round2 } from './splitEngine';

/**
 * TripSync — Greedy Debt Minimization Solver & Explainability Engine
 * 
 * 1. Takes all member net balances: Net = TotalPaid - TotalShare.
 * 2. Uses a greedy two-pointer solver to minimize the total number of group transfers.
 * 3. Traces line-item liabilities to generate an itemized breakdown explaining "Why do I owe this amount?".
 */

/**
 * Solves the debt graph to produce minimal peer-to-peer transfers
 */
export function solveMinimalSettlements(memberSummaries = []) {
  // Separate into debtors (net < 0) and creditors (net > 0)
  const debtors = [];
  const creditors = [];

  memberSummaries.forEach(m => {
    const net = round2(m.netBalance);
    if (net < -0.01) {
      debtors.push({
        memberId: m.memberId,
        displayName: m.displayName,
        upiId: m.upiId,
        amountOwed: Math.abs(net)
      });
    } else if (net > 0.01) {
      creditors.push({
        memberId: m.memberId,
        displayName: m.displayName,
        upiId: m.upiId,
        amountToReceive: net
      });
    }
  });

  // Sort descending by magnitude
  debtors.sort((a, b) => b.amountOwed - a.amountOwed);
  creditors.sort((a, b) => b.amountToReceive - a.amountToReceive);

  const transfers = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = round2(Math.min(debtor.amountOwed, creditor.amountToReceive));

    if (transferAmount > 0.01) {
      transfers.push({
        id: `stl-${debtor.memberId}-${creditor.memberId}`,
        payerMemberId: debtor.memberId,
        payerName: debtor.displayName,
        receiverMemberId: creditor.memberId,
        receiverName: creditor.displayName,
        receiverUpiId: creditor.upiId || 'payment@upi',
        amount: transferAmount,
        status: 'pending', // 'pending' | 'verifying' | 'completed'
        breakdown: [] // Will be populated with line-item explainability
      });

      debtor.amountOwed = round2(debtor.amountOwed - transferAmount);
      creditor.amountToReceive = round2(creditor.amountToReceive - transferAmount);
    }

    if (debtor.amountOwed <= 0.01) dIdx++;
    if (creditor.amountToReceive <= 0.01) cIdx++;
  }

  return transfers;
}

/**
 * Builds the line-item explainability breakdown for a debtor
 * Explains which bookings and expenses contributed to their liability.
 */
export function buildExplainabilityTree(debtorSummary, receiverMemberId = null) {
  if (!debtorSummary || !debtorSummary.itemizedLiabilities) {
    return [];
  }

  // Filter or prioritize items where the receiver was the payer
  const items = debtorSummary.itemizedLiabilities.map(item => ({
    title: item.title,
    category: item.category,
    shareAmount: item.shareAmount,
    paidByName: item.paidByName,
    isDirectPayer: receiverMemberId ? item.paidByMemberId === receiverMemberId : false
  }));

  // Sort so items where receiver was the direct payer appear first
  items.sort((a, b) => (b.isDirectPayer ? 1 : 0) - (a.isDirectPayer ? 1 : 0));

  return items;
}

/**
 * Generates the standardized UPI Deep-Link Intent URI for mobile devices
 * Format: upi://pay?pa={upiId}&pn={name}&am={amount}&tn={note}&cu=INR
 */
export function generateUpiIntentUri({ upiId, recipientName, amount, tripTitle = 'TripSync' }) {
  const cleanUpi = upiId?.trim() || 'settle@upi';
  const cleanName = encodeURIComponent(recipientName || 'TripSync Member');
  const cleanNote = encodeURIComponent(`Settlement for ${tripTitle}`);
  const cleanAmount = round2(amount);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&tn=${cleanNote}&cu=INR`;
}
