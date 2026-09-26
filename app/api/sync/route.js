import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  mockTrips, 
  mockMembers, 
  mockBookings, 
  mockExpenses, 
  mockAuditLogs, 
  isUsingPlaceholder 
} from '@/lib/mockStore';
import { calculateSplit, round2 } from '@/lib/services/splitEngine';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

export async function POST(request) {
  try {
    const { expenses = [] } = await request.json();

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to sync' });
    }

    // Process each offline expense
    if (isUsingPlaceholder()) {
      for (const item of expenses) {
        const cost = round2(item.totalAmount);
        const allocations = calculateSplit({
          method: item.splitMethod || 'equal',
          totalAmount: cost,
          selectedMemberIds: item.participantMemberIds || item.selectedMemberIds,
          customMap: item.customMap || {}
        });

        const newExp = {
          id: 'exp-sync-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          trip_id: item.tripId,
          title: item.title,
          category: item.category || 'other',
          total_amount: cost,
          paid_by_member_id: item.paidByMemberId,
          date: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          split_method: item.splitMethod || 'equal',
          allocations,
          verification_status: item.proofType === 'no_proof' ? 'pending_verification' : 'verified',
          proof_type: item.proofType || 'no_proof',
          proof_url: item.proofUrl || null,
          extracted_details: item.extractedDetails || null,
          local_offline_id: item.localId,
          created_at: item.createdAt || new Date().toISOString()
        };

        mockExpenses.push(newExp);
      }

      return NextResponse.json({
        success: true,
        syncedCount: expenses.length
      });
    }

    // Live Supabase Batch Ingestion
    const supabase = createAdminClient();

    for (const item of expenses) {
      const cost = round2(item.totalAmount);
      const allocations = calculateSplit({
        method: item.splitMethod || 'equal',
        totalAmount: cost,
        selectedMemberIds: item.participantMemberIds || item.selectedMemberIds,
        customMap: item.customMap || {}
      });

      await supabase
        .from('expenses')
        .insert({
          trip_id: item.tripId,
          title: item.title,
          category: item.category || 'other',
          total_amount: cost,
          paid_by_member_id: item.paidByMemberId,
          date: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          split_method: item.splitMethod || 'equal',
          allocations,
          verification_status: item.proofType === 'no_proof' ? 'pending_verification' : 'verified',
          proof_type: item.proofType || 'no_proof',
          proof_url: item.proofUrl,
          extracted_details: item.extractedDetails,
          local_offline_id: item.localId
        });
    }

    return NextResponse.json({
      success: true,
      syncedCount: expenses.length
    });
  } catch (error) {
    console.error('Batch offline sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
