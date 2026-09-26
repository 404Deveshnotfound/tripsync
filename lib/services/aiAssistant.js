/**
 * TripSync — AI Finance Assistant ("Copilot")
 * Strict Product Rule: AI explains and assists based on ground-truth deterministic ledger state.
 */

export function answerFinanceQuestion({
  query,
  ledger,
  bookings = [],
  expenses = [],
  members = [],
  auditLogs = []
}) {
  const q = query.toLowerCase().trim();

  // 1. "Why do I owe..." or "Why does [Name] owe..."
  const oweMatch = q.match(/why\s+(?:do\s+i|does\s+([a-zA-Z]+))\s+owe/i);
  if (oweMatch || q.includes('why owe') || q.includes('explain balance') || q.includes('my dues')) {
    let targetMember = null;
    if (oweMatch && oweMatch[1]) {
      const searchName = oweMatch[1].toLowerCase();
      targetMember = members.find(m => m.display_name.toLowerCase().includes(searchName));
    }
    
    // Default to first debtor or mentioned member
    if (!targetMember) {
      targetMember = members.find(m => {
        const s = ledger?.memberSummaries?.find(sum => sum.memberId === m.id);
        return s && s.isDebtor;
      }) || members[0];
    }

    const summary = ledger?.memberSummaries?.find(s => s.memberId === targetMember?.id);
    if (!summary) {
      return `I couldn't locate a financial summary for that member.`;
    }

    if (summary.isCreditor) {
      return `🎉 **${summary.displayName} does not owe any money!** In fact, they are a **creditor** and should receive **₹${summary.netBalance.toLocaleString()}** because they fronted ₹${summary.totalPaid.toLocaleString()} for the group and only had ₹${summary.totalShare.toLocaleString()} in personal liabilities.`;
    }

    if (summary.isSettled) {
      return `✅ **${summary.displayName} is all settled up!** Their total amount fronted matches their allocated share liability perfectly (Net Balance: ₹0.00).`;
    }

    // List itemized liabilities
    const items = summary.itemizedLiabilities || [];
    const itemListText = items.map(it => 
      `- **${it.title}** (${it.category}): ₹${it.shareAmount.toLocaleString()} *(Fronted by ${it.paidByName})*`
    ).join('\n');

    return `### 💡 Balance Breakdown for ${summary.displayName}
**Net Amount Owed: ₹${Math.abs(summary.netBalance).toLocaleString()}**

Here is the exact line-item calculation of why this amount is owed:
- **Total Personal Share (Liabilities):** ₹${summary.totalShare.toLocaleString()}
- **Total Amount Fronted/Paid:** ₹${summary.totalPaid.toLocaleString()}
- **Net Balance Calculation:** Total Paid (₹${summary.totalPaid.toLocaleString()}) − Total Share (₹${summary.totalShare.toLocaleString()}) = **−₹${Math.abs(summary.netBalance).toLocaleString()}**

**Contributing Itinerary Bookings & Expenses:**
${itemListText || 'No specific bookings recorded.'}

You can settle this seamlessly via UPI from the **Settlement & UPI** tab!`;
  }

  // 2. "What changed after [Member] left / skipped...?"
  if (q.includes('what changed') || q.includes('change') || q.includes('diff') || q.includes('recalculation')) {
    if (!auditLogs || auditLogs.length === 0) {
      return `No recalculation changes have occurred yet. All bookings are currently in their initial state. You can test a scenario using the **What-If Sandbox** or simulate a departure in the **What Changed?** tab.`;
    }

    const latest = auditLogs[0];
    const before = latest.snapshot_before;
    const after = latest.snapshot_after;

    return `### 🔄 Latest Recalculation Event
**Event:** ${latest.description} (${latest.affected_item_title})

**Visual Comparison:**
- **BEFORE:** ₹${before?.totalCost?.toLocaleString()} split across **${before?.participantCount} travelers** (₹${before?.perPersonCost?.toLocaleString()}/person)
- **AFTER RECALCULATION:** ₹${after?.totalCost?.toLocaleString()} split across **${after?.participantCount} travelers** (₹${after?.perPersonCost?.toLocaleString()}/person)
- **FINANCIAL IMPACT:** ${latest.impact_summary}

All member balances and liabilities were automatically updated by the TripSync backend engine without manual adjustments.`;
  }

  // 3. "How much spent on [Category]?"
  if (q.includes('transport') || q.includes('hotel') || q.includes('stay') || q.includes('activity') || q.includes('meal') || q.includes('food')) {
    let cat = 'hotel';
    if (q.includes('transport') || q.includes('cab') || q.includes('car')) cat = 'cab';
    else if (q.includes('activity') || q.includes('scuba')) cat = 'activity';
    else if (q.includes('meal') || q.includes('food') || q.includes('dinner')) cat = 'meal';

    const catTotal = ledger?.categoryTotals?.[cat] || 0;
    const catItems = [
      ...bookings.filter(b => b.category === cat),
      ...expenses.filter(e => e.category === cat)
    ];

    const itemsSummary = catItems.map(it => 
      `- **${it.title}**: ₹${(it.current_cost || it.original_cost || it.total_amount).toLocaleString()}`
    ).join('\n');

    return `### 📊 ${cat.toUpperCase()} Category Spending
The group has spent a total of **₹${catTotal.toLocaleString()}** on **${cat}**.

**Itemized Breakdown:**
${itemsSummary || 'No items recorded in this category.'}

You can view full category analytics in the **Financial Health** tab.`;
  }

  // 4. "Which expenses are unverified / pending?"
  if (q.includes('unverified') || q.includes('pending') || q.includes('verify') || q.includes('disputed')) {
    const pending = expenses.filter(e => e.verification_status === 'pending_verification');
    if (pending.length === 0) {
      return `✅ **All expenses are currently verified!** There are zero unverified or disputed items in the ledger.`;
    }

    const pendingList = pending.map(p => 
      `- **${p.title}** (₹${p.total_amount.toLocaleString()}) — Proof: ${p.proof_type.replace('_', ' ')}`
    ).join('\n');

    return `### ⚠️ Pending Verification Items
There are currently **${pending.length} unverified expense(s)**:

${pendingList}

**How to verify:**
- If this is a **Manager-Based Trip**: The Trip Owner or Manager can verify these in the **Verification** tab.
- If this is a **Democratic Trip**: Items without proof have an active **Voting Poll** in the **Chat & Polls** tab where members cast approval votes.`;
  }

  // 5. Default General Summary
  return `### ✈️ TripSync Living Ledger Summary
- **Total Group Spend:** ₹${(ledger?.totalTripCost || 0).toLocaleString()}
- **Active Bookings:** ${bookings.length} items
- **Ad-Hoc Expenses:** ${expenses.length} items (${expenses.filter(e => e.verification_status === 'verified').length} verified)
- **Top Spending Category:** ${Object.entries(ledger?.categoryTotals || {}).sort((a,b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}

You can ask me specific questions like:
- *"Why does Priya owe money?"*
- *"What changed after Vikram skipped scuba diving?"*
- *"How much has the group spent on transport?"*
- *"Which expenses are still unverified?"*`;
}
