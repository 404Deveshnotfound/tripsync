# 🏆 TripSync: 14-Step Master Hackathon Presentation Walkthrough

> **Problem Statement ID-3**: Unifying Trip Itinerary, Bookings, Participants, Expenses, Changes, Verification, and Settlement into a living verified ledger.

---

## ⏱️ Quick Presentation Cheat Sheet (3–4 Minutes)

| Time | Step | Action | Key Takeaway for Judges |
|---|---|---|---|
| **0:00 - 0:25** | 1 & 2 | Homepage & Dual Governance | Show "Goa Adventure 2026" (Manager) vs "Manali Snow Trek" (Democratic). |
| **0:25 - 0:50** | 3 & 4 | Multi-Vendor Itinerary & Splits | Master vs Personal schedule. 8-way deterministic math (equal, share, custom, activity). |
| **0:50 - 1:20** | 5 | "What Changed?" Diff Engine | Show Vikram skipping Scuba diving: ₹2,400 &rarr; ₹3,000 (+₹600 impact delta). |
| **1:20 - 1:45** | 6 & 7 | Offline-First & In-Chat Polls | Toggle offline mode & show IDB queue. Vote on WhatsApp-style in-chat poll for cash expense. |
| **1:45 - 2:10** | 8 | Multi-Tier Verification | Manager approves ₹4,200 water sports with receipt & UTR proof. |
| **2:10 - 2:40** | 9, 10 & 11 | Debt Minimization & Adaptive UPI | Greedy solver minimizes transfers. Mobile `upi://pay` deep link / Desktop dynamic QR + confetti. |
| **2:40 - 3:15** | 12 & 13 | Financial Health & What-If Sandbox | Recharts spend breakdown. Live slider simulating cost changes before booking. |
| **3:15 - 3:45** | 14 | AI Natural Language Parser & Copilot | Type natural language expense & ask Copilot *"Why does Priya owe money?"*. |

---

## 🎬 Step-by-Step Demonstration Guide

### 🚀 Step 1: Launch & Instant Demo Prep
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
3. *Speaker Script*: 
   > *"Group trips often end with messy WhatsApp groups, disputed Google Sheets, and chaotic Splitwise math when bookings change. TripSync replaces this with a **Living Verified Travel Ledger**."*

---

### 🛡️ Step 2: Dual Governance Trip Architecture
1. On the homepage, point out the two trips:
   - **Goa Adventure 2026 🌴**: `Manager-Based` badge. Owners and Managers review unverified bills and approve itinerary bookings.
   - **Manali Snow Trek 🏔️**: `Democratic` badge. Flat hierarchy where all expenses and changes are voted on collaboratively.
2. Click on **Goa Adventure 2026**.
3. Notice the top role switcher in the navbar: switch effortlessly between **Rahul (Owner)**, **Amit (Manager)**, and **Vikram (Participant)**.

---

### 📅 Step 3: Master Itinerary vs. My Personal Schedule
1. Click the **"Master Itinerary"** tab.
2. Toggle between:
   - **Master Itinerary**: Shows all multi-vendor bookings (Airbnb Villa, Scuba Diving with Goa Aqua Thrills, Mahindra Thar rental).
   - **My Personal Schedule**: Filters only activities where the logged-in user is an active participant, including personal departure times, check-ins, and cost shares.

---

### 🧮 Step 4: 8-Way Deterministic Split Engine & Live Ledger
1. Click the **"Expenses & Splits"** tab.
2. Note the real-time financial position banner: *"You are owed ₹..."* or *"You owe ₹..."*.
3. Click **"Add Expense"** to highlight the 8 split models:
   - Equal Split
   - Exact Custom Amounts
   - Percentage (%)
   - Ratio / Shares (e.g. 2:1 for couples)
   - Activity Opt-in / Opt-out
   - Itemized Bill Split
   - Family / Multi-Room Unit Split
   - Time-Weighted Stay Split

---

### 🔍 Step 5: "What Changed?" Dynamic Recalculation Engine
1. Click the **"What Changed?"** tab.
2. *Speaker Script*:
   > *"What happens when one traveler cancels an activity at the last minute? Normally, people recalculate everything manually on paper. TripSync captures snapshots before and after, recalibrates active shares, and displays an exact visual diff."*
3. Show the audit card:
   - **Event**: *Vikram skipped Scuba Diving booking*
   - **Before**: 5 participants @ ₹2,400 each (Total ₹12,000)
   - **After**: 4 participants @ ₹3,000 each (Total ₹12,000)
   - **Delta**: Remaining 4 participants absorb +₹600 each, while Vikram is excused.

---

### 📴 Step 6: Zero-Connectivity Offline-First Sync
1. Open Chrome DevTools &rarr; Network Tab &rarr; Check **Offline** (or toggle device Wi-Fi off).
2. Look at the top banner: **"Offline Mode — Working Locally"**.
3. Add a new expense (e.g., *"₹200 Beach Coconut Water"*).
4. TripSync immediately saves it locally to **IndexedDB**, increments the pending queue badge, and displays: *"1 unsynced transaction saved locally"*.
5. Toggle Network back to **Online**.
6. TripSync's `useOfflineSync` hook auto-detects connectivity, batches the offline queue to `/api/sync`, and reconciles the live ledger automatically.

---

### 🗳️ Step 7: WhatsApp-Style In-Chat Voting Polls
1. Click the **"Chat & Polls"** tab.
2. Highlight how informal expenses without printed receipts (e.g., roadside dhabas, cash auto-rickshaws) are resolved:
   - TripSync creates an **interactive WhatsApp-style voting poll** directly inside the trip group chat.
3. Click **"Approve"** on the active poll: *"Auto-rickshaw convoy from Candolim to Curlies"*.
4. Once required quorum is reached, the badge shifts from `Active Poll` to `Approved & Verified`, automatically admitting the expense into the ledger!

---

### 🧾 Step 8: Multi-Tier Verification Queue
1. Click the **"Verification"** tab (with badge indicator).
2. Point out the pending expense: *"Parasailing & Jet Ski Package @ Baga Beach" (₹4,200)*.
3. Click **"View Receipt / Proof"** to inspect the attached payment proof and extracted UTR (`992817261901`).
4. As a Manager, click **"Verify & Approve"**. The ledger updates instantly.

---

### ⚡ Step 9: Greedy Debt Minimization Solver
1. Click the **"Settlement & UPI"** tab.
2. *Speaker Script*:
   > *"If 5 friends pay for different things, they normally do 10-15 random repayments. Our Greedy Debt Minimization algorithm cancels circular debts and settles the entire trip in just 2 or 3 optimal transfers."*
3. Click **"Explain Breakdown / Why do I owe this?"** under any transfer.
4. Show the transparent line-item explanation:
   - Villa stay share: ₹5,000
   - Minus Dinner fronted: -₹3,500
   - Net balance: ₹1,500 owed.

---

### 📱 Step 10: Device-Adaptive UPI Payments
1. In the Settlement card:
   - On **Mobile devices**: Detects touch environment and renders the native **"Pay via UPI App"** deep-link button (`upi://pay?pa=...&pn=...&am=...`). Tapping opens Google Pay, PhonePe, or Paytm with amount and receiver pre-filled!
   - On **Desktop**: Automatically renders a dynamic SVG QR code via `qrcode.react`. Any phone camera can scan and pay instantly.

---

### 🎉 Step 11: Settlement Confirmation & Confetti Celebration
1. Click **"I Have Paid (Simulate UPI Success)"**.
2. Click **"Confirm Received"** as the creditor.
3. Watch the full-screen canvas confetti shower activate (`canvas-confetti`) with the badge turning to **"Fully Settled"**.

---

### 📊 Step 12: Executive Financial Health Dashboard
1. Click the **"Financial Health"** tab.
2. Showcase interactive visualizations powered by **Recharts**:
   - Spending by Category Donut Chart (`Stay`, `Meal`, `Activity`, `Cab`)
   - Cumulative spending trend over trip dates
   - Top payer vs top beneficiary distribution bars.

---

### 🎛️ Step 13: "What-If" Financial Simulation Sandbox
1. Click the **"What-If Sandbox"** tab.
2. *Speaker Script*:
   > *"Before committing to an expensive new booking or asking someone if they want to join, travelers want to know: 'How will this affect my wallet?'"*
3. Adjust the slider:
   - Simulate a new ₹15,000 Yacht Party.
   - Toggle members participating.
   - The sandbox instantly computes everyone's new projected share side-by-side with their current balance **without mutating the real database**.

---

### 🤖 Step 14: AI Natural Language Expense Parser & Copilot
1. In the bottom-right corner, click **"Ask AI Copilot"**:
   - Tap quick prompt: *"Why does Priya owe money?"*
   - The Copilot explains Priya's exact ledger balance using deterministic audit data.
2. Go to the **"Expenses"** tab and click **"AI Quick Add"**:
   - Type or paste:
     > *"I paid ₹2,400 for lunch at Fisherman's Wharf for me, Amit and Priya"*
   - Click **"Parse with AI"**.
   - Watch the parser extract: Title, ₹2,400, category `meal`, payer `Rahul`, participants `[Rahul, Amit, Priya]`, and split `equal`.
   - Click **"Apply to Form"** &rarr; The standard Add Expense modal is populated and ready to save in 1 click!

---

## 🏆 Presentation Conclusion (15 Seconds)
> *"TripSync solves every challenge of group travel: multi-vendor bookings, dynamic recalculation when itineraries change, zero-network offline resilience, dispute-free voting polls, greedy UPI settlements, and AI assistance. Everything is unified into a living, verified travel ledger."*
