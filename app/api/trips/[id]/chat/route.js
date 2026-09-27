import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockChatMessages, mockMembers, isUsingPlaceholder } from '@/lib/mockStore';

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// GET: Fetch chat messages and polls for a trip
export async function GET(request, { params }) {
  const { id: tripId } = params;

  if (isUsingPlaceholder() || !isUuid(tripId)) {
    const rawMessages = mockChatMessages.filter(m => m.trip_id === tripId);
    const messages = rawMessages.map(m => {
      const sender = mockMembers.find(mem => mem.id === m.sender_id);
      return {
        ...m,
        sender_name: m.sender_name || sender?.display_name || (m.poll_data?.paid_by) || 'Traveler'
      };
    });
    return NextResponse.json({ success: true, messages });
  }

  try {
    const supabase = createAdminClient();
    const { data: rawMessages, error } = await supabase
      .from('chat_messages')
      .select('*, trip_members(id, display_name)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Normalize sender_name from joined trip_members or poll_data
    const messages = (rawMessages || []).map(m => {
      const resolvedName = m.trip_members?.display_name 
        || m.sender_name 
        || m.poll_data?.paid_by 
        || 'Traveler';

      return {
        ...m,
        sender_name: resolvedName
      };
    });

    return NextResponse.json({ success: true, messages });
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

    if (isUsingPlaceholder() || !isUuid(tripId)) {
      const sender = mockMembers.find(m => m.id === senderMemberId || m.user_id === senderMemberId);
      const newMsg = {
        id: 'chat-' + Date.now(),
        trip_id: tripId,
        sender_id: sender?.id || senderMemberId,
        sender_name: sender?.display_name || 'Traveler',
        message_type: 'text',
        content,
        created_at: new Date().toISOString()
      };
      mockChatMessages.push(newMsg);
      return NextResponse.json({ success: true, message: newMsg });
    }

    const supabase = createAdminClient();
    
    // Resolve sender member ID and display name from trip_members
    let memberId = senderMemberId;
    let senderName = 'Traveler';

    const { data: memberById } = await supabase
      .from('trip_members')
      .select('id, display_name')
      .eq('id', senderMemberId)
      .maybeSingle();

    if (memberById) {
      memberId = memberById.id;
      senderName = memberById.display_name;
    } else {
      const { data: memberByUser } = await supabase
        .from('trip_members')
        .select('id, display_name')
        .eq('trip_id', tripId)
        .eq('user_id', senderMemberId)
        .maybeSingle();
      if (memberByUser) {
        memberId = memberByUser.id;
        senderName = memberByUser.display_name;
      }
    }

    const { data: newMsg, error } = await supabase
      .from('chat_messages')
      .insert({
        trip_id: tripId,
        sender_id: memberId,
        message_type: 'text',
        content
      })
      .select('*, trip_members(id, display_name)')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: {
        ...newMsg,
        sender_name: newMsg.trip_members?.display_name || senderName
      }
    });
  } catch (error) {
    console.error('Send chat error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
