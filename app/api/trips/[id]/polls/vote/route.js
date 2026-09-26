import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockChatMessages, mockExpenses, isUsingPlaceholder } from '@/lib/mockStore';

// POST: Cast vote on an in-chat poll
export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const { pollId, memberId, vote } = await request.json(); // vote: 'approve' | 'reject'

    if (!pollId || !memberId || !vote) {
      return NextResponse.json({ success: false, error: 'PollId, memberId, and vote are required' }, { status: 400 });
    }

    if (isUsingPlaceholder()) {
      const chatMsg = mockChatMessages.find(m => m.poll_data?.id === pollId && m.trip_id === tripId);
      if (!chatMsg || !chatMsg.poll_data) {
        return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
      }

      // Record vote
      chatMsg.poll_data.votes[memberId] = vote;

      // Count approvals
      const approveCount = Object.values(chatMsg.poll_data.votes).filter(v => v === 'approve').length;
      const isApproved = approveCount >= (chatMsg.poll_data.required_votes || 2);

      if (isApproved && chatMsg.poll_data.status !== 'approved') {
        chatMsg.poll_data.status = 'approved';

        // Update linked expense status to verified
        if (chatMsg.expense_id) {
          const exp = mockExpenses.find(e => e.id === chatMsg.expense_id);
          if (exp) {
            exp.verification_status = 'verified';
          }
        }

        // Add system message
        mockChatMessages.push({
          id: 'chat-sys-' + Date.now(),
          trip_id: tripId,
          sender_id: null,
          sender_name: 'System Consensus',
          message_type: 'system_audit',
          content: `🟢 Poll Approved! "${chatMsg.poll_data.title}" (₹${chatMsg.poll_data.amount}) has been verified by group consensus.`,
          created_at: new Date().toISOString()
        });
      }

      return NextResponse.json({
        success: true,
        pollData: chatMsg.poll_data,
        isApproved
      });
    }

    // Live Supabase Voting
    const supabase = createAdminClient();

    const { data: chatMsg, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('trip_id', tripId)
      .eq('poll_data->>id', pollId)
      .single();

    if (fetchErr || !chatMsg) {
      return NextResponse.json({ success: false, error: 'Poll not found' }, { status: 404 });
    }

    const pollData = chatMsg.poll_data;
    pollData.votes = pollData.votes || {};
    pollData.votes[memberId] = vote;

    const approveCount = Object.values(pollData.votes).filter(v => v === 'approve').length;
    const isApproved = approveCount >= (pollData.required_votes || 2);

    if (isApproved && pollData.status !== 'approved') {
      pollData.status = 'approved';

      // Update expense
      if (chatMsg.expense_id) {
        await supabase
          .from('expenses')
          .update({ verification_status: 'verified' })
          .eq('id', chatMsg.expense_id);
      }

      // Add system message
      await supabase
        .from('chat_messages')
        .insert({
          trip_id: tripId,
          message_type: 'system_audit',
          content: `🟢 Poll Approved! "${pollData.title}" (₹${pollData.amount}) has been verified by group consensus.`
        });
    }

    // Update poll message
    await supabase
      .from('chat_messages')
      .update({ poll_data: pollData })
      .eq('id', chatMsg.id);

    return NextResponse.json({
      success: true,
      pollData,
      isApproved
    });
  } catch (error) {
    console.error('Vote poll error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
