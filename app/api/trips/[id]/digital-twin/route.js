import { NextResponse } from 'next/server';
import { fetchLiveWeather } from '@/lib/services/weatherService';
import { generateSocialSignals } from '@/lib/services/socialSignals';
import { simulateDigitalTwin } from '@/lib/services/digitalTwinEngine';
import { generateWeatherAdvisory } from '@/lib/services/weatherAdvisoryAi';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockTrips, mockBookings, mockMembers, mockExpenses, isUsingPlaceholder } from '@/lib/mockStore';

function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Helper to load trip context and expenses
async function getTripContext(tripId) {
  if (isUsingPlaceholder() || !isUuid(tripId)) {
    const trip = mockTrips.find(t => t.id === tripId) || { id: tripId, title: 'Goa Adventure 2026', destination: 'Goa, India' };
    const bookings = mockBookings.filter(b => b.trip_id === tripId);
    const members = mockMembers.filter(m => m.trip_id === tripId);
    const expenses = mockExpenses.filter(e => e.trip_id === tripId);
    return { trip, bookings, members, expenses };
  }

  try {
    const supabase = createAdminClient();
    const { data: trip } = await supabase.from('trips').select('*').eq('id', tripId).single();
    const { data: members } = await supabase.from('trip_members').select('*').eq('trip_id', tripId);
    const { data: bookings } = await supabase.from('bookings').select('*').eq('trip_id', tripId);
    const { data: expenses } = await supabase.from('expenses').select('*').eq('trip_id', tripId);

    return {
      trip: trip || { id: tripId, title: 'Goa Adventure 2026', destination: 'Goa, India' },
      bookings: bookings || [],
      members: members || [],
      expenses: expenses || []
    };
  } catch (err) {
    console.warn('Error fetching trip context for digital twin, falling back:', err.message);
    const trip = mockTrips.find(t => t.id === tripId) || { id: tripId, title: 'Goa Adventure 2026', destination: 'Goa, India' };
    const bookings = mockBookings.filter(b => b.trip_id === tripId);
    const members = mockMembers.filter(m => m.trip_id === tripId);
    const expenses = mockExpenses.filter(e => e.trip_id === tripId);
    return { trip, bookings, members, expenses };
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { trip, bookings, members, expenses } = await getTripContext(id);

    // 1. Fetch live real-time weather from Open-Meteo API
    const liveWeather = await fetchLiveWeather(trip.destination || 'Goa');

    // 2. Extract visited spots from expenses & bookings
    const visitedSpots = [];
    const seen = new Set();

    expenses.forEach(e => {
      const name = e.extracted_details?.locationName || e.vendor_name || e.title;
      if (name && !seen.has(name)) {
        seen.add(name);
        visitedSpots.push({
          name,
          category: e.category || 'expense',
          coordinates: e.extracted_details?.coordinates ? `${e.extracted_details.coordinates.lat}, ${e.extracted_details.coordinates.lon}` : undefined
        });
      }
    });

    bookings.forEach(b => {
      const name = b.vendor_name || b.title;
      if (name && !seen.has(name)) {
        seen.add(name);
        visitedSpots.push({
          name,
          category: b.category || 'stay'
        });
      }
    });

    // 3. Generate matching Social Signals
    const socialData = await generateSocialSignals({
      destination: trip.destination || 'Goa',
      rainIntensity: liveWeather.current.precipitation || 0,
      alertLevel: liveWeather.current.alertLevel
    });

    // 4. Run baseline Digital Twin Simulation using live weather
    const precip = liveWeather.current.precipitation || 0;
    const wind = liveWeather.current.windSpeed || 15;
    const isBadWeather = precip > 15 || wind > 35;

    const simulation = simulateDigitalTwin({
      bookings,
      members,
      weatherParams: {
        rainIntensity: precip,
        windSpeed: wind,
        durationHours: 6,
        temp: liveWeather.current.temperature || 28.5,
        isFloodRisk: precip > 30
      }
    });

    // 5. Generate AI Weather Disruption Advisory (Google Gemini / Groq)
    const advisoryRes = await generateWeatherAdvisory({
      tripTitle: trip.title,
      destination: trip.destination,
      visitedSpots,
      weatherData: {
        isSimulated: false,
        rainfall: precip,
        windSpeed: wind,
        quality: isBadWeather ? 'Severe' : precip > 5 ? 'Moderate' : 'Optimal',
        isBadWeather
      }
    });

    return NextResponse.json({
      success: true,
      destination: trip.destination || 'Goa, India',
      liveWeather,
      socialData,
      simulation,
      advisory: advisoryRes.answer,
      advisorySource: advisoryRes.source
    });
  } catch (err) {
    console.error('Digital Twin GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { weatherParams = {}, visitedSpots: clientSpots = [] } = body;

    const { trip, bookings, members, expenses } = await getTripContext(id);

    const rainIntensity = Number(weatherParams.rainIntensity ?? 24);
    const windSpeed = Number(weatherParams.windSpeed ?? 32);
    const isFloodRisk = Boolean(weatherParams.isFloodRisk || rainIntensity > 40);
    const isBadWeather = rainIntensity > 15 || windSpeed > 35;

    // 1. Run deterministic Digital Twin Simulation
    const simulation = simulateDigitalTwin({
      bookings,
      members,
      weatherParams: {
        rainIntensity,
        windSpeed,
        durationHours: Number(weatherParams.durationHours ?? 6),
        temp: Number(weatherParams.temp ?? 27.5),
        isFloodRisk
      }
    });

    // 2. Generate matching Social Signals
    const socialData = await generateSocialSignals({
      destination: trip.destination || 'Goa',
      rainIntensity,
      alertLevel: weatherParams.alertLevel || (rainIntensity > 50 ? 'CRITICAL RED ALERT' : rainIntensity > 20 ? 'AMBER ADVISORY' : 'NORMAL')
    });

    // 3. Compile spots list
    const spotsToUse = clientSpots.length > 0 ? clientSpots : expenses.map(e => ({
      name: e.extracted_details?.locationName || e.vendor_name || e.title,
      category: e.category,
      coordinates: e.extracted_details?.coordinates ? `${e.extracted_details.coordinates.lat}, ${e.extracted_details.coordinates.lon}` : undefined
    }));

    // 4. Generate AI Weather Disruption Advisory (Google Gemini / Groq)
    const advisoryRes = await generateWeatherAdvisory({
      tripTitle: trip.title,
      destination: trip.destination,
      visitedSpots: spotsToUse,
      weatherData: {
        isSimulated: true,
        rainfall: rainIntensity,
        windSpeed,
        quality: isBadWeather ? 'Severe' : rainIntensity > 5 ? 'Moderate' : 'Optimal',
        isBadWeather
      }
    });

    return NextResponse.json({
      success: true,
      simulation,
      socialData,
      advisory: advisoryRes.answer,
      advisorySource: advisoryRes.source
    });
  } catch (err) {
    console.error('Digital Twin POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
