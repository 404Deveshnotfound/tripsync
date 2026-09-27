/**
 * TripSync — AI Finance Assistant ("Copilot")
 * Multi-Provider Architecture:
 * 1. Google Gemini (Primary Provider)
 * 2. Groq (Secondary ultra-fast fallback)
 * 3. Local Deterministic Ledger Engine (Safety net)
 */

function buildTripContext({ trip, ledger, bookings = [], expenses = [], members = [], auditLogs = [] }) {
  const tripInfo = trip ? `
Trip Title: "${trip.title || 'Group Trip'}"
Destination: "${trip.destination || 'Unspecified'}"
Dates: ${trip.start_date || 'N/A'} to ${trip.end_date || 'N/A'}
Governance Mode: ${trip.governance_mode === 'manager_based' ? 'Manager-Based (Only Owner/Manager approves)' : 'Democratic (Group Votes)'}
` : '';

  const membersInfo = members.map(m => 
    `- ${m.display_name} (Role: ${m.role || 'participant'}, UPI: ${m.upi_id || 'Not linked'})`
  ).join('\n');

  const summaries = (ledger?.memberSummaries || []).map(s => {
    const status = s.isCreditor ? `Creditor (Gets back ₹${s.netBalance})` :
                   s.isDebtor ? `Debtor (Owes ₹${Math.abs(s.netBalance)})` :
                   'Settled (₹0)';
    const items = (s.itemizedLiabilities || []).map(it => `    * ${it.title} (${it.category}): ₹${it.shareAmount} (paid by ${it.paidByName})`).join('\n');
    return `- ${s.displayName}: Net: ${status} | Paid: ₹${s.totalPaid} | Share: ₹${s.totalShare}\n${items}`;
  }).join('\n');

  const categories = Object.entries(ledger?.categoryTotals || {})
    .map(([cat, amount]) => `- ${cat.toUpperCase()}: ₹${amount.toLocaleString()}`)
    .join('\n');

  const bookingsList = bookings.map(b => 
    `- [Booking] ${b.title} (${b.category}): ₹${(b.current_cost ?? b.original_cost ?? 0).toLocaleString()} (Split across ${b.participants?.length || 'all'} members, Status: ${b.status})`
  ).join('\n');

  const expensesList = expenses.map(e => 
    `- [Expense] ${e.title} (${e.category}): ₹${(e.total_amount || 0).toLocaleString()} (Paid by: ${e.paid_by_name || 'Member'}, Status: ${e.verification_status})`
  ).join('\n');

  const auditList = (auditLogs || []).slice(0, 5).map(a => 
    `- [Recalculation Diff] ${a.description} on "${a.affected_item_title}": Before: ₹${a.snapshot_before?.perPersonCost}/person -> After: ₹${a.snapshot_after?.perPersonCost}/person (${a.impact_summary})`
  ).join('\n');

  return `
=== REAL-TIME TRIP FINANCIAL CONTEXT ===
${tripInfo}
Total Group Spend: ₹${(ledger?.totalTripCost || 0).toLocaleString()}

MEMBERS ROSTER:
${membersInfo || 'No members listed'}

MEMBER BALANCES & ITEMIZED LIABILITIES (Ground-Truth Ledger):
${summaries || 'No balance summaries available'}

SPENDING BY CATEGORY:
${categories || 'No category breakdown available'}

ITINERARY BOOKINGS:
${bookingsList || 'No bookings'}

AD-HOC EXPENSES:
${expensesList || 'No expenses'}

RECENT RECALCULATIONS & AUDIT LOGS:
${auditList || 'No recalculation events recorded'}
=========================================
`;
}

// 1. Google Gemini AI Caller
async function callGemini(systemPrompt, query, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const models = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite-preview', 'gemini-3-flash-preview', 'gemini-flash-latest'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      // Build conversation contents
      const contents = [];

      // Include recent history (up to last 6 turns)
      for (const msg of history.slice(-6)) {
        if (msg.text) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      // Add current user query with system instruction
      contents.push({
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
      });

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Gemini API status ${res.status}`);
      }

      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer && answer.trim()) {
        return { answer: answer.trim(), source: `Google Gemini (${model})` };
      }
    } catch (err) {
      console.warn(`Gemini (${model}) failed:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Gemini models failed');
}

// 2. Groq AI Caller (Fallback)
async function callGroq(systemPrompt, query, history = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not configured');

  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
  let lastErr = null;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      for (const msg of history.slice(-6)) {
        if (msg.text) {
          messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        }
      }

      messages.push({ role: 'user', content: query });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 1024
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || `Groq API status ${res.status}`);
      }

      const answer = data.choices?.[0]?.message?.content;
      if (answer && answer.trim()) {
        return { answer: answer.trim(), source: 'Groq AI' };
      }
    } catch (err) {
      console.warn(`Groq (${model}) failed:`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('All Groq models failed');
}

// 3. Local Deterministic Rule Engine (Tertiary Safety Net)
function localDeterministicAnswer({ query, ledger, bookings = [], expenses = [], members = [], auditLogs = [] }) {
  const q = query.toLowerCase().trim();

  // 1. "Why do I owe..." or "Why does [Name] owe..."
  const oweMatch = q.match(/why\s+(?:do\s+i|does\s+([a-zA-Z]+))\s+owe/i);
  if (oweMatch || q.includes('why owe') || q.includes('explain balance') || q.includes('my dues')) {
    let targetMember = null;
    if (oweMatch && oweMatch[1]) {
      const searchName = oweMatch[1].toLowerCase();
      targetMember = members.find(m => m.display_name.toLowerCase().includes(searchName));
    }
    
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
      return `No recalculation changes have occurred yet. All group items are currently in their initial state. Any member departures and cost adjustments will be recorded in the **Transaction Log** tab.`;
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

  // 3. Category Spending
  if (q.includes('transport') || q.includes('hotel') || q.includes('stay') || q.includes('activity') || q.includes('meal') || q.includes('food')) {
    let cat = 'stay';
    if (q.includes('transport') || q.includes('cab') || q.includes('car')) cat = 'transport';
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

  // 4. Verification
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

  // 5. Default Summary
  return `### ✈️ TripSync Living Ledger Summary
- **Total Group Spend:** ₹${(ledger?.totalTripCost || 0).toLocaleString()}
- **Active Bookings:** ${bookings.length} items
- **Ad-Hoc Expenses:** ${expenses.length} items (${expenses.filter(e => e.verification_status === 'verified').length} verified)
- **Top Spending Category:** ${Object.entries(ledger?.categoryTotals || {}).sort((a,b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A'}

Ask me anything about dues, itinerary items, recalculations, or split math!`;
}

// Main Orchestrator
export async function answerFinanceQuestion({
  query,
  messages = [],
  trip = null,
  ledger,
  bookings = [],
  expenses = [],
  members = [],
  auditLogs = []
}) {
  const contextString = buildTripContext({ trip, ledger, bookings, expenses, members, auditLogs });

  const systemPrompt = `You are the TripSync AI Travel & Finance Copilot. You are an expert financial assistant built into TripSync, a living verified travel ledger application.

Your purpose is to answer travelers' questions accurately, concisely, and insightfully based STRICTLY on the live financial ledger and itinerary data provided below.

GUIDELINES:
1. Always base financial explanations (who owes whom, net balance, liabilities) on the deterministic ledger below. Do NOT make up numbers or math.
2. Net Balance Formula: Net Balance = Total Amount Fronted/Paid - Total Allocated Share Liability. If negative, they are a Debtor and owe that amount. If positive, they are a Creditor and should be paid that amount.
3. Be clear, friendly, and structured. Use Markdown formatting (bullet points, **bold numbers in ₹**, emojis).
4. If asked about recalculations or member departures, refer to the Audit Logs snapshot diffs (before vs after cost and impact).
5. If asked about itinerary plans or categories, use the bookings and expenses data.
6. If the user asks a conversational question or asks for travel/budget advice, provide smart, actionable suggestions based on this trip.

${contextString}`;

  // 1. Primary: Google Gemini
  try {
    const geminiRes = await callGemini(systemPrompt, query, messages);
    return geminiRes;
  } catch (geminiErr) {
    console.warn('Primary Google Gemini failed, attempting Groq fallback...', geminiErr.message);
  }

  // 2. Secondary Fallback: Groq
  try {
    const groqRes = await callGroq(systemPrompt, query, messages);
    return groqRes;
  } catch (groqErr) {
    console.warn('Groq fallback failed, switching to local deterministic engine...', groqErr.message);
  }

  // 3. Safety Net: Local Deterministic Rule Engine
  const localAnswer = localDeterministicAnswer({ query, ledger, bookings, expenses, members, auditLogs });
  return { answer: localAnswer, source: 'Deterministic Ledger' };
}

