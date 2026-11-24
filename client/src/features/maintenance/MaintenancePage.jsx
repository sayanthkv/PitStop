import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useVehicle } from '../../hooks/useVehicle.js';
import {
  Wrench,
  CheckCircle2,
  BookOpen,
  Zap,
  X,
  Droplets,
  Disc,
  CircleDot,
  Battery,
} from 'lucide-react';

// Official TVS NTORQ 125 OEM Maintenance Schedule Matrix
const NTORQ_OEM_COMPONENTS = [
  {
    id: 'engine_oil',
    name: 'Engine Oil & Strainer',
    spec: 'TVS TRU4 Synthetic 10W-30 JASO MB (800 ml)',
    intervalKm: 3000,
    intervalDays: 90,
    torque: 'Drain Bolt: 22-25 Nm (17mm socket)',
    icon: Droplets,
    color: 'amber',
    critical: true,
    diyGuide: [
      'Warm engine for 2 minutes, then place scooter on center stand on level ground.',
      'Place drain pan under the engine. Remove 17mm drain bolt and drain old oil completely.',
      'Remove and clean the oil strainer wire mesh filter with clean petrol or brake cleaner.',
      'Reinstall strainer and torque drain bolt to 22-25 Nm with a new copper crush washer.',
      'Fill exactly 800 ml of TVS TRU4 10W-30 JASO MB oil through the dipstick port.',
      'Screw dipstick in, start engine for 1 minute, check for leaks, and re-verify level on dipstick.',
    ],
  },
  {
    id: 'cvt_belt',
    name: 'CVT Drive Belt & Rollers',
    spec: 'OEM TVS Bando CVT Belt & 6x Variator Rollers',
    intervalKm: 12000,
    intervalDays: 365,
    torque: 'Drive Pulley Nut: 45-50 Nm, Clutch Nut: 40 Nm',
    icon: Disc,
    color: 'indigo',
    critical: true,
    diyGuide: [
      'Remove left-side crankcase cover (8mm T-handle bolts).',
      'Use variator holding tool and 17mm socket to remove front drive face nut.',
      'Inspect drive belt for fraying, rubber cracking, or width wear below 18.0 mm.',
      'Inspect variator roller weights for flat spots; clean roller ramp guides.',
      'Torque drive pulley nut to 45-50 Nm using threadlocker.',
    ],
  },
  {
    id: 'spark_plug',
    name: 'Spark Plug',
    spec: 'Champion RG6HCC / BOSCH UR5DC (Gap: 0.7 - 0.8 mm)',
    intervalKm: 12000,
    intervalDays: 365,
    torque: '12-15 Nm (16mm spark plug socket)',
    icon: Zap,
    color: 'cyan',
    critical: false,
    diyGuide: [
      'Open front underseat maintenance flap to access cylinder head.',
      'Gently disconnect spark plug cap.',
      'Blow out any dirt around plug pocket with air to prevent grit falling into cylinder.',
      'Unscrew plug with 16mm deep socket. Inspect electrode color (light tan is optimal).',
      'Gap new plug to 0.75 mm using a feeler gauge, hand-thread first, then torque to 14 Nm.',
    ],
  },
  {
    id: 'air_filter',
    name: 'Air Cleaner & Secondary Filter',
    spec: 'Dual-stage viscous paper + foam pre-filter',
    intervalKm: 12000,
    intervalDays: 365,
    torque: 'Cover screws: 2-3 Nm (Hand tight, do not over-torque)',
    icon: CircleDot,
    color: 'emerald',
    critical: false,
    diyGuide: [
      'Unscrew 6 outer Phillips screws on airbox cover above transmission.',
      'Pull out viscous paper element. Clean dust chamber with dry microfiber cloth.',
      'Do NOT wash viscous paper element in water/petrol. Replace if blackened or dusty.',
      'Inspect secondary foam filter near air intake duct; wash in mild soapy water if dirty.',
    ],
  },
  {
    id: 'brakes',
    name: 'Brake Pads & Rear Shoes',
    spec: 'Front: 220mm Disc (DOT 4 Fluid) | Rear: 130mm Drum',
    intervalKm: 6000,
    intervalDays: 180,
    torque: 'Caliper bolts: 25 Nm',
    icon: Disc,
    color: 'rose',
    critical: true,
    diyGuide: [
      'Inspect front brake pad friction material thickness (replace if below 1.5 mm).',
      'Inspect rear brake lever free-play (adjust 14mm nut on rear drum arm to 10-15 mm free play).',
      'Check front master cylinder sight glass for DOT 4 brake fluid level and golden color.',
    ],
  },
  {
    id: 'battery',
    name: 'Battery & Electricals',
    spec: '12V 4Ah Maintenance-Free VRLA (Terminal: Apply petroleum jelly)',
    intervalKm: 6000,
    intervalDays: 90,
    torque: 'Terminal screws: 3-4 Nm',
    icon: Battery,
    color: 'amber',
    critical: false,
    diyGuide: [
      'Battery is located behind front nose panel / apron.',
      'Check open-circuit voltage with multimeter (12.6V+ is healthy; below 12.2V needs charging).',
      'Clean terminal posts of white sulphate buildup and coat with petroleum jelly.',
    ],
  },
];

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const { vehicle } = useVehicle();
  const currentOdo = vehicle?.currentOdometer || 12450;

  const [activeGuide, setActiveGuide] = useState(null);
  const [logModalComponent, setLogModalComponent] = useState(null);
  const [serviceCost, setServiceCost] = useState('450');
  const [successNote, setSuccessNote] = useState('');

  // Fetch past service logs
  const { data: serviceHistory = [] } = useQuery({
    queryKey: ['serviceHistory'],
    queryFn: () => api.get('/service').then((res) => res.data?.data || []),
  });

  // Calculate component wear based on current odometer
  const calculateComponentHealth = (comp) => {
    // Find last service record that mentions this component
    const lastService = serviceHistory.find((s) =>
      s.description?.toLowerCase().includes(comp.id.replace('_', ' '))
    );

    const kmSinceService = lastService
      ? Math.max(0, currentOdo - lastService.odometer)
      : currentOdo % comp.intervalKm;

    const remainingKm = Math.max(0, comp.intervalKm - kmSinceService);
    const healthPercent = Math.max(0, Math.min(100, Math.round((remainingKm / comp.intervalKm) * 100)));

    return {
      kmSinceService,
      remainingKm,
      healthPercent,
      isDue: healthPercent <= 20,
    };
  };

  // Overall Scooter Health Score (weighted average)
  const healthStats = NTORQ_OEM_COMPONENTS.map((c) => calculateComponentHealth(c));
  const overallScore = Math.round(
    healthStats.reduce((sum, s) => sum + s.healthPercent, 0) / healthStats.length
  );

  // Quick log service mutation
  const handleLogService = async (comp) => {
    try {
      await api.post('/service', {
        odometer: currentOdo,
        serviceType: 'routine',
        description: `TVS NTORQ OEM Service: ${comp.name} replaced/serviced`,
        cost: parseFloat(serviceCost) || 0,
        itemsChanged: [comp.name],
        serviceStation: 'DIY / TVS Service',
      });

      queryClient.invalidateQueries({ queryKey: ['serviceHistory'] });
      setLogModalComponent(null);
      setSuccessNote(`Service logged for ${comp.name}!`);
      setTimeout(() => setSuccessNote(''), 2500);
    } catch (err) {
      console.warn('Failed to log service', err);
    }
  };

  return (
    <div className="space-y-4 pb-28 pt-2 px-4 max-w-md mx-auto">
      {/* Overall Health Score Hero */}
      <div className="bg-gradient-to-br from-carbon-900 to-carbon-950 border border-carbon-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              TVS NTORQ 125 OEM Telemetry
            </span>
            <h2 className="font-display font-black text-xl text-zinc-100 uppercase tracking-tight">
              Scooter Health Index
            </h2>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono font-black text-3xl text-amber-400 tracking-tight">
              {overallScore}%
            </span>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                overallScore >= 80
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : overallScore >= 50
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {overallScore >= 80 ? 'Optimal Condition' : overallScore >= 50 ? 'Service Recommended' : 'Action Required'}
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="h-2 w-full bg-carbon-800 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallScore >= 80
                ? 'bg-gradient-to-r from-emerald-500 to-amber-400'
                : 'bg-gradient-to-r from-amber-500 to-rose-500'
            }`}
            style={{ width: `${overallScore}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mt-3 pt-3 border-t border-carbon-800/80">
          <span>Current ODO: <strong className="text-zinc-200">{currentOdo} km</strong></span>
          <span>Next Inspection: <strong className="text-amber-400">{(Math.floor(currentOdo / 3000) + 1) * 3000} km</strong></span>
        </div>
      </div>

      {successNote && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* OEM Component Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-sm text-zinc-100 uppercase tracking-wide">
            OEM Maintenance Schedule
          </h3>
          <span className="text-[10px] font-mono text-zinc-400">
            Factory TVS TRU4 Specs
          </span>
        </div>

        {NTORQ_OEM_COMPONENTS.map((comp) => {
          const stats = calculateComponentHealth(comp);
          const Icon = comp.icon;

          return (
            <div
              key={comp.id}
              className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-md hover:border-carbon-700 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-carbon-800 border border-carbon-700 flex items-center justify-center text-amber-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-zinc-100">
                      {comp.name}
                    </h4>
                    <p className="text-[10px] font-mono text-zinc-400">
                      Interval: Every {comp.intervalKm.toLocaleString()} km
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-bold text-base ${
                      stats.healthPercent >= 60
                        ? 'text-emerald-400'
                        : stats.healthPercent >= 30
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {stats.healthPercent}%
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500 block">
                    {stats.remainingKm} km left
                  </span>
                </div>
              </div>

              {/* Component Health Bar */}
              <div className="h-1.5 w-full bg-carbon-950 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    stats.healthPercent >= 60
                      ? 'bg-emerald-400'
                      : stats.healthPercent >= 30
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${stats.healthPercent}%` }}
                />
              </div>

              <div className="text-[10px] text-zinc-400 font-sans mb-3 line-clamp-1">
                <strong>Spec:</strong> {comp.spec}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-carbon-800/80">
                <button
                  onClick={() => setActiveGuide(comp)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  DIY Guide
                </button>

                <button
                  onClick={() => setLogModalComponent(comp)}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold flex items-center justify-center gap-1 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Log Replaced
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DIY Guide Modal */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-carbon-900 border border-carbon-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-carbon-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-base text-zinc-100">
                  {activeGuide.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveGuide(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 bg-carbon-950 p-3 rounded-xl border border-carbon-800 text-xs font-mono">
              <p className="text-amber-400 font-bold">{activeGuide.spec}</p>
              <p className="text-zinc-400">⚡ {activeGuide.torque}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                Step-by-step DIY Walkthrough:
              </h4>
              <ol className="space-y-2 text-xs font-sans text-zinc-300 list-decimal pl-4 leading-relaxed">
                {activeGuide.diyGuide.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            <button
              onClick={() => setActiveGuide(null)}
              className="w-full py-2.5 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-200 font-mono font-bold text-xs uppercase"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Log Service Modal */}
      {logModalComponent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-carbon-900 border border-carbon-700 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-zinc-100">
                Log {logModalComponent.name}
              </h3>
              <button
                onClick={() => setLogModalComponent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">
                  Service Cost (₹)
                </label>
                <input
                  type="number"
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                  className="w-full bg-carbon-950 border border-carbon-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="text-[11px] text-zinc-400 font-sans">
                This will record the service entry at <strong>{currentOdo} km</strong> and reset the {logModalComponent.name} interval counter.
              </div>

              <button
                onClick={() => handleLogService(logModalComponent)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-carbon-950 font-display font-bold text-sm uppercase tracking-wider shadow-lg active:scale-95 transition"
              >
                Confirm Service Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
