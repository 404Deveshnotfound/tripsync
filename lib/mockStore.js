// Comprehensive Mock Store for offline demoing and zero-friction presentation
import { calculateSplit } from './services/splitEngine';

export const INITIAL_USERS = [
  { id: 'usr-1', email: 'rahul@example.com', full_name: 'Rahul Sharma', upi_id: 'rahul@oksbi', phone: '+919876543210' },
  { id: 'usr-2', email: 'amit@example.com', full_name: 'Amit Patel', upi_id: 'amit@paytm', phone: '+919876543211' },
  { id: 'usr-3', email: 'priya@example.com', full_name: 'Priya Nair', upi_id: 'priya@ybl', phone: '+919876543212' },
  { id: 'usr-4', email: 'sneha@example.com', full_name: 'Sneha Rao', upi_id: 'sneha@okhdfc', phone: '+919876543213' },
  { id: 'usr-5', email: 'vikram@example.com', full_name: 'Vikram Singh', upi_id: 'vikram@axisbank', phone: '+919876543214' }
];

export const INITIAL_TRIPS = [
  {
    id: 'trip-goa-2026',
    title: 'Goa Adventure 2026 🌴',
    destination: 'North Goa & Calangute',
    start_date: '2026-10-15',
    end_date: '2026-10-20',
    description: 'Annual group beach vacation with beach villa stay, water sports, and beach clubbing.',
    governance_mode: 'manager_based',
    invite_code: 'GOA2026',
    status: 'ongoing',
    created_by: 'usr-1',
    created_at: new Date().toISOString()
  },
  {
    id: 'trip-manali-2026',
    title: 'Manali Snow Trek 🏔️',
    destination: 'Solang Valley & Old Manali',
    start_date: '2026-11-05',
    end_date: '2026-11-10',
    description: 'Democratic college friends trip where all decisions and polls are voted on together.',
    governance_mode: 'democratic',
    invite_code: 'SNOW2026',
    status: 'planning',
    created_by: 'usr-2',
    created_at: new Date().toISOString()
  }
];

export const INITIAL_MEMBERS = [
  { id: 'mem-1', trip_id: 'trip-goa-2026', user_id: 'usr-1', role: 'owner', display_name: 'Rahul Sharma', upi_id: 'rahul@oksbi', status: 'active' },
  { id: 'mem-2', trip_id: 'trip-goa-2026', user_id: 'usr-2', role: 'manager', display_name: 'Amit Patel', upi_id: 'amit@paytm', status: 'active' },
  { id: 'mem-3', trip_id: 'trip-goa-2026', user_id: 'usr-3', role: 'participant', display_name: 'Priya Nair', upi_id: 'priya@ybl', status: 'active' },
  { id: 'mem-4', trip_id: 'trip-goa-2026', user_id: 'usr-4', role: 'participant', display_name: 'Sneha Rao', upi_id: 'sneha@okhdfc', status: 'active' },
  { id: 'mem-5', trip_id: 'trip-goa-2026', user_id: 'usr-5', role: 'participant', display_name: 'Vikram Singh', upi_id: 'vikram@axisbank', status: 'active' },
  // Democratic trip members
  { id: 'mem-d1', trip_id: 'trip-manali-2026', user_id: 'usr-2', role: 'owner', display_name: 'Amit Patel', upi_id: 'amit@paytm', status: 'active' },
  { id: 'mem-d2', trip_id: 'trip-manali-2026', user_id: 'usr-1', role: 'participant', display_name: 'Rahul Sharma', upi_id: 'rahul@oksbi', status: 'active' },
  { id: 'mem-d3', trip_id: 'trip-manali-2026', user_id: 'usr-4', role: 'participant', display_name: 'Sneha Rao', upi_id: 'sneha@okhdfc', status: 'active' }
];

export const INITIAL_BOOKINGS = [
  {
    id: 'book-1',
    trip_id: 'trip-goa-2026',
    title: 'Luxury 4BHK Beachfront Villa',
    category: 'hotel',
    vendor_name: 'Airbnb / Ocean Stays Goa',
    booking_reference: 'AB-GOA-8821',
    start_time: '2026-10-15T14:00:00.000Z',
    end_time: '2026-10-18T11:00:00.000Z',
    location: 'Candolim Beach Road, North Goa',
    original_cost: 25000,
    current_cost: 25000,
    refund_amount: 0,
    currency: 'INR',
    status: 'confirmed',
    paid_by_member_id: 'mem-1',
    participant_member_ids: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'],
    split_method: 'equal',
    allocations: calculateSplit({
      method: 'equal',
      totalAmount: 25000,
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5']
    }),
    cancellation_policy: 'Full refund up to 48 hours before check-in',
    created_at: new Date().toISOString()
  },
  {
    id: 'book-2',
    trip_id: 'trip-goa-2026',
    title: 'Scuba Diving & Grand Island Boat Cruise',
    category: 'activity',
    vendor_name: 'Goa Aqua Thrills',
    booking_reference: 'SCUBA-2026-44',
    start_time: '2026-10-16T08:30:00.000Z',
    end_time: '2026-10-16T15:00:00.000Z',
    location: 'Sinquerim Boat Jetty',
    original_cost: 12000,
    current_cost: 12000,
    refund_amount: 0,
    currency: 'INR',
    status: 'confirmed',
    paid_by_member_id: 'mem-2',
    participant_member_ids: ['mem-1', 'mem-2', 'mem-3', 'mem-4'],
    split_method: 'activity_based',
    allocations: calculateSplit({
      method: 'activity_based',
      totalAmount: 12000,
      allMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'],
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4']
    }),
    cancellation_policy: 'Non-refundable within 24 hours of departure',
    created_at: new Date().toISOString()
  },
  {
    id: 'book-3',
    trip_id: 'trip-goa-2026',
    title: 'Self-Drive Mahindra Thar (4 Days)',
    category: 'cab',
    vendor_name: 'Goa Wheels Car Rentals',
    booking_reference: 'GW-THAR-9102',
    start_time: '2026-10-15T12:00:00.000Z',
    end_time: '2026-10-19T12:00:00.000Z',
    location: 'Mopa Goa Airport Pickup',
    original_cost: 8000,
    current_cost: 8000,
    refund_amount: 0,
    currency: 'INR',
    status: 'confirmed',
    paid_by_member_id: 'mem-3',
    participant_member_ids: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5'],
    split_method: 'equal',
    allocations: calculateSplit({
      method: 'equal',
      totalAmount: 8000,
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5']
    }),
    created_at: new Date().toISOString()
  }
];

export const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    trip_id: 'trip-goa-2026',
    booking_id: null,
    title: 'Seafood Welcome Dinner @ Fisherman’s Wharf',
    category: 'meal',
    total_amount: 3500,
    paid_by_member_id: 'mem-2',
    date: '2026-10-15',
    split_method: 'equal',
    allocations: calculateSplit({
      method: 'equal',
      totalAmount: 3500,
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5']
    }),
    verification_status: 'verified',
    proof_type: 'upi_screenshot',
    proof_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
    extracted_details: {
      amount: 3500,
      vendor: "Fisherman's Wharf",
      utr: '428192038192'
    },
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-2',
    trip_id: 'trip-goa-2026',
    booking_id: null,
    title: 'Highway Tea & Coconut Water',
    category: 'meal',
    total_amount: 650,
    paid_by_member_id: 'mem-5',
    date: '2026-10-16',
    split_method: 'equal',
    allocations: calculateSplit({
      method: 'equal',
      totalAmount: 650,
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4', 'mem-5']
    }),
    verification_status: 'verified',
    proof_type: 'no_proof',
    mismatch_flag: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'exp-3',
    trip_id: 'trip-goa-2026',
    booking_id: null,
    title: 'Parasailing & Jet Ski Package @ Baga Beach',
    category: 'activity',
    total_amount: 4200,
    paid_by_member_id: 'mem-3',
    date: '2026-10-16',
    split_method: 'equal',
    allocations: calculateSplit({
      method: 'equal',
      totalAmount: 4200,
      selectedMemberIds: ['mem-1', 'mem-2', 'mem-3', 'mem-4']
    }),
    verification_status: 'pending_verification',
    proof_type: 'upi_screenshot',
    proof_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&q=80',
    extracted_details: {
      amount: 4200,
      vendor: 'Baga Water Sports Center',
      utr: '992817261901'
    },
    created_at: new Date().toISOString()
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'audit-demo-1',
    trip_id: 'trip-goa-2026',
    trigger_event: 'activity_modified',
    description: 'Vikram skipped Scuba Diving booking',
    affected_item_title: 'Scuba Diving & Grand Island Boat Cruise',
    affected_item_type: 'booking',
    affected_booking_id: 'book-2',
    affected_member_id: 'mem-5',
    snapshot_before: {
      totalCost: 12000,
      participantCount: 5,
      perPersonCost: 2400,
      allocations: [
        { memberId: 'mem-1', amount: 2400 },
        { memberId: 'mem-2', amount: 2400 },
        { memberId: 'mem-3', amount: 2400 },
        { memberId: 'mem-4', amount: 2400 },
        { memberId: 'mem-5', amount: 2400 }
      ]
    },
    snapshot_after: {
      totalCost: 12000,
      participantCount: 4,
      perPersonCost: 3000,
      allocations: [
        { memberId: 'mem-1', amount: 3000 },
        { memberId: 'mem-2', amount: 3000 },
        { memberId: 'mem-3', amount: 3000 },
        { memberId: 'mem-4', amount: 3000 }
      ]
    },
    impact_summary: 'Remaining 4 participants: +₹600 each (Vikram excused)',
    performed_by: 'mem-1',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    id: 'chat-msg-1',
    trip_id: 'trip-goa-2026',
    sender_id: 'mem-1',
    sender_name: 'Rahul Sharma',
    message_type: 'text',
    content: 'Welcome to Goa everyone! Beach villa check-in is confirmed for 2 PM.',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'chat-msg-2',
    trip_id: 'trip-goa-2026',
    sender_id: 'mem-5',
    sender_name: 'Vikram Singh',
    message_type: 'poll',
    content: 'Added ₹650 roadside tea & snacks (Vendor did not provide a printed bill). Please vote to approve:',
    expense_id: 'exp-2',
    poll_data: {
      id: 'poll-1',
      expense_id: 'exp-2',
      title: 'Highway Tea & Coconut Water',
      amount: 650,
      paid_by: 'Vikram Singh',
      status: 'approved',
      votes: {
        'mem-1': 'approve',
        'mem-2': 'approve',
        'mem-3': 'approve'
      },
      required_votes: 2
    },
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'chat-msg-3',
    trip_id: 'trip-goa-2026',
    sender_id: 'mem-2',
    sender_name: 'Amit Patel',
    message_type: 'poll',
    content: 'Auto-rickshaw convoy from Candolim to Curlies Beach Club (cash payment, no paper bill):',
    expense_id: 'exp-4-pending',
    poll_data: {
      id: 'poll-2',
      expense_id: 'exp-4-pending',
      title: 'Auto-rickshaw convoy to Curlies',
      amount: 900,
      paid_by: 'Amit Patel',
      status: 'active',
      votes: {
        'mem-2': 'approve'
      },
      required_votes: 2
    },
    created_at: new Date(Date.now() - 900000).toISOString()
  }
];

// In-memory mutable collections
export const mockUsers = JSON.parse(JSON.stringify(INITIAL_USERS));
export const mockTrips = JSON.parse(JSON.stringify(INITIAL_TRIPS));
export const mockMembers = JSON.parse(JSON.stringify(INITIAL_MEMBERS));
export const mockBookings = JSON.parse(JSON.stringify(INITIAL_BOOKINGS));
export const mockExpenses = JSON.parse(JSON.stringify(INITIAL_EXPENSES));
export const mockAuditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
export const mockChatMessages = JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES));
export const mockSettlements = [];

/**
 * Resets the in-memory mock store back to the clean initial demo state.
 */
export function resetMockStore() {
  mockTrips.length = 0;
  mockTrips.push(...JSON.parse(JSON.stringify(INITIAL_TRIPS)));

  mockMembers.length = 0;
  mockMembers.push(...JSON.parse(JSON.stringify(INITIAL_MEMBERS)));

  mockBookings.length = 0;
  mockBookings.push(...JSON.parse(JSON.stringify(INITIAL_BOOKINGS)));

  mockExpenses.length = 0;
  mockExpenses.push(...JSON.parse(JSON.stringify(INITIAL_EXPENSES)));

  mockAuditLogs.length = 0;
  mockAuditLogs.push(...JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)));

  mockChatMessages.length = 0;
  mockChatMessages.push(...JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES)));

  mockSettlements.length = 0;

  return { success: true, message: 'TripSync demo state reset successfully' };
}

export function isUsingPlaceholder() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return !url || url.includes('placeholder.supabase.co');
}
