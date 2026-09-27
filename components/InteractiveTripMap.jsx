'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, ZoomIn, ZoomOut, Navigation, ExternalLink, Building, Utensils, Waves, Car, ShoppingBag, Sparkles } from 'lucide-react';
import { resolveSpotLocation } from '@/lib/services/locationHelper';

const categoryIcons = {
  hotel: '🏨',
  stay: '🏨',
  meal: '🍽️',
  food: '🍽️',
  restaurant: '🍽️',
  activity: '🤿',
  watersports: '🏄',
  cab: '🚖',
  transport: '🚖',
  flight: '✈️',
  shopping: '🛍️',
  other: '📍'
};

export default function InteractiveTripMap({
  expenses = [],
  bookings = [],
  destination = 'Goa',
  onSpotSelect
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const tileLayerRef = useRef(null);

  const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'streets'
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [spots, setSpots] = useState([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Compile all spots from expenses and bookings
  useEffect(() => {
    const list = [];
    const seen = new Set();

    // Process Bookings (e.g. Villa stay)
    bookings.forEach(b => {
      const locName = b.vendor_name || b.title;
      const resolved = resolveSpotLocation({
        locationName: locName,
        title: b.title,
        destination
      });

      const key = `${resolved.lat.toFixed(4)},${resolved.lon.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: b.id || 'book-' + list.length,
          title: b.title,
          venueName: locName,
          category: b.category || 'stay',
          lat: resolved.lat,
          lon: resolved.lon,
          amount: Number(b.current_cost ?? b.original_cost ?? 0),
          isBooking: true,
          type: 'Booking / Stay'
        });
      }
    });

    // Process Expenses (e.g. Meals, Scuba, Shopping)
    expenses.forEach(e => {
      const locName = e.extracted_details?.locationName || e.vendor_name || e.title;
      const coordsInput = e.extracted_details?.locationCoords || e.extracted_details?.coordinates;

      const resolved = resolveSpotLocation({
        locationName: locName,
        locationCoordsOrUrl: typeof coordsInput === 'string' ? coordsInput : undefined,
        title: e.title,
        destination
      });

      // Override if explicit coordinates object was saved
      const lat = e.extracted_details?.coordinates?.lat || resolved.lat;
      const lon = e.extracted_details?.coordinates?.lon || resolved.lon;

      const key = `${lat.toFixed(4)},${lon.toFixed(4)}-${e.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: e.id,
          title: e.title,
          venueName: locName,
          category: e.category || 'other',
          lat,
          lon,
          amount: Number(e.total_amount || 0),
          isBooking: false,
          type: 'Expense'
        });
      }
    });

    // If list is empty, supply default destination landmarks
    if (list.length === 0) {
      list.push(
        { id: 'spot-1', title: "Fisherman's Wharf", venueName: "Fisherman's Wharf, Salcete", category: 'meal', lat: 15.1587, lon: 73.9514, amount: 3500 },
        { id: 'spot-2', title: "Baga Beach Watersports", venueName: "Baga Beach", category: 'activity', lat: 15.5524, lon: 73.7517, amount: 4200 },
        { id: 'spot-3', title: "Taj Fort Aguada", venueName: "Fort Aguada & Lighthouse", category: 'stay', lat: 15.4989, lon: 73.7733, amount: 45000 },
        { id: 'spot-4', title: "Calangute Promenade", venueName: "Pooja Fashions, Calangute", category: 'shopping', lat: 15.5480, lon: 73.7620, amount: 2500 }
      );
    }

    setSpots(list);
  }, [expenses, bookings, destination]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    let map = null;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Clean up existing instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center: Goa / spots center
      const centerLat = spots.length > 0 ? spots[0].lat : 15.40;
      const centerLon = spots.length > 0 ? spots[0].lon : 73.85;

      map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 11,
        zoomControl: false, // We'll render custom top-quality zoom controls
        attributionControl: false
      });

      // Define Tile Layers
      const satelliteTile = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      const streetsTile = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      );

      // Add default tile
      if (mapType === 'satellite') {
        satelliteTile.addTo(map);
        tileLayerRef.current = satelliteTile;
      } else {
        streetsTile.addTo(map);
        tileLayerRef.current = streetsTile;
      }

      mapInstanceRef.current = map;
      setIsMapReady(true);

      // Render Drop Pins
      renderMarkers(L, map, spots);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [spots.length]);

  // 3. Handle Switch between Satellite and Street View
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = mapInstanceRef.current;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      let newTile;
      if (mapType === 'satellite') {
        newTile = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        );
      } else {
        newTile = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { maxZoom: 19 }
        );
      }
      newTile.addTo(map);
      tileLayerRef.current = newTile;
    });
  }, [mapType]);

  // 4. Render interactive markers
  const renderMarkers = (L, map, spotList) => {
    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const bounds = L.latLngBounds();

    spotList.forEach((spot) => {
      bounds.extend([spot.lat, spot.lon]);
      const iconEmoji = categoryIcons[spot.category] || '📍';

      // Custom HTML Pin Marker with Pulse
      const pinHtml = `
        <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full">
          <div class="w-8 h-8 rounded-full bg-slate-900/90 border-2 border-indigo-400 shadow-xl flex items-center justify-center text-sm transform transition hover:scale-125">
            ${iconEmoji}
          </div>
          <div class="w-2.5 h-2.5 bg-indigo-500 rounded-full mx-auto -mt-1 shadow-md"></div>
          <div class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-slate-900 animate-ping"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-drop-pin',
        html: pinHtml,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -36]
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 180px; padding: 4px;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 2px;">${spot.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">📍 ${spot.venueName || spot.title}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px; border-top: 1px solid #e2e8f0;">
            <span style="font-weight: 700; color: #4f46e5;">₹${spot.amount.toLocaleString()}</span>
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; background: #e0e7ff; color: #3730a3; padding: 1px 6px; rounded: 4px;">${spot.category}</span>
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lon}" target="_blank" rel="noreferrer" style="display: block; text-align: center; margin-top: 6px; padding: 4px 6px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 10px; font-weight: 700;">
            Open in Google Maps ↗
          </a>
        </div>
      `;

      const marker = L.marker([spot.lat, spot.lon], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedSpot(spot);
        if (onSpotSelect) onSpotSelect(spot);
      });

      markersRef.current.push(marker);
    });

    if (spotList.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const flyToSpot = (spot) => {
    setSelectedSpot(spot);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lon], 14, { duration: 1.2 });
      // Find marker and open popup
      const marker = markersRef.current.find(m => {
        const pos = m.getLatLng();
        return Math.abs(pos.lat - spot.lat) < 0.001 && Math.abs(pos.lng - spot.lon) < 0.001;
      });
      if (marker) marker.openPopup();
    }
  };

  return (
    <div className="bg-[#101011] rounded-3xl border border-[#272526] p-6 shadow-sm space-y-4">
      
      {/* Header with Title & Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#f2eee5] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            Interactive Trip & Environmental Map
          </h3>
          <p className="text-xs text-[#9c9791]">
            Real satellite & street view showing visited venues, activity spots, and dining places plotted from expenses.
          </p>
        </div>

        {/* Map Type Switcher & Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Satellite vs Street Toggle */}
          <div className="flex items-center bg-[#151516] p-1 rounded-xl border border-[#272526]">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                mapType === 'satellite'
                  ? 'bg-[#101011] text-[#f2eee5] shadow-xs font-bold'
                  : 'text-[#9c9791] hover:text-[#f2eee5]'
              }`}
            >
              🛰️ Satellite
            </button>
            <button
              onClick={() => setMapType('streets')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                mapType === 'streets'
                  ? 'bg-[#9d1117] text-white shadow-xs font-bold'
                  : 'text-[#9c9791] hover:text-[#f2eee5]'
              }`}
            >
              🗺️ Streets
            </button>
          </div>

          {/* Custom Zoom Controls */}
          <div className="flex items-center bg-[#151516] rounded-xl border border-[#272526] overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-[#272526] text-[#d8c49d] transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[#272526]" />
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-[#272526] text-[#d8c49d] transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Actual Map Canvas */}
      <div className="relative w-full h-[450px] sm:h-[480px] rounded-2xl overflow-hidden border border-[#272526] shadow-inner bg-[#101011]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Satellite Watermark & Live Coordinates Indicator */}
        <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-3 text-[10px] text-[#9c9791] z-10 pointer-events-none">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {mapType === 'satellite' ? 'Esri High-Res Satellite' : 'OpenStreetMap Live'}
          </span>
          <span className="text-[#9c9791] font-mono">
            {spots.length} Plotted Venues
          </span>
        </div>
      </div>

      {/* Interactive Visited Spots Carousel / Quick Fly-To Bar */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-xs text-[#9c9791] mb-2 font-semibold">
          <span>Visited Spots from Expenses ({spots.length}):</span>
          <span className="text-[11px] text-[#d8c49d] font-normal">Click any spot to fly & inspect</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {spots.map((spot) => {
            const isSelected = selectedSpot?.id === spot.id;
            const iconEmoji = categoryIcons[spot.category] || '📍';
            return (
              <button
                key={spot.id}
                onClick={() => flyToSpot(spot)}
                className={`px-3 py-2 rounded-xl text-left border text-xs shrink-0 transition flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#9d1117]/10 border-[#9d1117] text-[#d8c49d] font-bold shadow-xs'
                    : 'bg-[#050505] border-[#272526] text-[#d8c49d] hover:bg-[#151516] hover:border-[#272526]'
                }`}
              >
                <span className="text-base">{iconEmoji}</span>
                <div>
                  <div className="truncate max-w-[130px] font-semibold">{spot.title}</div>
                  <div className="text-[10px] text-[#9c9791] font-mono">₹{spot.amount.toLocaleString()}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
