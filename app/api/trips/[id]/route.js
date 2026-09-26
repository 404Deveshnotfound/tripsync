import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockTrips, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

// GET: Fetch trip details and members roster
export async function GET(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Mock store fallback
  if (isUsingPlaceholder()) {
    const trip = mockTrips.find(t => t.id === id);
    if (!trip) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    const members = mockMembers.filter(m => m.trip_id === id);
    const myMembership = members.find(m => m.user_id === userId);

    return NextResponse.json({
      success: true,
      trip,
      members,
      myRole: myMembership?.role || null,
      isMember: Boolean(myMembership),
      isOwner: myMembership?.role === 'owner',
      isManager: myMembership?.role === 'manager' || myMembership?.role === 'owner',
      isDemocratic: trip.governance_mode === 'democratic'
    });
  }

  try {
    const supabase = createAdminClient();

    // 1. Fetch trip
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single();

    if (tripErr || !trip) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    // 2. Fetch members
    const { data: members, error: memErr } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', id)
      .order('joined_at', { ascending: true });

    if (memErr) throw memErr;

    const myMembership = members.find(m => m.user_id === userId);

    return NextResponse.json({
      success: true,
      trip,
      members,
      myRole: myMembership?.role || null,
      isMember: Boolean(myMembership),
      isOwner: myMembership?.role === 'owner',
      isManager: myMembership?.role === 'manager' || myMembership?.role === 'owner',
      isDemocratic: trip.governance_mode === 'democratic'
    });
  } catch (error) {
    console.error('Fetch trip details error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
