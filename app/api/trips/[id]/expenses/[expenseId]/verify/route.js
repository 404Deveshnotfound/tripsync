import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockExpenses, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

export async function PATCH(request, { params }) {
  const { id: tripId, expenseId } = params;

  try {
    const { action, verifiedByMemberId } = await request.json(); // action: 'approve' | 'dispute'

    if (isUsingPlaceholder()) {
      const exp = mockExpenses.find(e => e.id === expenseId && e.trip_id === tripId);
      if (!exp) {
        return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
      }

      if (action === 'approve') {
        exp.verification_status = 'verified';
        exp.verified_by = verifiedByMemberId;
        exp.verified_at = new Date().toISOString();
      } else if (action === 'dispute') {
        exp.verification_status = 'disputed';
      }

      return NextResponse.json({ success: true, expense: exp });
    }

    const supabase = createAdminClient();
    const updateData = action === 'approve'
      ? { verification_status: 'verified', verified_by: verifiedByMemberId, verified_at: new Date().toISOString() }
      : { verification_status: 'disputed' };

    const { data: updatedExp, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, expense: updatedExp });
  } catch (error) {
    console.error('Verify expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
