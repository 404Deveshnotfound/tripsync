import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockTrips, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

// GET: List user's trips
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Fallback to local mock data if using placeholder Supabase credentials
  if (isUsingPlaceholder()) {
    // Find all trips where the user is a member
    const userMemberEntries = mockMembers.filter(m => m.user_id === userId);
    const tripIds = userMemberEntries.map(m => m.trip_id);
    const trips = mockTrips.map(trip => {
      const myMembership = mockMembers.find(m => m.trip_id === trip.id && m.user_id === userId);
      const memberCount = mockMembers.filter(m => m.trip_id === trip.id && m.status === 'active').length;
      return {
        ...trip,
        myRole: myMembership?.role || null,
        isMember: Boolean(myMembership),
        memberCount
      };
    });
    return NextResponse.json({ success: true, trips });
  }

  try {
    const supabase = createAdminClient();

    // Query trips where user is a member
    const { data: memberRows, error: memberErr } = await supabase
      .from('trip_members')
      .select('trip_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberErr) throw memberErr;

    const tripIds = memberRows.map(m => m.trip_id);
    if (tripIds.length === 0) {
      return NextResponse.json({ success: true, trips: [] });
    }

    const { data: tripsData, error: tripsErr } = await supabase
      .from('trips')
      .select('*, trip_members(count)')
      .in('id', tripIds)
      .order('created_at', { ascending: false });

    if (tripsErr) throw tripsErr;

    const trips = tripsData.map(t => {
      const memberInfo = memberRows.find(m => m.trip_id === t.id);
      return {
        ...t,
        myRole: memberInfo?.role || 'participant',
        memberCount: t.trip_members?.[0]?.count || 1
      };
    });

    return NextResponse.json({ success: true, trips });
  } catch (error) {
    console.error('Fetch trips error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new trip with Dual Governance Mode
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      destination,
      startDate,
      endDate,
      description,
      governanceMode, // 'manager_based' | 'democratic'
      userId,
      userDisplayName,
      userUpiId
    } = body;

    if (!title || !destination || !startDate || !endDate || !userId) {
      return NextResponse.json({ success: false, error: 'Missing required trip fields' }, { status: 400 });
    }

    // Generate unique alphanumeric invite code (e.g. GOA-9421)
    const prefix = destination.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TRIP';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const inviteCode = `${prefix}-${randNum}`;

    // Handle mock store fallback
    if (isUsingPlaceholder()) {
      const newTripId = 'trip-' + Date.now();
      const newTrip = {
        id: newTripId,
        title,
        destination,
        start_date: startDate,
        end_date: endDate,
        description: description || '',
        governance_mode: governanceMode || 'manager_based',
        invite_code: inviteCode,
        status: 'planning',
        created_by: userId,
        created_at: new Date().toISOString()
      };
      mockTrips.unshift(newTrip);

      // Auto-assign creator as Trip Owner
      const newMember = {
        id: 'mem-' + Date.now(),
        trip_id: newTripId,
        user_id: userId,
        role: 'owner',
        display_name: userDisplayName || 'Trip Owner',
        upi_id: userUpiId || '',
        status: 'active',
        joined_at: new Date().toISOString()
      };
      mockMembers.push(newMember);

      return NextResponse.json({ success: true, trip: newTrip, member: newMember });
    }

    // Live Supabase insertion
    const supabase = createAdminClient();

    const { data: tripData, error: tripErr } = await supabase
      .from('trips')
      .insert({
        title,
        destination,
        start_date: startDate,
        end_date: endDate,
        description,
        governance_mode: governanceMode || 'manager_based',
        invite_code: inviteCode,
        created_by: userId,
      })
      .select()
      .single();

    if (tripErr) throw tripErr;

    // Auto-assign creator as Trip Owner
    const { data: memberData, error: memberErr } = await supabase
      .from('trip_members')
      .insert({
        trip_id: tripData.id,
        user_id: userId,
        role: 'owner',
        display_name: userDisplayName || 'Trip Owner',
        upi_id: userUpiId || '',
        status: 'active'
      })
      .select()
      .single();

    if (memberErr) throw memberErr;

    return NextResponse.json({ success: true, trip: tripData, member: memberData });
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
