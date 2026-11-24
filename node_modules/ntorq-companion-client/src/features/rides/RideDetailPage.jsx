import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { api } from '../../lib/api.js';
import { formatTime, formatDate } from '../../lib/formatters.js';
import { ArrowLeft } from 'lucide-react';

export function RideDetailPage({ rideId, onBack }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const { data: ride, isLoading } = useQuery({
    queryKey: ['ride', rideId],
    queryFn: async () => (await api.get(`/rides/${rideId}`)).ride,
    enabled: !!rideId,
  });

  useEffect(() => {
    if (!ride || !ride.hasRouteData || !mapContainerRef.current) return;
    if (!ride.routePoints || ride.routePoints.length === 0) return;

    // Clean up old map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const points = ride.routePoints.map((p) => [p.latitude, p.longitude]);
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add polyline track
    const polyline = L.polyline(points, {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
    }).addTo(map);

    // Start Marker (green)
    const startPoint = points[0];
    const endPoint = points[points.length - 1];

    L.circleMarker(startPoint, {
      radius: 6,
      fillColor: '#10b981',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(map);

    // End Marker (red)
    L.circleMarker(endPoint, {
      radius: 6,
      fillColor: '#ef4444',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ride]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">Loading ride details...</div>
    );
  }

  if (!ride) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">
        Ride not found.{' '}
        <button onClick={onBack} className="text-amber-400 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Rides
      </button>

      {/* Hero Stats */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-carbon-800 text-amber-400 border border-carbon-700">
            {ride.label}
          </span>
          <span className="text-xs font-mono text-zinc-400">{formatDate(ride.startTime)}</span>
        </div>

        <div className="text-center my-2">
          <span className="font-mono text-4xl font-extrabold text-zinc-100">
            {ride.distanceKm} <span className="text-base text-amber-500">KM</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-carbon-800 text-center font-mono">
          <div>
            <span className="text-[10px] text-zinc-400 block">Moving Time</span>
            <span className="text-sm font-bold text-zinc-100">
              {formatTime(ride.movingTimeSec || ride.totalTimeSec)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">Avg Speed</span>
            <span className="text-sm font-bold text-zinc-100">{ride.avgSpeedKmh} km/h</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-400 block">Max Speed</span>
            <span className="text-sm font-bold text-amber-400">{ride.maxSpeedKmh} km/h</span>
          </div>
        </div>
      </div>

      {/* Route Map Preview */}
      {ride.hasRouteData && ride.routePoints && ride.routePoints.length > 0 ? (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-2 overflow-hidden shadow-xl">
          <div
            ref={mapContainerRef}
            className="w-full h-64 rounded-xl z-0"
            style={{ minHeight: '260px' }}
          />
          <div className="flex items-center justify-between px-2 py-2 text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Start
            </span>
            <span>Simplified GPS Track ({ride.routePoints.length} points)</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Finish
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-6 text-center text-xs text-zinc-400">
          No GPS route coordinates were recorded for this ride (saved as stats only).
        </div>
      )}

      {ride.note && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-3 text-xs text-zinc-300">
          <span className="font-mono text-[10px] text-zinc-400 block mb-1">RIDE NOTE</span>
          {ride.note}
        </div>
      )}
    </div>
  );
}
