import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockTrips, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

// POST: Join a trip using invite code
export async function POST(request) {
  try {
    const { inviteCode, userId, userDisplayName, userUpiId } = await request.json();

    if (!inviteCode || !userId) {
      return NextResponse.json({ success: false, error: 'Invite code and user ID are required' }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // Mock store fallback
    if (isUsingPlaceholder()) {
      const trip = mockTrips.find(t => t.invite_code.toUpperCase() === cleanCode);
      if (!trip) {
        return NextResponse.json({ success: false, error: 'Invalid trip invite code' }, { status: 404 });
      }

      // Check if already a member
      const existing = mockMembers.find(m => m.trip_id === trip.id && m.user_id === userId);
      if (existing) {
        if (existing.status === 'left') {
          existing.status = 'active'; // Rejoin
          return NextResponse.json({ success: true, trip, member: existing, rejoined: true });
        }
        return NextResponse.json({ success: true, trip, member: existing, alreadyMember: true });
      }

      const newMember = {
        id: 'mem-' + Date.now(),
        trip_id: trip.id,
        user_id: userId,
        role: 'participant',
        display_name: userDisplayName || 'Traveler',
        upi_id: userUpiId || '',
        status: 'active',
        joined_at: new Date().toISOString()
      };
      mockMembers.push(newMember);

      return NextResponse.json({ success: true, trip, member: newMember });
    }

    // Live Supabase
    const supabase = createAdminClient();

    // 1. Find trip by invite code
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('*')
      .ilike('invite_code', cleanCode)
      .single();

    if (tripErr || !trip) {
      return NextResponse.json({ success: false, error: 'Invalid trip invite code' }, { status: 404 });
    }

    // 2. Check if already a member
    const { data: existingMember } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', trip.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      if (existingMember.status === 'left') {
        const { data: rejoinedMember } = await supabase
          .from('trip_members')
          .update({ status: 'active', left_at: null })
          .eq('id', existingMember.id)
          .select()
          .single();
        return NextResponse.json({ success: true, trip, member: rejoinedMember, rejoined: true });
      }
      return NextResponse.json({ success: true, trip, member: existingMember, alreadyMember: true });
    }

    // 3. Add as participant
    const { data: member, error: memberErr } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        user_id: userId,
        role: 'participant',
        display_name: userDisplayName || 'Traveler',
        upi_id: userUpiId || '',
        status: 'active'
      })
      .select()
      .single();

    if (memberErr) throw memberErr;

    return NextResponse.json({ success: true, trip, member });
  } catch (error) {
    console.error('Join trip error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
