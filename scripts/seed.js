#!/usr/bin/env node

/**
 * TripSync One-Click Demo Seeder
 * Populates Goa Adventure 2026 dataset for judges and hackathon presentations.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('\n🌴 ========================================================');
console.log('    TripSync — Living Verified Travel Ledger Seeder       ');
console.log('========================================================\n');

if (!supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')) {
  console.log('ℹ️  Running in Standalone Zero-Friction Demo Mode');
  process.exit(0);
}

async function seedSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`📡 Connecting to Supabase at: ${supabaseUrl}...`);

  const demoAccounts = [
    { email: 'rahul@tripsync.demo', password: 'password123', full_name: 'Rahul Sharma', upi_id: 'rahul@oksbi', phone: '+919876543210' },
    { email: 'amit@tripsync.demo', password: 'password123', full_name: 'Amit Patel', upi_id: 'amit@paytm', phone: '+919876543211' },
    { email: 'priya@tripsync.demo', password: 'password123', full_name: 'Priya Nair', upi_id: 'priya@ybl', phone: '+919876543212' },
    { email: 'sneha@tripsync.demo', password: 'password123', full_name: 'Sneha Rao', upi_id: 'sneha@okhdfc', phone: '+919876543213' },
    { email: 'vikram@tripsync.demo', password: 'password123', full_name: 'Vikram Singh', upi_id: 'vikram@axisbank', phone: '+919876543214' }
  ];

  console.log('1. Creating or fetching Auth Users in Supabase...');
  const userMap = {};

  for (const account of demoAccounts) {
    // Check if user exists
    const { data: listData } = await supabase.auth.admin.listUsers();
    let existing = listData?.users?.find(u => u.email === account.email);

    if (!existing) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          upi_id: account.upi_id,
          phone: account.phone
        }
      });
      if (createErr) {
        console.error(`Failed to create ${account.email}:`, createErr.message);
        continue;
      }
      existing = created.user;
    }

    userMap[account.email] = existing.id;

    // Ensure Profile is upserted
    await supabase.from('profiles').upsert({
      id: existing.id,
      full_name: account.full_name,
      phone: account.phone,
      upi_id: account.upi_id
    });
  }

  const rahulId = userMap['rahul@tripsync.demo'];
  const amitId = userMap['amit@tripsync.demo'];
  const priyaId = userMap['priya@tripsync.demo'];
  const snehaId = userMap['sneha@tripsync.demo'];
  const vikramId = userMap['vikram@tripsync.demo'];

  console.log('2. Creating "Goa Adventure 2026" Trip...');
  // Check if trip already exists
  const { data: existingTrips } = await supabase.from('trips').select('id').eq('invite_code', 'GOA2026');
  let tripId;

  if (existingTrips && existingTrips.length > 0) {
    tripId = existingTrips[0].id;
    console.log(`   Trip already exists (ID: ${tripId})`);
  } else {
    const { data: newTrip, error: tripErr } = await supabase.from('trips').insert({
      title: 'Goa Adventure 2026 🌴',
      destination: 'North Goa & Calangute',
      start_date: '2026-10-15',
      end_date: '2026-10-20',
      description: 'Annual group beach vacation with beach villa stay, water sports, and beach clubbing.',
      governance_mode: 'manager_based',
      invite_code: 'GOA2026',
      status: 'ongoing',
      created_by: rahulId
    }).select().single();

    if (tripErr) throw tripErr;
    tripId = newTrip.id;
  }

  console.log('3. Seeding Trip Memberships...');
  const memberDefinitions = [
    { trip_id: tripId, user_id: rahulId, role: 'owner', display_name: 'Rahul Sharma', upi_id: 'rahul@oksbi', status: 'active' },
    { trip_id: tripId, user_id: amitId, role: 'manager', display_name: 'Amit Patel', upi_id: 'amit@paytm', status: 'active' },
    { trip_id: tripId, user_id: priyaId, role: 'participant', display_name: 'Priya Nair', upi_id: 'priya@ybl', status: 'active' },
    { trip_id: tripId, user_id: snehaId, role: 'participant', display_name: 'Sneha Rao', upi_id: 'sneha@okhdfc', status: 'active' },
    { trip_id: tripId, user_id: vikramId, role: 'participant', display_name: 'Vikram Singh', upi_id: 'vikram@axisbank', status: 'active' }
  ];

  const memberMap = {};
  for (const m of memberDefinitions) {
    const { data: memberRow, error: memErr } = await supabase
      .from('trip_members')
      .upsert(m, { onConflict: 'trip_id,user_id' })
      .select()
      .single();

    if (memErr) {
      console.error('Member error:', memErr.message);
    } else {
      memberMap[m.display_name] = memberRow.id;
    }
  }

  const rahulMemId = memberMap['Rahul Sharma'];
  const amitMemId = memberMap['Amit Patel'];
  const priyaMemId = memberMap['Priya Nair'];
  const snehaMemId = memberMap['Sneha Rao'];
  const vikramMemId = memberMap['Vikram Singh'];
  const allMemIds = [rahulMemId, amitMemId, priyaMemId, snehaMemId, vikramMemId].filter(Boolean);

  console.log('4. Seeding Multi-Vendor Bookings...');
  const { data: existingBookings } = await supabase.from('bookings').select('id').eq('trip_id', tripId);
  if (!existingBookings || existingBookings.length === 0) {
    await supabase.from('bookings').insert([
      {
        trip_id: tripId,
        title: 'Luxury 4BHK Beachfront Villa',
        category: 'hotel',
        vendor_name: 'Airbnb / Ocean Stays Goa',
        booking_reference: 'AB-GOA-8821',
        start_time: '2026-10-15T14:00:00.000Z',
        end_time: '2026-10-18T11:00:00.000Z',
        location: 'Candolim Beach Road, North Goa',
        original_cost: 25000,
        current_cost: 25000,
        currency: 'INR',
        status: 'confirmed',
        paid_by_member_id: rahulMemId,
        participant_member_ids: allMemIds,
        split_method: 'equal',
        allocations: allMemIds.map(mId => ({ memberId: mId, amount: 5000 })),
        cancellation_policy: 'Full refund up to 48 hours before check-in'
      },
      {
        trip_id: tripId,
        title: 'Scuba Diving & Grand Island Boat Cruise',
        category: 'activity',
        vendor_name: 'Goa Aqua Thrills',
        booking_reference: 'SCUBA-2026-44',
        start_time: '2026-10-16T08:30:00.000Z',
        end_time: '2026-10-16T15:00:00.000Z',
        location: 'Sinquerim Boat Jetty',
        original_cost: 12000,
        current_cost: 12000,
        currency: 'INR',
        status: 'confirmed',
        paid_by_member_id: amitMemId,
        participant_member_ids: [rahulMemId, amitMemId, priyaMemId, snehaMemId],
        split_method: 'activity_based',
        allocations: [
          { memberId: rahulMemId, amount: 3000 },
          { memberId: amitMemId, amount: 3000 },
          { memberId: priyaMemId, amount: 3000 },
          { memberId: snehaMemId, amount: 3000 }
        ],
        cancellation_policy: 'Non-refundable within 24 hours of departure'
      }
    ]);
  }

  console.log('5. Seeding Expenses & Verification Queue...');
  const { data: existingExpenses } = await supabase.from('expenses').select('id').eq('trip_id', tripId);
  if (!existingExpenses || existingExpenses.length === 0) {
    await supabase.from('expenses').insert([
      {
        trip_id: tripId,
        title: 'Seafood Welcome Dinner @ Fisherman’s Wharf',
        category: 'meal',
        total_amount: 3500,
        paid_by_member_id: amitMemId,
        date: '2026-10-15',
        split_method: 'equal',
        allocations: allMemIds.map(mId => ({ memberId: mId, amount: 700 })),
        verification_status: 'verified',
        proof_type: 'upi_screenshot',
        proof_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
        extracted_details: { amount: 3500, vendor: "Fisherman's Wharf", utr: '428192038192' }
      },
      {
        trip_id: tripId,
        title: 'Parasailing & Jet Ski Package @ Baga Beach',
        category: 'activity',
        total_amount: 4200,
        paid_by_member_id: priyaMemId,
        date: '2026-10-16',
        split_method: 'equal',
        allocations: [
          { memberId: rahulMemId, amount: 1050 },
          { memberId: amitMemId, amount: 1050 },
          { memberId: priyaMemId, amount: 1050 },
          { memberId: snehaMemId, amount: 1050 }
        ],
        verification_status: 'pending_verification',
        proof_type: 'upi_screenshot',
        proof_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500&q=80',
        extracted_details: { amount: 4200, vendor: 'Baga Water Sports Center', utr: '992817261901' }
      }
    ]);
  }

  console.log('\n🎉 Successfully seeded Supabase live database with Goa Adventure 2026!');
  console.log('   Demo login credentials:');
  console.log('   - Email: rahul@tripsync.demo  | Password: password123 (Owner)');
  console.log('   - Email: amit@tripsync.demo   | Password: password123 (Manager)');
  console.log('   - Email: priya@tripsync.demo  | Password: password123 (Participant)');
  console.log('\n   Or register any NEW account at http://localhost:3000/signup!\n');
}

seedSupabase().catch(err => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
