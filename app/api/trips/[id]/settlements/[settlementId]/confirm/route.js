import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockSettlements, isUsingPlaceholder } from '@/lib/mockStore';

// PATCH: Receiver confirms receipt of cash or UPI payment
export async function PATCH(request, { params }) {
  const { id: tripId, settlementId } = params;

  try {
    if (isUsingPlaceholder()) {
      let existing = mockSettlements.find(s => s.id === settlementId);
      if (!existing) {
        existing = {
          id: settlementId,
          trip_id: tripId,
          status: 'completed',
          receiver_confirmed_at: new Date().toISOString()
        };
        mockSettlements.push(existing);
      } else {
        existing.status = 'completed';
        existing.receiver_confirmed_at = new Date().toISOString();
      }

      return NextResponse.json({ success: true, settlement: existing });
    }

    const supabase = createAdminClient();
    const { data: settlement, error } = await supabase
      .from('settlements')
      .update({
        status: 'completed',
        receiver_confirmed_at: new Date().toISOString()
      })
      .eq('id', settlementId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, settlement });
  } catch (error) {
    console.error('Confirm settlement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
