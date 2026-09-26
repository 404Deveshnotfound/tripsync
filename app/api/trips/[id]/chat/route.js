import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockChatMessages, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

// GET: Fetch chat messages and polls for a trip
export async function GET(request, { params }) {
  const { id: tripId } = params;

  if (isUsingPlaceholder()) {
    const messages = mockChatMessages.filter(m => m.trip_id === tripId);
    return NextResponse.json({ success: true, messages });
  }

  try {
    const supabase = createAdminClient();
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*, trip_members(display_name)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (error) {
    console.error('Fetch chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send a chat message
export async function POST(request, { params }) {
  const { id: tripId } = params;

  try {
    const { senderMemberId, content } = await request.json();

    if (!senderMemberId || !content) {
      return NextResponse.json({ success: false, error: 'Sender and content required' }, { status: 400 });
    }

    if (isUsingPlaceholder()) {
      const sender = mockMembers.find(m => m.id === senderMemberId);
      const newMsg = {
        id: 'chat-' + Date.now(),
        trip_id: tripId,
        sender_id: senderMemberId,
        sender_name: sender?.display_name || 'Traveler',
        message_type: 'text',
        content,
        created_at: new Date().toISOString()
      };
      mockChatMessages.push(newMsg);
      return NextResponse.json({ success: true, message: newMsg });
    }

    const supabase = createAdminClient();
    const { data: newMsg, error } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: tripId,
        sender_id: senderMemberId,
        message_type: 'text',
        content
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, message: newMsg });
  } catch (error) {
    console.error('Send chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
