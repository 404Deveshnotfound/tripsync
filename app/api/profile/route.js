import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUsingPlaceholder, mockUsers, mockMembers } from '@/lib/mockStore';

export async function POST(request) {
  try {
    const { userId, fullName, upiId, phone } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (isUsingPlaceholder()) {
      const user = mockUsers.find(u => u.id === userId);
      if (user) {
        if (fullName) user.full_name = fullName;
        if (upiId) user.upi_id = upiId;
        if (phone) user.phone = phone;
      }
      // Also update mock members
      mockMembers.forEach(m => {
        if (m.user_id === userId) {
          if (fullName) m.display_name = fullName;
          if (upiId) m.upi_id = upiId;
        }
      });
      return NextResponse.json({ success: true, profile: user });
    }

    const supabase = createAdminClient();

    // 1. Update profiles table
    const { data: updatedProfile, error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        upi_id: upiId,
        phone: phone,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profErr) throw profErr;

    // 2. Cascade update into all trip memberships for this user
    await supabase
      .from('trip_members')
      .update({
        display_name: fullName,
        upi_id: upiId
      })
      .eq('user_id', userId);

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
