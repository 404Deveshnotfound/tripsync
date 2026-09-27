import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockExpenses, mockMembers, mockChatMessages, isUsingPlaceholder } from '@/lib/mockStore';

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function PATCH(request, { params }) {
  const { id: tripId, expenseId } = params;

  try {
    const { action, verifiedByMemberId } = await request.json(); // action: 'approve' | 'dispute'

    if (isUsingPlaceholder() || !isUuid(tripId)) {
      const exp = mockExpenses.find(e => e.id === expenseId && e.trip_id === tripId);
      if (!exp) {
        return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
      }

      if (action === 'approve') {
        exp.verification_status = 'verified';
        exp.verified_by = verifiedByMemberId;
        exp.verified_at = new Date().toISOString();

        // Sync linked poll in chat
        const pollMsg = mockChatMessages.find(m => m.expense_id === expenseId || m.poll_data?.expense_id === expenseId);
        if (pollMsg?.poll_data) {
          pollMsg.poll_data.status = 'approved';
        }

        // Post system message
        mockChatMessages.push({
          id: 'chat-sys-' + Date.now(),
          trip_id: tripId,
          sender_id: null,
          sender_name: 'Manager Approval',
          message_type: 'system_audit',
          content: `🟢 Expense "${exp.title}" (₹${exp.total_amount}) has been verified directly by Manager.`,
          created_at: new Date().toISOString()
        });
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

    // Sync linked poll in chat
    if (action === 'approve') {
      const { data: pollMsg } = await supabase
        .from('chat_messages')
        .select('id, poll_data')
        .eq('expense_id', expenseId)
        .maybeSingle();

      if (pollMsg && pollMsg.poll_data) {
        const updatedPollData = { ...pollMsg.poll_data, status: 'approved' };
        await supabase
          .from('chat_messages')
          .update({ poll_data: updatedPollData })
          .eq('id', pollMsg.id);
      }

      // Add system message
      await supabase
        .from('chat_messages')
        .insert({
          trip_id: tripId,
          message_type: 'system_audit',
          content: `🟢 Expense "${updatedExp.title}" (₹${updatedExp.total_amount}) has been verified directly by Manager.`
        });
    }

    return NextResponse.json({ success: true, expense: updatedExp });
  } catch (error) {
    console.error('Verify expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
