/**
 * Location parsing and destination landmark coordinates helper.
 * Parses Google Maps links, raw lat/lon coordinates, and known landmarks for map drop pins.
 */

export const KNOWN_LANDMARKS = {
  // Goa
  'fisherman': { lat: 15.1587, lon: 73.9514, name: "Fisherman's Wharf, Salcete" },
  'baga': { lat: 15.5524, lon: 73.7517, name: 'Baga Beach, North Goa' },
  'calangute': { lat: 15.5440, lon: 73.7553, name: 'Calangute Beach' },
  'candolim': { lat: 15.5173, lon: 73.7629, name: 'Candolim Beach' },
  'aguada': { lat: 15.4989, lon: 73.7733, name: 'Taj Fort Aguada & Light House' },
  'taj': { lat: 15.4989, lon: 73.7733, name: 'Taj Fort Aguada Resort' },
  'anjuna': { lat: 15.5733, lon: 73.7411, name: 'Anjuna Beach & Flea Market' },
  'vagator': { lat: 15.5983, lon: 73.7389, name: 'Vagator Beach & Chapora' },
  'panjim': { lat: 15.4909, lon: 73.8278, name: 'Panjim Promenade' },
  'panaji': { lat: 15.4909, lon: 73.8278, name: 'Panaji Latin Quarter' },
  'pooja': { lat: 15.5480, lon: 73.7620, name: 'Pooja Fashions, Calangute' },
  'scuba': { lat: 15.3620, lon: 73.7680, name: 'Grand Island Scuba Dive Site' },
  'zuari': { lat: 15.3800, lon: 73.8310, name: 'Zuari River Corridor' },
  'cab': { lat: 15.4200, lon: 73.8100, name: 'Goa Coastal Transit Corridor' },
  'lunch': { lat: 15.5460, lon: 73.7580, name: 'Beachside Bistro, Calangute' },
  'dinner': { lat: 15.1587, lon: 73.9514, name: "Fisherman's Wharf" },
  'villa': { lat: 15.5350, lon: 73.7600, name: 'Luxury 4BHK Beachfront Villa' },
  // General destinations
  'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
  'delhi': { lat: 28.6139, lon: 77.2090, name: 'Delhi' },
  'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bangalore' },
  'manali': { lat: 32.2432, lon: 77.1892, name: 'Manali, Solang Valley' }
};

/**
 * Extracts latitude and longitude from raw strings or Google Maps URLs
 */
export function parseCoordinates(inputStr) {
  if (!inputStr || typeof inputStr !== 'string') return null;
  const str = inputStr.trim();

  // 1. Raw Lat, Lon: e.g. "15.5524, 73.7517" or "15.5524,73.7517"
  const rawMatch = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lon = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  // 2. Google Maps URL with @lat,lon: e.g. https://www.google.com/maps/.../@15.5524,73.7517,17z
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lon = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  // 3. Google Maps query parameter: ?q=15.5524,73.7517
  const qMatch = str.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lon = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
  }

  return null;
}

/**
 * Resolves location details from user inputs or matching text
 */
export function resolveSpotLocation({ locationName, locationCoordsOrUrl, title = '', destination = 'Goa' }) {
  // If coordinates or Google Maps URL provided, parse it
  const parsed = parseCoordinates(locationCoordsOrUrl);
  if (parsed) {
    return {
      lat: parsed.lat,
      lon: parsed.lon,
      name: locationName || title || 'Custom Visited Spot',
      isExact: true
    };
  }

  // Match known landmarks by name or title
  const searchStr = `${locationName || ''} ${title || ''}`.toLowerCase();
  for (const [key, landmark] of Object.entries(KNOWN_LANDMARKS)) {
    if (searchStr.includes(key)) {
      return {
        lat: landmark.lat,
        lon: landmark.lon,
        name: locationName || landmark.name,
        isExact: false
      };
    }
  }

  // Default fallback to destination coordinate
  const destKey = (destination || 'goa').toLowerCase();
  for (const [key, landmark] of Object.entries(KNOWN_LANDMARKS)) {
    if (destKey.includes(key)) {
      return {
        lat: landmark.lat,
        lon: landmark.lon,
        name: locationName || title || landmark.name,
        isExact: false
      };
    }
  }

  return {
    lat: 15.2993,
    lon: 74.1240,
    name: locationName || title || 'Goa',
    isExact: false
  };
}
