import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import L from 'leaflet';
import { api } from '../../lib/api.js';
import { haversineMeters, calculateBearing, bearingToCardinal, openExternalMaps } from '../../lib/geo.js';
import { formatTime, formatDate } from '../../lib/formatters.js';
import {
  MapPin,
  Navigation,
  Compass,
  Check,
  History,
  ExternalLink,
} from 'lucide-react';

export function ParkingPage({ vehicle }) {
  const queryClient = useQueryClient();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [currentGps, setCurrentGps] = useState(null);
  const [parkNote, setParkNote] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Fetch latest active spot & history
  const { data: latestSpot } = useQuery({
    queryKey: ['latestParking'],
    queryFn: async () => (await api.get('/parking/latest')).spot,
  });

  const { data: historySpots = [] } = useQuery({
    queryKey: ['parkingHistory'],
    queryFn: async () => (await api.get('/parking')).spots,
  });

  // Track user's live position for compass direction & distance calculation
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => console.warn('Live location error:', err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Leaflet map setup for latest spot
  useEffect(() => {
    if (!latestSpot || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const spotCoords = [latestSpot.latitude, latestSpot.longitude];
    const map = L.map(mapContainerRef.current, {
      center: spotCoords,
      zoom: 16,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Scooter parked pin
    L.circleMarker(spotCoords, {
      radius: 9,
      fillColor: '#06b6d4',
      color: '#ffffff',
      weight: 3,
      fillOpacity: 1,
    })
      .bindPopup(`<b>${vehicle?.nickname || 'Scooter'} Parked Here</b><br/>${latestSpot.note || ''}`)
      .addTo(map)
      .openPopup();

    // If user position is known, show user pin and fit both
    if (currentGps) {
      const userCoords = [currentGps.latitude, currentGps.longitude];
      L.circleMarker(userCoords, {
        radius: 7,
        fillColor: '#f59e0b',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      const bounds = L.latLngBounds([spotCoords, userCoords]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latestSpot, currentGps, vehicle]);

  // Mutations
  const parkMutation = useMutation({
    mutationFn: (data) => api.post('/parking', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestParking'] });
      queryClient.invalidateQueries({ queryKey: ['parkingHistory'] });
      setParkNote('');
      setIsLocating(false);
    },
    onError: (err) => {
      setGpsError(err.message || 'Failed to save spot');
      setIsLocating(false);
    },
  });

  const pickupMutation = useMutation({
    mutationFn: (id) => api.put(`/parking/${id}/pickup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestParking'] });
      queryClient.invalidateQueries({ queryKey: ['parkingHistory'] });
    },
  });

  const handleParkHere = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device.');
      return;
    }
    setIsLocating(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        parkMutation.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          note: parkNote,
          parkedAt: new Date().toISOString(),
        });
      },
      (err) => {
        setGpsError(`Unable to acquire GPS fix: ${err.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Distance and compass bearing from user to scooter
  let distanceMeters = null;
  let compassBearing = null;
  let cardinalDir = null;

  if (latestSpot && currentGps) {
    distanceMeters = Math.round(
      haversineMeters(
        currentGps.latitude,
        currentGps.longitude,
        latestSpot.latitude,
        latestSpot.longitude
      )
    );
    compassBearing = calculateBearing(
      currentGps.latitude,
      currentGps.longitude,
      latestSpot.latitude,
      latestSpot.longitude
    );
    cardinalDir = bearingToCardinal(compassBearing);
  }

  // Time elapsed since parked
  const timeParkedElapsed = latestSpot
    ? Math.floor((Date.now() - new Date(latestSpot.parkedAt).getTime()) / 1000)
    : 0;

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* "Park Here" Action Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide">
              Park Scooter
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans">
              Save current GPS coordinates & pillar/slot note
            </p>
          </div>
        </div>

        {gpsError && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {gpsError}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={parkNote}
            onChange={(e) => setParkNote(e.target.value)}
            placeholder="e.g. Level B2, near Pillar 14C"
            className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 font-sans"
          />

          <button
            onClick={handleParkHere}
            disabled={isLocating}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition disabled:opacity-50"
          >
            <MapPin className="w-4 h-4 fill-current" />
            {isLocating ? 'Acquiring GPS Location...' : 'Park Here Now'}
          </button>
        </div>
      </div>

      {/* "Find My Scooter" Card */}
      {latestSpot && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                ACTIVE PARKING SPOT
              </span>
              <h4 className="font-display font-bold text-base text-zinc-100">
                {latestSpot.note || 'Parked Location'}
              </h4>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-400 block">Parked</span>
              <span className="text-xs font-mono font-bold text-zinc-200">
                {formatTime(timeParkedElapsed)} ago
              </span>
            </div>
          </div>

          {/* Compass & Distance Strip */}
          <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-carbon-950 rounded-xl border border-carbon-800 text-center font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 block">Distance to Scooter</span>
              <span className="text-lg font-bold text-cyan-400">
                {distanceMeters !== null
                  ? distanceMeters > 1000
                    ? `${(distanceMeters / 1000).toFixed(1)} km`
                    : `${distanceMeters} m`
                  : 'Locating...'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-zinc-400 block">Compass Direction</span>
              <span className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
                <Compass className="w-4 h-4" />
                {cardinalDir ? `${cardinalDir} (${compassBearing}°)` : '--'}
              </span>
            </div>
          </div>

          {/* Map Preview */}
          <div
            ref={mapContainerRef}
            className="w-full h-44 rounded-xl border border-carbon-800 my-3 z-0"
            style={{ minHeight: '176px' }}
          />

          {/* Navigation & Picked Up Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => openExternalMaps(latestSpot.latitude, latestSpot.longitude)}
              className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-carbon-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
            >
              <Navigation className="w-3.5 h-3.5 fill-current" /> Open Maps Nav
            </button>

            {!latestSpot.isPickedUp ? (
              <button
                onClick={() => pickupMutation.mutate(latestSpot._id)}
                className="py-2.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 font-medium text-xs border border-carbon-700 flex items-center justify-center gap-1.5 transition"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Mark as Picked Up
              </button>
            ) : (
              <span className="py-2.5 text-center text-xs text-zinc-400 font-mono flex items-center justify-center">
                ✓ Picked Up
              </span>
            )}
          </div>
        </div>
      )}

      {/* Parking History (Last 20 spots) */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" /> Recent Parking Spots
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">{historySpots.length} spots</span>
        </div>

        {historySpots.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-6">No previous parking spots recorded.</p>
        )}

        <div className="divide-y divide-carbon-800">
          {historySpots.map((spot) => (
            <div key={spot._id} className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-xs text-zinc-200">
                  {spot.note || 'Spot'}
                </p>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {formatDate(spot.parkedAt)} · {new Date(spot.parkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openExternalMaps(spot.latitude, spot.longitude)}
                  className="p-1.5 rounded-lg bg-carbon-800 text-cyan-400 border border-carbon-700"
                  title="Navigate in Maps"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
