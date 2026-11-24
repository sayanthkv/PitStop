import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { ClusterGauge } from '../../components/common/ClusterGauge.jsx';
import { formatCurrency, formatDate } from '../../lib/formatters.js';
import { SERVICE_TYPES } from '../../lib/constants.js';
import {
  Plus,
  AlertTriangle,
  History,
  Sliders,
  Disc,
} from 'lucide-react';

export function ServicePage({ vehicle }) {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIntervalOpen, setIsIntervalOpen] = useState(false);
  const [isTyreBatteryOpen, setIsTyreBatteryOpen] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Service entry form
  const [serviceForm, setServiceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    odometer: vehicle?.currentOdometer || 0,
    serviceType: 'general service',
    workshop: '',
    cost: '',
    notes: '',
    nextDueKm: '',
    nextDueDate: '',
  });

  // Service interval form
  const [intervalForm, setIntervalForm] = useState({
    kmInterval: 3000,
    monthInterval: 3,
    averageKmPerDay: 15,
  });

  // Tyre/battery form
  const [tbForm, setTbForm] = useState({
    itemType: 'front_tyre',
    brand: '',
    modelOrSpec: '',
    installDate: new Date().toISOString().slice(0, 10),
    installOdometer: vehicle?.currentOdometer || 0,
    expectedLifespanKm: 20000,
  });

  // Queries
  const { data: serviceDue } = useQuery({
    queryKey: ['serviceDue'],
    queryFn: async () => (await api.get('/service/due')).serviceDue,
  });

  const { data: serviceData } = useQuery({
    queryKey: ['serviceEntries', selectedTypeFilter],
    queryFn: async () => {
      const q = selectedTypeFilter ? `?type=${encodeURIComponent(selectedTypeFilter)}` : '';
      return await api.get(`/service${q}`);
    },
  });

  const { data: intervals } = useQuery({
    queryKey: ['serviceIntervals'],
    queryFn: async () => (await api.get('/service/intervals')).interval,
  });

  const { data: tyreBatteryRecords = [] } = useQuery({
    queryKey: ['tyreBatteryRecords'],
    queryFn: async () => (await api.get('/service/tyre-battery')).records,
  });

  // Mutations
  const addServiceMutation = useMutation({
    mutationFn: (data) => api.post('/service', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceEntries'] });
      queryClient.invalidateQueries({ queryKey: ['serviceDue'] });
      queryClient.invalidateQueries({ queryKey: ['primaryVehicle'] });
      queryClient.invalidateQueries({ queryKey: ['odometerStats'] });
      setIsAddOpen(false);
    },
  });

  const updateIntervalMutation = useMutation({
    mutationFn: (data) => api.put('/service/intervals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceIntervals'] });
      queryClient.invalidateQueries({ queryKey: ['serviceDue'] });
      setIsIntervalOpen(false);
    },
  });

  const addTbMutation = useMutation({
    mutationFn: (data) => api.post('/service/tyre-battery', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tyreBatteryRecords'] });
      setIsTyreBatteryOpen(false);
    },
  });

  const entries = serviceData?.entries || [];
  const totalCost = serviceData?.totalCost || 0;
  const progressPct = serviceDue?.maxProgress ?? 35;
  const isOverdue = serviceDue?.status === 'overdue';
  const isWarning = serviceDue?.status === 'warning';

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-md mx-auto">
      {/* Service Due Hero Card */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            SERVICE MONITOR
          </span>
          <button
            onClick={() => {
              if (intervals) {
                setIntervalForm({
                  kmInterval: intervals.kmInterval || 3000,
                  monthInterval: intervals.monthInterval || 3,
                  averageKmPerDay: intervals.averageKmPerDay || 15,
                });
              }
              setIsIntervalOpen(true);
            }}
            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-carbon-800 px-2 py-0.5 rounded border border-carbon-700"
          >
            <Sliders className="w-3 h-3" /> Interval Settings
          </button>
        </div>

        <div className="flex items-center justify-around py-3">
          <ClusterGauge
            value={progressPct}
            size={110}
            strokeWidth={9}
            title="INTERVAL"
            unit="%"
            color={isOverdue ? '#ef4444' : isWarning ? '#f59e0b' : '#06b6d4'}
            isWarning={isOverdue || isWarning}
          />

          <div className="space-y-2 text-right">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">KM Remaining</span>
              <span
                className={`font-mono text-2xl font-bold tabular-nums ${
                  isOverdue ? 'text-rose-400' : 'text-zinc-100'
                }`}
              >
                {serviceDue?.kmRemaining ?? 1200} <span className="text-xs font-normal text-zinc-400">km</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Due Date Target</span>
              <span className="font-mono text-sm font-semibold text-cyan-400">
                {serviceDue?.dateDue ? formatDate(serviceDue.dateDue) : 'Next 3 months'}
              </span>
            </div>
          </div>
        </div>

        {isOverdue && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Service is overdue! Exceeded {intervals?.kmInterval || 3000} km or interval months.</span>
          </div>
        )}

        {isWarning && !isOverdue && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Service due soon (&gt;80% interval elapsed). Plan an engine oil & service appointment.</span>
          </div>
        )}

        <button
          onClick={() => {
            setServiceForm((prev) => ({ ...prev, odometer: vehicle?.currentOdometer || 0 }));
            setIsAddOpen(true);
          }}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Log Service Record
        </button>
      </div>

      {/* Tyre & Battery Status Strip */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
            <Disc className="w-4 h-4 text-cyan-400" /> Tyres & Battery Health
          </h3>
          <button
            onClick={() => setIsTyreBatteryOpen(true)}
            className="text-[10px] font-mono text-cyan-400 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
        </div>

        {tyreBatteryRecords.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">No tyre or battery records tracked yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tyreBatteryRecords.map((item) => (
              <div key={item._id} className="p-2.5 bg-carbon-950 border border-carbon-800 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block truncate">
                  {item.itemType.replace('_', ' ')}
                </span>
                <p className="font-display font-bold text-xs text-zinc-100 truncate mt-0.5">
                  {item.brand} {item.modelOrSpec}
                </p>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                  Installed: {item.installOdometer.toLocaleString()} km
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service History Timeline */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" /> Service Records
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">Total Spent: {formatCurrency(totalCost)}</span>
          </div>

          {/* Filter dropdown */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-carbon-950 border border-carbon-700 rounded-lg px-2 py-1 text-xs text-zinc-300 font-mono"
          >
            <option value="">All Types</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {entries.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-8">No service records match this filter.</p>
        )}

        <div className="divide-y divide-carbon-800">
          {entries.map((item) => (
            <div key={item._id} className="py-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-zinc-100 capitalize">
                    {item.serviceType}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    @{item.odometer.toLocaleString()} km
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-sans">
                  <span>{formatDate(item.date)}</span>
                  {item.workshop && <span>· {item.workshop}</span>}
                  {item.notes && <span>· {item.notes}</span>}
                </div>

                {item.nextDueKm && (
                  <span className="text-[9px] font-mono text-cyan-400 block mt-1">
                    Next due: {item.nextDueKm.toLocaleString()} km
                  </span>
                )}
              </div>

              <span className="font-mono text-sm font-bold text-zinc-100 shrink-0">
                {formatCurrency(item.cost)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Log Service Modal */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Log Scooter Service">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addServiceMutation.mutate({
              ...serviceForm,
              odometer: Number(serviceForm.odometer),
              cost: Number(serviceForm.cost),
              nextDueKm: serviceForm.nextDueKm ? Number(serviceForm.nextDueKm) : null,
              nextDueDate: serviceForm.nextDueDate || null,
            });
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={serviceForm.date}
                onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
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
                value={serviceForm.odometer}
                onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Service Type
            </label>
            <select
              value={serviceForm.serviceType}
              onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 capitalize font-sans"
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Workshop / Mechanic
              </label>
              <input
                type="text"
                value={serviceForm.workshop}
                onChange={(e) => setServiceForm({ ...serviceForm, workshop: e.target.value })}
                placeholder="e.g. TVS Authorized, Koramangala"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Cost (₹)</label>
              <input
                type="number"
                required
                value={serviceForm.cost}
                onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })}
                placeholder="1200"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Next Due KM (Optional)
              </label>
              <input
                type="number"
                value={serviceForm.nextDueKm}
                onChange={(e) => setServiceForm({ ...serviceForm, nextDueKm: e.target.value })}
                placeholder={String(Number(serviceForm.odometer) + 3000)}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Next Due Date (Optional)
              </label>
              <input
                type="date"
                value={serviceForm.nextDueDate}
                onChange={(e) => setServiceForm({ ...serviceForm, nextDueDate: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Notes</label>
            <input
              type="text"
              value={serviceForm.notes}
              onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
              placeholder="Engine oil replaced, air filter cleaned, brake shoe adjusted"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={!serviceForm.cost}
            className="w-full py-3.5 rounded-xl bg-cyan-500 text-carbon-950 font-bold text-sm shadow-lg disabled:opacity-50"
          >
            Save Service Log
          </button>
        </form>
      </BottomSheet>

      {/* Interval Settings BottomSheet */}
      <BottomSheet
        isOpen={isIntervalOpen}
        onClose={() => setIsIntervalOpen(false)}
        title="Configure Service Intervals"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateIntervalMutation.mutate({
              kmInterval: Number(intervalForm.kmInterval),
              monthInterval: Number(intervalForm.monthInterval),
              averageKmPerDay: Number(intervalForm.averageKmPerDay),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              KM Interval (Default 3,000 km)
            </label>
            <input
              type="number"
              min="500"
              required
              value={intervalForm.kmInterval}
              onChange={(e) => setIntervalForm({ ...intervalForm, kmInterval: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Month Interval (Default 3 months)
            </label>
            <input
              type="number"
              min="1"
              required
              value={intervalForm.monthInterval}
              onChange={(e) => setIntervalForm({ ...intervalForm, monthInterval: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-cyan-500 text-carbon-950 font-bold text-sm"
          >
            Save Interval Parameters
          </button>
        </form>
      </BottomSheet>

      {/* Tyre/Battery BottomSheet */}
      <BottomSheet
        isOpen={isTyreBatteryOpen}
        onClose={() => setIsTyreBatteryOpen(false)}
        title="Track Tyre / Battery"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTbMutation.mutate({
              ...tbForm,
              installOdometer: Number(tbForm.installOdometer),
              expectedLifespanKm: Number(tbForm.expectedLifespanKm),
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Item Type</label>
            <select
              value={tbForm.itemType}
              onChange={(e) => setTbForm({ ...tbForm, itemType: e.target.value })}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100"
            >
              <option value="front_tyre">Front Tyre</option>
              <option value="rear_tyre">Rear Tyre</option>
              <option value="battery">Battery</option>
              <option value="spark_plug">Spark Plug</option>
              <option value="brake_pads">Brake Pads</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={tbForm.brand}
              onChange={(e) => setTbForm({ ...tbForm, brand: e.target.value })}
              placeholder="e.g. MRF Zapper / Amaron Pro"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Install Odometer
              </label>
              <input
                type="number"
                value={tbForm.installOdometer}
                onChange={(e) => setTbForm({ ...tbForm, installOdometer: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Expected Lifespan (km)
              </label>
              <input
                type="number"
                value={tbForm.expectedLifespanKm}
                onChange={(e) => setTbForm({ ...tbForm, expectedLifespanKm: e.target.value })}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!tbForm.brand}
            className="w-full py-3 rounded-xl bg-cyan-500 text-carbon-950 font-bold text-sm disabled:opacity-40"
          >
            Save Component Track
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}
