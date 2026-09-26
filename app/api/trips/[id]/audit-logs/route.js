import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAuditLogs, isUsingPlaceholder } from '@/lib/mockStore';

// GET: Fetch audit logs for a trip
export async function GET(request, { params }) {
  const { id: tripId } = params;

  if (isUsingPlaceholder()) {
    const logs = mockAuditLogs.filter(l => l.trip_id === tripId);
    return NextResponse.json({ success: true, auditLogs: logs });
  }

  try {
    const supabase = createAdminClient();
    const { data: logs, error } = await supabase
      .from('ledger_audit_logs')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, auditLogs: logs || [] });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
