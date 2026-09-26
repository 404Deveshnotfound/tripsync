import { NextResponse } from 'next/server';
import { 
  resetMockStore, 
  isUsingPlaceholder,
  INITIAL_USERS,
  INITIAL_TRIPS,
  INITIAL_MEMBERS,
  INITIAL_BOOKINGS,
  INITIAL_EXPENSES,
  INITIAL_AUDIT_LOGS,
  INITIAL_CHAT_MESSAGES
} from '@/lib/mockStore';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    if (isUsingPlaceholder()) {
      const res = resetMockStore();
      return NextResponse.json({
        success: true,
        mode: 'mock',
        message: 'Demo store reset to clean Goa Adventure 2026 state!'
      });
    }

    const supabaseAdmin = createAdminClient();

    // Live Supabase Seeding
    // 1. Upsert Profiles
    for (const u of INITIAL_USERS) {
      await supabaseAdmin.from('profiles').upsert({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        upi_id: u.upi_id,
        phone: u.phone
      });
    }

    // 2. Upsert Trips
    for (const t of INITIAL_TRIPS) {
      await supabaseAdmin.from('trips').upsert({
        id: t.id,
        title: t.title,
        destination: t.destination,
        start_date: t.start_date,
        end_date: t.end_date,
        description: t.description,
        governance_mode: t.governance_mode,
        invite_code: t.invite_code,
        status: t.status,
        created_by: t.created_by
      });
    }

    // 3. Upsert Trip Members
    for (const m of INITIAL_MEMBERS) {
      await supabaseAdmin.from('trip_members').upsert({
        id: m.id,
        trip_id: m.trip_id,
        user_id: m.user_id,
        role: m.role,
        display_name: m.display_name,
        upi_id: m.upi_id,
        status: m.status
      });
    }

    // 4. Upsert Bookings
    for (const b of INITIAL_BOOKINGS) {
      await supabaseAdmin.from('bookings').upsert({
        id: b.id,
        trip_id: b.trip_id,
        title: b.title,
        category: b.category,
        vendor_name: b.vendor_name,
        booking_reference: b.booking_reference,
        start_time: b.start_time,
        end_time: b.end_time,
        location: b.location,
        original_cost: b.original_cost,
        current_cost: b.current_cost,
        currency: b.currency,
        status: b.status,
        paid_by_member_id: b.paid_by_member_id,
        participant_member_ids: b.participant_member_ids,
        split_method: b.split_method,
        allocations: b.allocations,
        cancellation_policy: b.cancellation_policy
      });
    }

    // 5. Upsert Expenses
    for (const e of INITIAL_EXPENSES) {
      await supabaseAdmin.from('expenses').upsert({
        id: e.id,
        trip_id: e.trip_id,
        title: e.title,
        category: e.category,
        total_amount: e.total_amount,
        paid_by_member_id: e.paid_by_member_id,
        date: e.date,
        split_method: e.split_method,
        allocations: e.allocations,
        verification_status: e.verification_status,
        proof_type: e.proof_type,
        proof_url: e.proof_url,
        extracted_details: e.extracted_details
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'supabase',
      message: 'Supabase database successfully seeded with Goa Adventure 2026 dataset!'
    });
  } catch (error) {
    console.error('Seed API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
