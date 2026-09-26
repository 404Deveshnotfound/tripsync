import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockSettlements, isUsingPlaceholder } from '@/lib/mockStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST: Record payment attempt with UTR or OCR screenshot verification
export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const { 
      settlementId, 
      payerMemberId, 
      receiverMemberId, 
      amount, 
      paymentMethod = 'upi_intent', 
      utrNumber,
      proofData = null
    } = await request.json();

    if (isUsingPlaceholder()) {
      let existing = mockSettlements.find(
        s => (s.id === settlementId) || (s.payer_member_id === payerMemberId && s.receiver_member_id === receiverMemberId)
      );
      if (!existing) {
        existing = {
          id: settlementId || `stl-${payerMemberId}-${receiverMemberId}`,
          trip_id: tripId,
          payer_member_id: payerMemberId,
          receiver_member_id: receiverMemberId,
          amount,
          payment_method: paymentMethod,
          status: 'verifying',
          utr_number: utrNumber || null,
          breakdown_summary: proofData || [],
          created_at: new Date().toISOString()
        };
        mockSettlements.push(existing);
      } else {
        existing.status = 'verifying';
        existing.utr_number = utrNumber || existing.utr_number;
        existing.breakdown_summary = proofData || existing.breakdown_summary;
        existing.updated_at = new Date().toISOString();
      }

      return NextResponse.json({ success: true, settlement: existing });
    }

    const supabase = createAdminClient();

    // Check if an existing settlement row exists for this payer/receiver pair
    const { data: existingRows } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId)
      .eq('payer_member_id', payerMemberId)
      .eq('receiver_member_id', receiverMemberId);

    let settlementResult;
    if (existingRows && existingRows.length > 0) {
      const { data: updated, error: updateErr } = await supabase
        .from('settlements')
        .update({
          amount,
          payment_method: paymentMethod,
          status: 'verifying',
          utr_number: utrNumber || existingRows[0].utr_number,
          breakdown_summary: proofData || existingRows[0].breakdown_summary || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRows[0].id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      settlementResult = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('settlements')
        .insert({
          trip_id: tripId,
          payer_member_id: payerMemberId,
          receiver_member_id: receiverMemberId,
          amount,
          payment_method: paymentMethod,
          status: 'verifying',
          utr_number: utrNumber || null,
          breakdown_summary: proofData || []
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      settlementResult = inserted;
    }

    return NextResponse.json({ success: true, settlement: settlementResult });
  } catch (error) {
    console.error('Payment submission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
