import { NextResponse } from 'next/server';
import { parseNaturalLanguageExpense } from '@/lib/services/aiParser';

export async function POST(request) {
  try {
    const { text, members = [], currentMemberId = null } = await request.json();

    if (!text) {
      return NextResponse.json({ success: false, error: 'Text prompt required' }, { status: 400 });
    }

    const parsed = await parseNaturalLanguageExpense(text, members, currentMemberId);
    return NextResponse.json({ success: true, parsed });
  } catch (error) {
    console.error('AI parse expense error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
