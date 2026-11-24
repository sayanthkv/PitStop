import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { formatTime, formatDate } from '../../lib/formatters.js';
import {
  Navigation,
  Play,
  ChevronRight,
} from 'lucide-react';

export function RidesPage({ onStartLiveRide, onSelectRide }) {
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ['rides'],
    queryFn: async () => (await api.get('/rides')).rides,
  });

  const { data: summary } = useQuery({
    queryKey: ['ridesSummary'],
    queryFn: async () => (await api.get('/rides/summary')).summary,
  });

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Start Live Ride Call to Action */}
      <button
        onClick={onStartLiveRide}
        className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-display font-black text-base flex items-center justify-between shadow-xl shadow-amber-500/20 active:scale-[0.98] transition group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-carbon-950/20 flex items-center justify-center">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div className="text-left">
            <p className="font-bold text-base leading-tight">Start Live GPS Ride</p>
            <p className="text-[11px] font-sans font-medium opacity-80">
              High accuracy speed & telemetry mode
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* Weekly Summary Card */}
      {summary && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-2">
            PAST 7 DAYS ACTIVITY
          </span>
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            <div className="bg-carbon-950 p-2.5 rounded-xl border border-carbon-800">
              <span className="text-[10px] text-zinc-400 block">Distance</span>
              <span className="text-base font-bold text-amber-400">{summary.totalKm} km</span>
            </div>
            <div className="bg-carbon-950 p-2.5 rounded-xl border border-carbon-800">
              <span className="text-[10px] text-zinc-400 block">Rides</span>
              <span className="text-base font-bold text-zinc-100">{summary.rideCount}</span>
            </div>
            <div className="bg-carbon-950 p-2.5 rounded-xl border border-carbon-800">
              <span className="text-[10px] text-zinc-400 block">Est. Petrol</span>
              <span className="text-base font-bold text-emerald-400">₹{summary.estimatedCost}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ride History */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-500" /> Recorded Rides
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">{rides.length} rides</span>
        </div>

        {rides.length === 0 && !isLoading && (
          <p className="text-xs text-zinc-400 text-center py-8">
            No rides recorded yet. Tap &quot;Start Live GPS Ride&quot; above to track your first trip!
          </p>
        )}

        <div className="divide-y divide-carbon-800">
          {rides.map((r) => (
            <div
              key={r._id}
              onClick={() => onSelectRide(r._id)}
              className="py-3 flex items-center justify-between cursor-pointer group hover:bg-carbon-800/40 px-2 -mx-2 rounded-xl transition"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-zinc-100 tabular-nums">
                    {r.distanceKm} km
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-carbon-800 border border-carbon-700 text-amber-400">
                    {r.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-sans">
                  <span>{formatDate(r.startTime)}</span>
                  <span>·</span>
                  <span>{formatTime(r.movingTimeSec || r.totalTimeSec)}</span>
                  <span>·</span>
                  <span>Avg {r.avgSpeedKmh} km/h</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-300 block">
                    Max {r.maxSpeedKmh} km/h
                  </span>
                  {r.hasRouteData && (
                    <span className="text-[10px] text-cyan-400 font-mono">Map route &rarr;</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
