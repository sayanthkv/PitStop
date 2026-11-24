import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { NumericKeypad } from '../../components/common/NumericKeypad.jsx';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { formatKm, formatDate } from '../../lib/formatters.js';
import {
  Plus,
  History,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Wrench,
} from 'lucide-react';

export function OdometerPage({ vehicle }) {
  const queryClient = useQueryClient();
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch readings & stats
  const { data: readings = [], isLoading } = useQuery({
    queryKey: ['odometerReadings'],
    queryFn: async () => (await api.get('/odometer')).readings,
  });

  const { data: stats } = useQuery({
    queryKey: ['odometerStats'],
    queryFn: async () => (await api.get('/odometer/stats')).stats,
  });

  const addMutation = useMutation({
    mutationFn: (reading) => api.post('/odometer', { reading, source: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometerReadings'] });
      queryClient.invalidateQueries({ queryKey: ['odometerStats'] });
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      setIsKeypadOpen(false);
      setInputVal('');
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to add reading');
    },
  });

  const correctMutation = useMutation({
    mutationFn: ({ id, newValue, reason }) =>
      api.post(`/odometer/${id}/correct`, { newValue, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odometerReadings'] });
      queryClient.invalidateQueries({ queryKey: ['odometerStats'] });
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      setIsCorrectionOpen(false);
      setSelectedReading(null);
      setInputVal('');
      setCorrectionReason('');
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Failed to correct reading');
    },
  });

  const currentOdo = stats?.currentOdometer ?? vehicle?.currentOdometer ?? 0;

  const handleStartCorrection = (reading) => {
    setSelectedReading(reading);
    setInputVal(String(reading.reading));
    setCorrectionReason('');
    setIsCorrectionOpen(true);
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'ride':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Ride</span>;
      case 'fuel':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Fuel</span>;
      case 'service':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Service</span>;
      default:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">Manual</span>;
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* 14-Day Nudge Banner */}
      {stats?.isNudgeActive && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-200 font-display">Update Odometer</p>
              <p className="text-[10px] text-zinc-400 font-sans">No reading logged in over 14 days.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setInputVal(String(currentOdo));
              setIsKeypadOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-amber-500 text-carbon-950 font-bold text-xs"
          >
            Update
          </button>
        </div>
      )}

      {/* Main Odometer Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl text-center relative overflow-hidden">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
          Current Odometer Reading
        </span>
        <div className="inline-flex items-baseline justify-center gap-2 my-2">
          <span className="font-mono text-4xl sm:text-5xl font-extrabold text-zinc-100 tabular-nums">
            {currentOdo.toLocaleString('en-IN')}
          </span>
          <span className="font-mono text-sm text-amber-500 font-bold uppercase">KM</span>
        </div>

        <button
          onClick={() => {
            setInputVal(String(currentOdo));
            setIsKeypadOpen(true);
          }}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Log New Reading
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-3.5">
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-500" /> Daily Average
          </span>
          <p className="font-mono text-lg font-bold text-zinc-100 mt-1 tabular-nums">
            {stats?.avgKmPerDay ?? 15} <span className="text-xs font-normal text-zinc-400">km/day</span>
          </p>
          <span className="text-[10px] text-zinc-400">Week: {formatKm(stats?.kmThisWeek ?? 0)}</span>
        </div>

        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-3.5">
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-cyan-400" /> Service Projection
          </span>
          <p className="font-mono text-lg font-bold text-cyan-400 mt-1 tabular-nums">
            ~{stats?.daysToService ?? 30} <span className="text-xs font-normal text-zinc-400">days</span>
          </p>
          <span className="text-[10px] text-zinc-400">
            {stats?.projectedServiceDate ? formatDate(stats.projectedServiceDate) : '--'}
          </span>
        </div>
      </div>

      {/* Timeline of Readings */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" /> Reading Timeline
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">{readings.length} logs</span>
        </div>

        {readings.length === 0 && !isLoading && (
          <p className="text-xs text-zinc-400 text-center py-6">No odometer logs yet.</p>
        )}

        <div className="divide-y divide-carbon-800">
          {readings.map((item) => (
            <div key={item._id} className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-zinc-100 tabular-nums">
                    {item.reading.toLocaleString('en-IN')} km
                  </span>
                  {getSourceBadge(item.source)}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-sans">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>{formatDate(item.date)}</span>
                  {item.note && <span className="text-zinc-400">· {item.note}</span>}
                </div>

                {/* Audit trail badge if corrected */}
                {item.corrections && item.corrections.length > 0 && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                    <ShieldCheck className="w-3 h-3" /> Corrected ({item.corrections.length}x)
                  </span>
                )}
              </div>

              <button
                onClick={() => handleStartCorrection(item)}
                className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 px-2 py-1 rounded bg-carbon-800 border border-carbon-700/60"
              >
                Correct
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sheet Numeric Keypad for adding reading */}
      <BottomSheet
        isOpen={isKeypadOpen}
        onClose={() => {
          setIsKeypadOpen(false);
          setErrorMsg('');
        }}
        title="Enter Current Odometer"
      >
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <NumericKeypad
          value={inputVal}
          onChange={setInputVal}
          onSubmit={() => addMutation.mutate(Number(inputVal))}
          label="Odometer (KM)"
          unit="km"
        />
      </BottomSheet>

      {/* Explicit Reading Correction Bottom Sheet with Audit Trail */}
      <BottomSheet
        isOpen={isCorrectionOpen}
        onClose={() => {
          setIsCorrectionOpen(false);
          setErrorMsg('');
        }}
        title="Correct Previous Reading (Audit Trail)"
      >
        <div className="space-y-4">
          <div className="p-3 bg-carbon-800 rounded-xl text-xs text-zinc-300 leading-relaxed">
            Previous recorded reading: <strong>{selectedReading?.reading} km</strong>. All corrections are logged with an immutable audit trail.
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Corrected Value (KM)
            </label>
            <input
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Reason for Correction *
            </label>
            <textarea
              rows={2}
              required
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Typo in entry, mistakenly logged 12000 instead of 11000"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() =>
              correctMutation.mutate({
                id: selectedReading._id,
                newValue: Number(inputVal),
                reason: correctionReason,
              })
            }
            disabled={!inputVal || !correctionReason || Number(inputVal) < 0}
            className="w-full py-3 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm disabled:opacity-40"
          >
            Save Correction to Audit Trail
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
