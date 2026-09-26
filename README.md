# TripSync ✈️💳
> **Multi-Vendor Group Travel Coordination & Dynamic Financial Settlement Platform**  
> *"A living, verified financial ledger for a changing group trip."*  
> Powered by **Next.js (Node.js Backend), Tailwind CSS, Supabase & Offline-First Sync**

---

## 🌟 The Vision

Group travel—whether with friends, family, student clubs, or corporate teams—is inherently chaotic and frequently happens in areas with poor or zero network connectivity (mountain passes, beaches, flights, highway dhabas).

**TripSync** is an **offline-first, living financial travel ledger** that answers:
> **"What happened during the trip, who participated in which booking, what did it cost, what changed when someone left, what needs proof, who owes whom now, and how can we record expenses even without internet and sync automatically when back online?"**

---

## 🚀 Key Differentiators

1. **📶 Offline-First Architecture & Auto-Sync**:
   - When traveling through zero-connectivity zones (flights, treks, remote beaches), users can still create expenses and view itineraries.
   - Expenses are queued locally in browser **IndexedDB** with `pending_sync` status.
   - As soon as the device reconnects to Wi-Fi/cellular (`online` event), TripSync automatically flushes the queue to the backend, updates the ledger, and recalculates balances.

2. **Connected Trip Lifecycle**:
   $$\text{Trip} \longrightarrow \text{Itinerary} \longrightarrow \text{Bookings} \longrightarrow \text{Participants} \longrightarrow \text{Expenses} \longrightarrow \text{Changes} \longrightarrow \text{Verification} \longrightarrow \text{Settlement}$$

3. **Deterministic Dynamic Recalculation Engine**:
   Automatically recalculates individual liabilities, generates transparent delta audits, and updates balances without manual re-entry when participants leave or bookings change.

4. **"What Changed?" Visual Diff**:
   ```text
   BEFORE:  Hotel ₹18,000 / 6 people = ₹3,000/person
   ACTION:  Rahul leaves the trip
   AFTER:   Hotel ₹18,000 / 5 people = ₹3,600/person
   IMPACT:  Remaining 5 participants: +₹600 each
   ```

5. **Dual Trip Governance Modes**:
   - 🛡️ **Manager-Based Trip**: Centralized authority. No-proof expenses require Manager approval.
   - 🗳️ **Group-Members Based Trip (Democratic)**: Flat hierarchy. No-proof expenses trigger interactive in-chat group polls.

6. **Multi-Tier Expense Verification**:
   - **UPI**: Payment screenshot OCR & UTR reference check.
   - **Cash**: Recipient one-click confirmation handshake.
   - **No Proof**: Manager approval queue or Realtime group chat poll.

7. **Device-Adaptive UPI Settlement**:
   - **📱 Mobile Devices**: Auto-detects device OS and provides a direct one-tap UPI intent link (`upi://pay?...`) that opens installed apps (Google Pay, PhonePe, Paytm, BHIM).
   - **💻 Desktop / Laptop**: Generates a dynamic, high-resolution QR code for the recipient's UPI VPA and exact settlement amount.

8. **Explainable Settlement**:
   Line-item breakdown:
   ```text
   Hotel Stay (3 nights)     : ₹1,500
   Team Dinner @ Fisherman's : ₹500
   Scuba Diving Activity     : ₹250
   ---------------------------------
   Total Net Liability       : ₹2,250
   ```

---

## 🛠️ Complete Tech Stack Explained

### 🖥️ Frontend
* **Next.js (React 18 + App Router)**: Responsive web application for mobile and desktop.
* **Tailwind CSS + Lucide React**: Clean, modern mobile-friendly UI and travel category icons.
* **Recharts**: Category expense analytics and financial health charts.
* **`qrcode.react`**: Dynamic SVG QR code generator for laptop screens.
* **IndexedDB (`idb-keyval` / Dexie.js)**: Local browser storage for offline trip data and offline expense queues.
* **PWA / Service Worker**: Offline caching of app shell, itinerary, and member rosters.

### ⚙️ Backend (Pure Node.js)
* **Node.js (Next.js Serverless Route Handlers in `app/api/*`)**:
  * `/api/trips`: Trip creation, invite codes, role management.
  * `/api/bookings`: Itinerary and vendor bookings.
  * `/api/expenses`: Expense capture and 8-way split calculations.
  * `/api/sync`: Batch offline synchronization endpoint.
  * `/api/recalculate`: Recalculation engine and "What Changed?" generator.
  * `/api/settlements`: Greedy debt minimization solver.
  * `/api/verification`: OCR parsing and cash handshake routes.
* **Deterministic Financial Services (`lib/services/`)**:
  * Written in pure JavaScript/Node.js to run without client-side manipulation.

### 🗄️ Database & Cloud Infrastructure (Supabase)
* **Supabase PostgreSQL**: Relational tables with foreign keys and `JSONB` for dynamic allocations and audit snapshots.
* **Supabase Auth**: Secure sessions, cookie management, user profiles.
* **Supabase Storage**: Cloud bucket (`trip-evidence`) for receipt and screenshot storage.
* **Supabase Realtime**: Live chat messages and live poll votes.
