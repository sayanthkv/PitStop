import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { ClusterGauge } from '../../components/common/ClusterGauge.jsx';
import { formatCurrency, formatMileage, formatDate } from '../../lib/formatters.js';
import {
  Plus,
  TrendingUp,
  AlertTriangle,
  History,
  Sliders,
  DollarSign,
  Compass,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function FuelPage({ vehicle }) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isTripEstimatorOpen, setIsTripEstimatorOpen] = useState(false);
  const [isManualCorrectionOpen, setIsManualCorrectionOpen] = useState(false);
  const [tripDistance, setTripDistance] = useState('25');
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [manualLitres, setManualLitres] = useState('');

  // Fuel log form state with 3-field auto-calculation
  const [fuelForm, setFuelForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    odometer: vehicle?.currentOdometer || 0,
    litres: '',
    pricePerLitre: 102.5,
    totalCost: '',
    isFullTank: true,
    station: '',
    note: '',
  });
  const [capacityWarning, setCapacityWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Query fuel logs & mileage history
  const { data: fuelData } = useQuery({
    queryKey: ['fuelEntries'],
    queryFn: async () => (await api.get('/fuel')),
  });

  // Query fuel estimate
  const { data: fuelEst } = useQuery({
    queryKey: ['fuelEstimate'],
    queryFn: async () => (await api.get('/fuel/estimate')).estimate,
  });

  // Query price history
  const { data: priceData } = useQuery({
    queryKey: ['fuelPrices'],
    queryFn: async () => (await api.get('/fuel-prices')),
  });

  useEffect(() => {
    if (priceData?.latestRate) {
      setFuelForm((prev) => ({ ...prev, pricePerLitre: priceData.latestRate }));
    }
  }, [priceData]);

  useEffect(() => {
    if (vehicle?.currentOdometer) {
      setFuelForm((prev) => ({ ...prev, odometer: vehicle.currentOdometer }));
    }
  }, [vehicle]);

  // Mutations
  const addFuelMutation = useMutation({
    mutationFn: (data) => api.post('/fuel', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['fuelEntries'] });
      queryClient.invalidateQueries({ queryKey: ['fuelEstimate'] });
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      queryClient.invalidateQueries({ queryKey: ['odometerStats'] });
      queryClient.invalidateQueries({ queryKey: ['fuelPrices'] });
      setIsAddOpen(false);
      setCapacityWarning(res.exceedsCapacityWarning || '');
      setFuelForm({
        date: new Date().toISOString().slice(0, 10),
        odometer: vehicle?.currentOdometer || 0,
        litres: '',
        pricePerLitre: priceData?.latestRate || 102.5,
        totalCost: '',
        isFullTank: true,
        station: '',
        note: '',
      });
    },
    onError: (err) => setErrorMessage(err.message || 'Failed to save fuel log'),
  });

  const manualCorrectionMutation = useMutation({
    mutationFn: (litres) => api.post('/vehicle/manual-fuel-correction', { litres: Number(litres) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelEstimate'] });
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      setIsManualCorrectionOpen(false);
      setManualLitres('');
    },
  });

  const saveTodayRateMutation = useMutation({
    mutationFn: (rate) => api.post('/fuel-prices', { rate: Number(rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelPrices'] });
      queryClient.invalidateQueries({ queryKey: ['fuelEstimate'] });
    },
  });

  // Auto-calculation logic between Litres, Price/L, and Total
  const handleLitresChange = (val) => {
    const l = Number(val);
    const p = Number(fuelForm.pricePerLitre);
    const newTotal = l > 0 && p > 0 ? (l * p).toFixed(2) : fuelForm.totalCost;
    setFuelForm((prev) => ({ ...prev, litres: val, totalCost: newTotal }));

    if (l > (vehicle?.tankCapacity || 5.8)) {
      setCapacityWarning(`Warning: ${l}L exceeds tank capacity (${vehicle?.tankCapacity || 5.8}L).`);
    } else {
      setCapacityWarning('');
    }
  };

  const handlePriceChange = (val) => {
    const p = Number(val);
    const l = Number(fuelForm.litres);
    const newTotal = l > 0 && p > 0 ? (l * p).toFixed(2) : fuelForm.totalCost;
    setFuelForm((prev) => ({ ...prev, pricePerLitre: val, totalCost: newTotal }));
  };

  const handleTotalChange = (val) => {
    const t = Number(val);
    const p = Number(fuelForm.pricePerLitre);
    const newLitres = t > 0 && p > 0 ? (t / p).toFixed(2) : fuelForm.litres;
    setFuelForm((prev) => ({ ...prev, totalCost: val, litres: newLitres }));

    if (Number(newLitres) > (vehicle?.tankCapacity || 5.8)) {
      setCapacityWarning(`Warning: ${newLitres}L exceeds tank capacity (${vehicle?.tankCapacity || 5.8}L).`);
    } else {
      setCapacityWarning('');
    }
  };

  // Trip estimator calculations
  const totalTripDist = isRoundTrip ? Number(tripDistance) * 2 : Number(tripDistance);
  const avgMileage = fuelEst?.averageMileage || 38;
  const currentRate = fuelEst?.petrolRate || 102.5;
  const fuelNeeded = Math.round((totalTripDist / avgMileage) * 100) / 100;
  const tripCost = Math.round(fuelNeeded * currentRate);
  const isFuelEnough = (fuelEst?.estimatedLitres || 0) >= fuelNeeded;

  const entriesWithMileage = fuelData?.mileageHistory?.entriesWithMileage || [];
  const chartData = entriesWithMileage
    .filter((e) => e.calculatedMileage !== null)
    .map((e) => ({
      date: formatDate(e.date),
      mileage: e.calculatedMileage,
    }));

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Rule-based insights if any */}
      {fuelData?.insights && fuelData.insights.length > 0 && (
        <div className="space-y-2">
          {fuelData.insights.map((ins, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold font-display">{ins.title}</p>
                <p className="text-[11px] text-zinc-300 font-sans mt-0.5">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estimated Fuel & Range Hero Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            ESTIMATED FUEL & RANGE
          </span>
          <button
            onClick={() => setIsManualCorrectionOpen(true)}
            className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-carbon-800 px-2 py-0.5 rounded border border-carbon-700"
          >
            <Sliders className="w-3 h-3" /> Correct Level
          </button>
        </div>

        <div className="flex items-center justify-around py-3">
          <ClusterGauge
            value={fuelEst?.percentage ?? 60}
            size={110}
            strokeWidth={9}
            title="FUEL LEFT"
            unit="%"
            color={(fuelEst?.percentage ?? 60) <= 20 ? '#ef4444' : '#f59e0b'}
            isWarning={(fuelEst?.percentage ?? 60) <= 20}
          />

          <div className="space-y-2 text-right">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Fuel Remaining</span>
              <span className="font-mono text-2xl font-bold text-zinc-100 tabular-nums">
                ~{fuelEst?.estimatedLitres ?? 3.5} <span className="text-xs font-normal text-zinc-400">L</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Estimated Range</span>
              <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                ~{fuelEst?.rangeKm ?? 135} <span className="text-xs font-normal text-zinc-400">KM</span>
              </span>
            </div>
          </div>
        </div>

        {fuelEst?.isReserveAlert && (
          <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-mono flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Reserve alert: Estimated fuel is at or below reserve level ({vehicle?.reserveLevel || 1.0}L).
          </div>
        )}

        {/* Cost To Fill Grid */}
        <div className="mt-4 pt-3 border-t border-carbon-800 grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-carbon-950 p-2.5 rounded-xl border border-carbon-800">
            <span className="text-[10px] text-zinc-400 block">Cost to Top-Up (~{fuelEst?.topUpLitres ?? 2.3}L)</span>
            <span className="font-bold text-zinc-100 text-sm">{formatCurrency(fuelEst?.costToTopUp ?? 235)}</span>
          </div>
          <div className="bg-carbon-950 p-2.5 rounded-xl border border-carbon-800">
            <span className="text-[10px] text-zinc-400 block">Fill from Empty ({vehicle?.tankCapacity || 5.8}L)</span>
            <span className="font-bold text-zinc-100 text-sm">{formatCurrency(fuelEst?.costFromEmpty ?? 594)}</span>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Log Fuel Refill
        </button>
      </div>

      {/* Today's Petrol Rate & Trip Estimator Action Bar */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-carbon-900 border border-carbon-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-500" /> Petrol Rate (₹/L)
          </span>
          <div className="flex items-center gap-2 my-1">
            <input
              type="number"
              step="0.1"
              defaultValue={fuelEst?.petrolRate || 102.5}
              onBlur={(e) => saveTodayRateMutation.mutate(e.target.value)}
              className="w-20 bg-carbon-950 border border-carbon-700 rounded px-2 py-1 text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[10px] text-zinc-400">Save</span>
          </div>
          <span className="text-[10px] text-zinc-400">Cost/km: ₹{Math.round((currentRate / avgMileage) * 100) / 100}</span>
        </div>

        <button
          onClick={() => setIsTripEstimatorOpen(true)}
          className="bg-carbon-900 border border-carbon-800 hover:border-amber-500/40 rounded-xl p-3 flex flex-col justify-between text-left transition active:scale-[0.98]"
        >
          <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" /> Trip Estimator
          </span>
          <span className="font-display font-bold text-sm text-zinc-100 my-1">
            Calculate Trip Cost
          </span>
          <span className="text-[10px] text-cyan-400 font-mono">Distance & fuel check &rarr;</span>
        </button>
      </div>

      {/* Mileage Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" /> Full-to-Full Mileage Trend
            </h3>
            <span className="text-[11px] font-mono text-amber-400 font-bold">
              Avg: {formatMileage(fuelData?.mileageHistory?.overallAverageMileage)}
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} domain={['dataMin - 5', 'dataMax + 5']} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181c', borderColor: '#27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="mileage"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ fill: '#ea580c', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fuel History Table */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" /> Refill History
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            {entriesWithMileage.length} logs
          </span>
        </div>

        {entriesWithMileage.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-6">No petrol logs recorded yet.</p>
        )}

        <div className="divide-y divide-carbon-800">
          {entriesWithMileage.map((item) => (
            <div key={item._id} className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-zinc-100 tabular-nums">
                    {item.litres} L
                  </span>
                  <span className="text-xs font-mono text-zinc-400">@{formatCurrency(item.pricePerLitre)}</span>
                  <span className="text-xs font-mono font-semibold text-zinc-200">
                    ({formatCurrency(item.totalCost)})
                  </span>
                  {item.isFullTank ? (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Full
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Partial
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-sans">
                  <span>{formatDate(item.date)}</span>
                  <span>·</span>
                  <span>{item.odometer.toLocaleString()} km</span>
                  {item.station && <span>· {item.station}</span>}
                </div>
              </div>

              {/* Calculated mileage between full fills */}
              <div className="text-right">
                {item.calculatedMileage ? (
                  <span className="font-mono text-sm font-bold text-amber-400 block tabular-nums">
                    {item.calculatedMileage} <span className="text-[10px] font-normal">km/l</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    {item.isFullTank ? 'Baseline' : 'Partial fill'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Fuel Modal BottomSheet */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Log Petrol Refill">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFuelMutation.mutate({
              ...fuelForm,
              odometer: Number(fuelForm.odometer),
              litres: Number(fuelForm.litres),
              pricePerLitre: Number(fuelForm.pricePerLitre),
              totalCost: Number(fuelForm.totalCost),
            });
          }}
          className="space-y-4"
        >
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs">{errorMessage}</div>
          )}

          {capacityWarning && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs flex items-center gap-2 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{capacityWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={fuelForm.date}
                onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Odometer (KM)
              </label>
              <input
                type="number"
                required
                value={fuelForm.odometer}
                onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          {/* 3 Auto-calculating fields: Litres, Rate, Total */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Litres (L)</label>
              <input
                type="number"
                step="0.01"
                required
                value={fuelForm.litres}
                onChange={(e) => handleLitresChange(e.target.value)}
                placeholder="4.5"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-2.5 py-2 text-sm text-amber-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Rate (₹/L)</label>
              <input
                type="number"
                step="0.01"
                required
                value={fuelForm.pricePerLitre}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-2.5 py-2 text-sm text-zinc-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Total (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={fuelForm.totalCost}
                onChange={(e) => handleTotalChange(e.target.value)}
                placeholder="450"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-2.5 py-2 text-sm text-emerald-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="fullTankCheckbox"
              checked={fuelForm.isFullTank}
              onChange={(e) => setFuelForm({ ...fuelForm, isFullTank: e.target.checked })}
              className="w-4 h-4 rounded text-amber-500 bg-carbon-950 border-carbon-700 focus:ring-0"
            />
            <label htmlFor="fullTankCheckbox" className="text-xs text-zinc-200 font-sans cursor-pointer">
              Full tank refill (used for full-to-full mileage calculation)
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Petrol Station / Location
            </label>
            <input
              type="text"
              value={fuelForm.station}
              onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })}
              placeholder="e.g. Indian Oil, Indiranagar"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={!fuelForm.litres || !fuelForm.totalCost}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm shadow-lg disabled:opacity-40"
          >
            Save Fuel Log
          </button>
        </form>
      </BottomSheet>

      {/* Manual Fuel Correction BottomSheet */}
      <BottomSheet
        isOpen={isManualCorrectionOpen}
        onClose={() => setIsManualCorrectionOpen(false)}
        title="Manual Fuel Level Correction"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Visually inspected your tank? Enter your estimated fuel level (e.g. &quot;I see about 2.5 litres left&quot;).
            Subsequent calculations will count down from this point.
          </p>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Current Litres in Tank (Max {vehicle?.tankCapacity || 5.8} L)
            </label>
            <input
              type="number"
              step="0.1"
              max={vehicle?.tankCapacity || 5.8}
              min="0"
              value={manualLitres}
              onChange={(e) => setManualLitres(e.target.value)}
              placeholder="e.g. 2.0"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-amber-400"
            />
          </div>

          <button
            onClick={() => manualCorrectionMutation.mutate(manualLitres)}
            disabled={!manualLitres || Number(manualLitres) < 0}
            className="w-full py-3 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm disabled:opacity-40"
          >
            Update Estimated Fuel Level
          </button>
        </div>
      </BottomSheet>

      {/* Trip Cost Estimator BottomSheet */}
      <BottomSheet
        isOpen={isTripEstimatorOpen}
        onClose={() => setIsTripEstimatorOpen(false)}
        title="Trip Cost Estimator"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              One-Way Distance (KM)
            </label>
            <input
              type="number"
              value={tripDistance}
              onChange={(e) => setTripDistance(e.target.value)}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="roundTripCheck"
              checked={isRoundTrip}
              onChange={(e) => setIsRoundTrip(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-carbon-950 border-carbon-700"
            />
            <label htmlFor="roundTripCheck" className="text-xs text-zinc-200 cursor-pointer">
              Round trip ({Number(tripDistance) * 2} km total)
            </label>
          </div>

          <div className="p-4 bg-carbon-800 rounded-xl space-y-2 border border-carbon-700 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Distance:</span>
              <span className="text-zinc-100 font-bold">{totalTripDist} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Fuel Needed:</span>
              <span className="text-amber-400 font-bold">~{fuelNeeded} L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Estimated Cost:</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(tripCost)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-carbon-700">
              <span className="text-zinc-400">Current Fuel Enough?</span>
              <span className={`font-bold ${isFuelEnough ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isFuelEnough ? 'Yes (Sufficient)' : 'No (Refuel Needed)'}
              </span>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
