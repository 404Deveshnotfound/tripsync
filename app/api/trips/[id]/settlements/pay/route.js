import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockSettlements, isUsingPlaceholder } from '@/lib/mockStore';

// POST: Record payment attempt with UTR or Cash notice
export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const { 
      settlementId, 
      payerMemberId, 
      receiverMemberId, 
      amount, 
      paymentMethod = 'upi_intent', 
      utrNumber 
    } = await request.json();

    if (isUsingPlaceholder()) {
      let existing = mockSettlements.find(s => s.id === settlementId);
      if (!existing) {
        existing = {
          id: settlementId,
          trip_id: tripId,
          payer_member_id: payerMemberId,
          receiver_member_id: receiverMemberId,
          amount,
          payment_method: paymentMethod,
          status: 'verifying',
          utr_number: utrNumber || null,
          created_at: new Date().toISOString()
        };
        mockSettlements.push(existing);
      } else {
        existing.status = 'verifying';
        existing.utr_number = utrNumber || existing.utr_number;
      }

      return NextResponse.json({ success: true, settlement: existing });
    }

    const supabase = createAdminClient();
    const { data: settlement, error } = await supabase
      .from('settlements')
      .upsert({
        trip_id: tripId,
        payer_member_id: payerMemberId,
        receiver_member_id: receiverMemberId,
        amount,
        payment_method: paymentMethod,
        status: 'verifying',
        utr_number: utrNumber,
        breakdown_summary: []
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, settlement });
  } catch (error) {
    console.error('Payment submission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
