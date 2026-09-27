import { NextResponse } from 'next/server';
import { 
  mockTrips, 
  mockBookings, 
  mockMembers, 
  mockAuditLogs, 
  mockExpenses
} from '@/lib/mockStore';
import { aggregateLedger } from '@/lib/services/ledgerAggregator';

export async function POST(request, { params }) {
  try {
    const { id: tripId } = params;
    const body = await request.json();
    const { 
      weatherScenario = 'Torrential Squall & Coastal Flood', 
      totalRefund = 15000, 
      totalSurge = 2025,
      performedByMemberId = null 
    } = body;

    const trip = mockTrips.find(t => t.id === tripId);
    const members = mockMembers.filter(m => m.trip_id === tripId);
    const bookings = mockBookings.filter(b => b.trip_id === tripId);

    // Find the scuba booking or outdoor activity to adjust
    const scubaBooking = bookings.find(b => 
      b.title.toLowerCase().includes('scuba') || 
      b.category === 'activity'
    );

    const oldCost = scubaBooking ? (scubaBooking.current_cost ?? scubaBooking.original_cost) : 15000;
    const newCost = 0; // Cancelled with 100% weather refund

    if (scubaBooking) {
      scubaBooking.status = 'cancelled_weather_refund';
      scubaBooking.current_cost = 0;
      scubaBooking.weather_refund_applied = true;
    }

    // Add emergency cab surge expense
    const surgeExpId = `exp-weather-surge-${Date.now()}`;
    const payer = members[0] || { id: 'm1', display_name: 'Rahul Sharma' };
    
    mockExpenses.push({
      id: surgeExpId,
      trip_id: tripId,
      title: `⚡ Emergency Cab Fleet Weather Surcharge (${weatherScenario})`,
      category: 'transport',
      total_amount: Number(totalSurge),
      paid_by_member_id: payer.id,
      paid_by_name: payer.display_name,
      split_type: 'equal',
      split_allocations: members.map(m => ({ memberId: m.id, amount: Math.round(Number(totalSurge) / (members.length || 1)) })),
      proof_type: 'no_proof',
      verification_status: 'verified',
      notes: 'Automated Digital Twin weather contingency allocation via Nugen Aligned Intelligence',
      created_at: new Date().toISOString()
    });

    // Record formal audit log
    const auditId = `audit-twin-${Date.now()}`;
    const auditEntry = {
      id: auditId,
      trip_id: tripId,
      action: 'digital_twin_weather_contingency',
      affected_item_id: scubaBooking?.id || 'weather-contingency',
      affected_item_title: scubaBooking?.title || 'Grand Island Scuba Diving & Cabs',
      performed_by_member_id: performedByMemberId || payer.id,
      snapshot_before: {
        perPersonCost: Math.round(oldCost / (members.length || 1)),
        totalCost: oldCost,
        activeCount: members.length
      },
      snapshot_after: {
        perPersonCost: Math.round(Number(totalSurge) / (members.length || 1)),
        totalCost: Number(totalSurge),
        activeCount: members.length
      },
      impact_summary: `Weather Digital Twin triggered Force Majeure refund of ₹${Number(totalRefund).toLocaleString()} on outdoor activity and absorbed cab surge of ₹${Number(totalSurge).toLocaleString()}. Net savings ₹${(Number(totalRefund) - Number(totalSurge)).toLocaleString()} credited across group.`,
      description: `Weather Digital Twin Contingency executed: ${weatherScenario}`,
      created_at: new Date().toISOString()
    };

    mockAuditLogs.unshift(auditEntry);

    // Recalculate deterministic ledger
    const updatedLedger = aggregateLedger({ 
      members, 
      bookings: mockBookings.filter(b => b.trip_id === tripId), 
      expenses: mockExpenses.filter(e => e.trip_id === tripId) 
    });

    return NextResponse.json({
      success: true,
      message: 'Weather Digital Twin Contingency successfully applied to TripSync living ledger!',
      auditEntry,
      ledger: updatedLedger
    });
  } catch (err) {
    console.error('Digital Twin Apply Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
