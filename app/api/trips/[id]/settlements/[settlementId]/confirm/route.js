import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockSettlements, isUsingPlaceholder } from '@/lib/mockStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH: Receiver confirms receipt of UPI / cash payment
export async function PATCH(request, { params }) {
  const { id: tripId, settlementId } = params;

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }
    const { payerMemberId, receiverMemberId, amount } = body;

    if (isUsingPlaceholder()) {
      let existing = mockSettlements.find(
        s => (s.id === settlementId) || 
             (payerMemberId && receiverMemberId && s.payer_member_id === payerMemberId && s.receiver_member_id === receiverMemberId)
      );
      if (!existing) {
        existing = {
          id: settlementId || `stl-${payerMemberId}-${receiverMemberId}`,
          trip_id: tripId,
          payer_member_id: payerMemberId,
          receiver_member_id: receiverMemberId,
          amount: amount || 0,
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

    // Check if matching settlement exists
    let existingQuery = supabase.from('settlements').select('*').eq('trip_id', tripId);
    if (settlementId && !settlementId.startsWith('stl-')) {
      existingQuery = existingQuery.eq('id', settlementId);
    } else if (payerMemberId && receiverMemberId) {
      existingQuery = existingQuery.eq('payer_member_id', payerMemberId).eq('receiver_member_id', receiverMemberId);
    }

    const { data: existingRows } = await existingQuery;

    let confirmedSettlement;
    if (existingRows && existingRows.length > 0) {
      const { data: updated, error: updateErr } = await supabase
        .from('settlements')
        .update({
          status: 'completed',
          receiver_confirmed_at: new Date().toISOString()
        })
        .eq('id', existingRows[0].id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      confirmedSettlement = updated;
    } else {
      // Insert completed record if none existed prior
      const { data: inserted, error: insertErr } = await supabase
        .from('settlements')
        .insert({
          trip_id: tripId,
          payer_member_id: payerMemberId,
          receiver_member_id: receiverMemberId,
          amount: amount || 0,
          payment_method: 'upi',
          status: 'completed',
          receiver_confirmed_at: new Date().toISOString(),
          breakdown_summary: []
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      confirmedSettlement = inserted;
    }

    return NextResponse.json({ success: true, settlement: confirmedSettlement });
  } catch (error) {
    console.error('Confirm settlement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
