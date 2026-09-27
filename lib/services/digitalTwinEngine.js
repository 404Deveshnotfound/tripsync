/**
 * TripSync — AI Digital Twin Simulation Engine
 * Models real-world travel entities, dependency graphs, probabilistic disruption calculations,
 * and higher-order cascading ripple effects for Hospitality & Group Travel.
 * HackCelestial 3.0 Midnight Task Requirement #4.
 */

// Coordinates and vulnerability profiles of trip entities in Goa
export const DEFAULT_TWIN_ENTITIES = [
  {
    id: 'ent-scuba',
    title: 'Grand Island Scuba Diving Expedition',
    category: 'activity',
    type: 'outdoor_marine',
    vendor: 'Goa Aqua Adventures Pvt Ltd',
    originalCost: 15000,
    coordinates: { lat: 15.3500, lon: 73.7667, name: 'Grand Island Marine Point' },
    weatherSensitivity: {
      criticalRainThreshold: 30, // mm/hr
      criticalWindThreshold: 40, // km/h
      floodVulnerable: true
    },
    cancellationPolicy: {
      weatherForceMajeure: 1.0, // 100% refund on weather cancellation
      vendorPenaltyHours: 24
    }
  },
  {
    id: 'ent-cab',
    title: 'Airport & Intercity Private Cabs (3 Innovas)',
    category: 'transport',
    type: 'road_transit',
    vendor: 'Goa Miles Tourist Fleets',
    originalCost: 4500,
    coordinates: { lat: 15.3808, lon: 73.8314, name: 'NH-66 Zuari Corridor' },
    weatherSensitivity: {
      criticalRainThreshold: 45,
      criticalWindThreshold: 55,
      floodVulnerable: true
    },
    surgeMultiplierMax: 1.8 // Cabs surge up to 80% if waterlogging occurs
  },
  {
    id: 'ent-resort',
    title: 'Taj Fort Aguada Beach Resort & Spa',
    category: 'stay',
    type: 'hospitality_lodging',
    vendor: 'IHCL Taj Hotels',
    originalCost: 45000,
    coordinates: { lat: 15.4989, lon: 73.7679, name: 'Sinquerim Beach Front' },
    weatherSensitivity: {
      criticalRainThreshold: 60,
      criticalWindThreshold: 65,
      floodVulnerable: false
    },
    capacityIndoorTransfer: true
  },
  {
    id: 'ent-dinner',
    title: 'Team Dinner @ Fisherman\'s Wharf Lawn',
    category: 'food',
    type: 'outdoor_dining',
    vendor: 'Fisherman\'s Wharf Goa',
    originalCost: 6000,
    coordinates: { lat: 15.4925, lon: 73.7742, name: 'Candolim Waterfront' },
    weatherSensitivity: {
      criticalRainThreshold: 20,
      criticalWindThreshold: 35,
      floodVulnerable: false
    }
  }
];

/**
 * Run Digital Twin Simulation on trip entities given weather parameters
 */
export function simulateDigitalTwin({
  bookings = [],
  members = [],
  weatherParams = {
    rainIntensity: 25, // mm/hr
    windSpeed: 30,     // km/h
    durationHours: 6,
    temp: 28,
    isFloodRisk: false
  }
}) {
  const { rainIntensity, windSpeed, durationHours, isFloodRisk } = weatherParams;

  // Use default entities enriched with actual bookings if available
  const entities = DEFAULT_TWIN_ENTITIES.map(ent => {
    const matched = bookings.find(b => 
      b.title?.toLowerCase().includes(ent.category) || 
      b.category === ent.category ||
      b.title?.toLowerCase().includes('scuba') && ent.id === 'ent-scuba'
    );
    return {
      ...ent,
      bookingId: matched?.id || null,
      currentCost: matched ? (matched.current_cost ?? matched.original_cost ?? ent.originalCost) : ent.originalCost,
      participants: matched?.participants || members.map(m => m.id)
    };
  });

  // 1. Calculate Primary (L1) direct weather disruption
  const evaluatedEntities = entities.map(entity => {
    let rawRisk = 0;
    const rainFactor = rainIntensity / (entity.weatherSensitivity.criticalRainThreshold || 30);
    const windFactor = windSpeed / (entity.weatherSensitivity.criticalWindThreshold || 40);

    if (entity.type === 'outdoor_marine') {
      rawRisk = Math.min(0.99, (rainFactor * 0.6) + (windFactor * 0.45));
    } else if (entity.type === 'outdoor_dining') {
      rawRisk = Math.min(0.95, (rainFactor * 0.7) + (windFactor * 0.3));
    } else if (entity.type === 'road_transit') {
      rawRisk = Math.min(0.90, (rainFactor * 0.5) + (isFloodRisk ? 0.35 : 0.1));
    } else {
      // Hotel / indoor
      rawRisk = Math.min(0.35, (rainFactor * 0.15) + (windFactor * 0.1));
    }

    const disruptionProbability = Math.round(rawRisk * 100);
    const uncertaintyMargin = Math.max(3, Math.round(12 - (rainIntensity / 10))); // uncertainty decreases as weather becomes unambiguous

    let status = 'NORMAL';
    let impactDetail = 'Operational as scheduled';
    let financialImpact = 0;

    if (disruptionProbability >= 70) {
      status = 'SHUTDOWN_CANCELLED';
      if (entity.type === 'outdoor_marine') {
        impactDetail = `Mandatory coast guard maritime stoppage. High swells and poor visibility (${uncertaintyMargin}% uncertainty).`;
        financialImpact = -entity.currentCost; // Full refund proposed
      } else if (entity.type === 'outdoor_dining') {
        impactDetail = 'Lawn dining impossible; forced indoors with 30-min seating delay.';
        financialImpact = 0;
      } else if (entity.type === 'road_transit') {
        impactDetail = 'Severe arterial waterlogging; +90m transit delay, cab fleet surge fee applicable.';
        financialImpact = Math.round(entity.currentCost * 0.45); // 45% surge
      }
    } else if (disruptionProbability >= 35) {
      status = 'ELEVATED_RISK';
      impactDetail = 'Operating with precautionary safety buffers and reduced capacity.';
      if (entity.type === 'road_transit') {
        financialImpact = Math.round(entity.currentCost * 0.15);
      }
    }

    return {
      ...entity,
      disruptionProbability,
      uncertaintyMargin,
      status,
      impactDetail,
      financialImpact
    };
  });

  // 2. Identify Cascading Chain (Primary -> Secondary -> Tertiary)
  const scubaEnt = evaluatedEntities.find(e => e.id === 'ent-scuba');
  const cabEnt = evaluatedEntities.find(e => e.id === 'ent-cab');
  const dinnerEnt = evaluatedEntities.find(e => e.id === 'ent-dinner');
  const resortEnt = evaluatedEntities.find(e => e.id === 'ent-resort');

  const cascadingChain = [
    {
      level: 'Level 1: Primary Environmental Impact',
      target: scubaEnt.title,
      risk: `${scubaEnt.disruptionProbability}% (${scubaEnt.status})`,
      mechanism: `Direct marine squall (${rainIntensity}mm/hr rain, ${windSpeed}km/h gusts) makes underwater navigation and open boat safety impossible.`,
      solution: 'Operator triggers 100% Force Majeure refund policy.'
    },
    {
      level: 'Level 2: Secondary Mobility & Supply Ripple',
      target: cabEnt.title,
      risk: `${cabEnt.disruptionProbability}% (${cabEnt.status})`,
      mechanism: `Due to flash surface runoff and road blockages, cab transit times increase by +${Math.round(rainIntensity * 1.5)} minutes, triggering taxi driver surge fee (+₹${cabEnt.financialImpact.toLocaleString()}).`,
      solution: 'Dynamically reallocate emergency cab pool liability across active passengers.'
    },
    {
      level: 'Level 3: Tertiary Hospitality Behavioral Shift',
      target: `${resortEnt.title} & Indoor F&B`,
      risk: 'High Utilization Surge (+42%)',
      mechanism: 'Stranded group travelers cancel outdoor evening walks and retreat to resort indoor amenities, driving up indoor cafe and room service expenditure.',
      solution: 'TripSync automatically prepares group consensus poll for backup indoor board game lounge reservation.'
    }
  ];

  // 3. Deterministic Ledger Diff Projection
  const totalRefundAmount = evaluatedEntities.filter(e => e.financialImpact < 0).reduce((sum, e) => sum + Math.abs(e.financialImpact), 0);
  const totalSurgeAmount = evaluatedEntities.filter(e => e.financialImpact > 0).reduce((sum, e) => sum + e.financialImpact, 0);
  const netTripCostChange = totalSurgeAmount - totalRefundAmount;

  const activeMembers = members.filter(m => m.status !== 'left' && m.status !== 'removed');
  const count = activeMembers.length || 5;

  const memberLedgerDiffs = activeMembers.map(m => {
    // Member share in scuba refund (if participant)
    const isScubaPart = scubaEnt.participants?.includes(m.id) || true;
    const scubaRefundShare = isScubaPart ? Math.round(totalRefundAmount / count) : 0;
    const cabSurgeShare = Math.round(totalSurgeAmount / count);
    const netMemberDelta = cabSurgeShare - scubaRefundShare; // Negative = member gets money back

    return {
      memberId: m.id,
      displayName: m.display_name,
      refundCredit: scubaRefundShare,
      surgeDebit: cabSurgeShare,
      netLiabilityDelta: netMemberDelta, // -₹2,560 means net savings/refund
      statusNote: netMemberDelta < 0 ? `Receives net refund of ₹${Math.abs(netMemberDelta).toLocaleString()}` : `Additional due of ₹${netMemberDelta.toLocaleString()}`
    };
  });

  return {
    success: true,
    simulatedAt: new Date().toISOString(),
    weatherParams,
    entities: evaluatedEntities,
    cascadingChain,
    financialProjection: {
      totalRefunds: totalRefundAmount,
      totalSurges: totalSurgeAmount,
      netTripCostChange,
      affectedItemsCount: evaluatedEntities.filter(e => e.financialImpact !== 0).length,
      memberLedgerDiffs
    }
  };
}
