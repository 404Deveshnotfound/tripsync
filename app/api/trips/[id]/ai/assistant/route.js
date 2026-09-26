import { NextResponse } from 'next/server';
import { answerFinanceQuestion } from '@/lib/services/aiAssistant';

export async function POST(request) {
  try {
    const { 
      query, 
      ledger, 
      bookings = [], 
      expenses = [], 
      members = [], 
      auditLogs = [] 
    } = await request.json();

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query required' }, { status: 400 });
    }

    const answer = answerFinanceQuestion({
      query,
      ledger,
      bookings,
      expenses,
      members,
      auditLogs
    });

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error('AI assistant error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
