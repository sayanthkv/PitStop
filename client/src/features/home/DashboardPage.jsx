import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Navigation,
  MapPin,
  Gauge,
  Fuel,
  Wrench,
  FileText,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { ClusterGauge } from '../../components/common/ClusterGauge.jsx';
import { StatCard } from '../../components/common/StatCard.jsx';
import { formatKm, formatMileage } from '../../lib/formatters.js';

export function DashboardPage({ vehicle, onNavigate }) {
  // Queries for real-time dashboard data
  const { data: odoStats } = useQuery({
    queryKey: ['odometerStats'],
    queryFn: async () => (await api.get('/odometer/stats')).stats,
    staleTime: 30000,
  });

  const { data: fuelEst } = useQuery({
    queryKey: ['fuelEstimate'],
    queryFn: async () => (await api.get('/fuel/estimate')).estimate,
    staleTime: 30000,
  });

  const { data: serviceDue } = useQuery({
    queryKey: ['serviceDue'],
    queryFn: async () => (await api.get('/service/due')).serviceDue,
    staleTime: 60000,
  });

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get('/documents')).documents,
    staleTime: 60000,
  });

  const { data: latestParking } = useQuery({
    queryKey: ['latestParking'],
    queryFn: async () => (await api.get('/parking/latest')).spot,
    staleTime: 30000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['activeAlerts'],
    queryFn: async () => (await api.get('/alerts')).alerts,
    staleTime: 30000,
  });

  const currentOdo = odoStats?.currentOdometer ?? vehicle?.currentOdometer ?? 0;
  const fuelPercentage = fuelEst?.percentage ?? 65;
  const fuelLitres = fuelEst?.estimatedLitres ?? 3.8;
  const rangeKm = fuelEst?.rangeKm ?? 145;
  const overallMileage = fuelEst?.averageMileage ?? 38;
  const last5Mileage = fuelEst?.last5Mileage ?? 38;
  const petrolRate = fuelEst?.petrolRate ?? 102;
  const costPerKm = Math.round((petrolRate / overallMileage) * 100) / 100;

  // Nearest document expiry
  const nearestDoc = documents && documents.length > 0 ? documents[0] : null;

  return (
    <div className="space-y-4 pb-20 pt-2 px-4 max-w-md mx-auto">
      {/* Active Alerts Banner if any */}
      {alertsData && alertsData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-carbon-900 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display font-bold text-xs text-zinc-100 truncate">
                {alertsData[0].title}
              </p>
              <p className="text-[11px] text-zinc-400 font-sans truncate">
                {alertsData[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate(alertsData[0].link ? alertsData[0].link.replace('/', '') : 'menu')}
            className="text-[11px] font-mono text-amber-400 flex items-center gap-0.5 shrink-0 ml-2"
          >
            Fix <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Hero Cockpit Section: Large Animated Odometer */}
      <div className="bg-gradient-to-b from-carbon-900 via-carbon-900 to-carbon-950 border border-carbon-800 rounded-2xl p-5 relative overflow-hidden shadow-xl">
        {/* Subtle carbon texture lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            COCKPIT TELEMETRY
          </span>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            {vehicle?.registrationNumber || 'NTORQ 125'}
          </span>
        </div>

        {/* Large Odometer Display with count-up animation */}
        <div className="my-4 text-center relative z-10">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
            Total Distance Traveled
          </span>
          <div className="inline-flex items-baseline justify-center gap-2">
            <motion.h2
              key={currentOdo}
              initial={{ scale: 0.95, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100 tabular-nums drop-shadow-sm"
            >
              {currentOdo.toLocaleString('en-IN')}
            </motion.h2>
            <span className="font-mono text-base font-semibold text-amber-500 uppercase">
              KM
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs font-mono text-zinc-400">
            <span>
              Week: <strong className="text-zinc-200">{formatKm(odoStats?.kmThisWeek ?? 0)}</strong>
            </span>
            <span className="text-carbon-700">|</span>
            <span>
              Month: <strong className="text-zinc-200">{formatKm(odoStats?.kmThisMonth ?? 0)}</strong>
            </span>
          </div>
        </div>

        {/* Hero Gauge & Fuel Summary */}
        <div className="mt-5 pt-4 border-t border-carbon-800/80 flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <ClusterGauge
              value={fuelPercentage}
              size={88}
              strokeWidth={7}
              title="EST. FUEL"
              unit="%"
              color={fuelPercentage <= 20 ? '#ef4444' : '#f59e0b'}
              isWarning={fuelPercentage <= 20}
            />
            <div>
              <p className="font-mono text-base font-bold text-zinc-100 tabular-nums">
                ~{fuelLitres} L <span className="text-xs font-normal text-zinc-400">left</span>
              </p>
              <p className="text-xs font-mono text-amber-400">
                ~{rangeKm} km <span className="text-[10px] text-zinc-400 font-sans">range</span>
              </p>
              <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                ESTIMATE (Reserve: {vehicle?.reserveLevel || 1.0}L)
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('fuel')}
            className="p-2 rounded-xl bg-carbon-800 hover:bg-carbon-700 text-zinc-300 hover:text-amber-400 border border-carbon-700 transition self-center"
            aria-label="View Fuel Details"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onNavigate('rides/live')}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-carbon-900 border border-carbon-800 hover:border-amber-500/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium font-sans text-zinc-200">Start Ride</span>
        </button>

        <button
          onClick={() => onNavigate('parking')}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-carbon-900 border border-carbon-800 hover:border-cyan-500/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1.5">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium font-sans text-zinc-200">Park Here</span>
        </button>

        <button
          onClick={() => onNavigate('odometer')}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-carbon-900 border border-carbon-800 hover:border-emerald-500/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
            <Gauge className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium font-sans text-zinc-200">Update Odo</span>
        </button>

        <button
          onClick={() => onNavigate('fuel')}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-carbon-900 border border-carbon-800 hover:border-rose-500/50 active:scale-95 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1.5">
            <Fuel className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium font-sans text-zinc-200">Log Fuel</span>
        </button>
      </div>

      {/* Grid of Key Telemetry Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Avg Mileage"
          value={overallMileage}
          unit="km/l"
          icon={TrendingUp}
          subtext={`Last 5 fills: ${formatMileage(last5Mileage)}`}
          onClick={() => onNavigate('fuel')}
        />

        <StatCard
          label="Cost / KM"
          value={`₹${costPerKm}`}
          unit=""
          icon={Zap}
          subtext={`Petrol rate: ₹${petrolRate}/L`}
          onClick={() => onNavigate('fuel')}
        />

        <StatCard
          label="Next Service"
          value={serviceDue ? `${serviceDue.kmRemaining} km` : '3,000 km'}
          unit=""
          icon={Wrench}
          subtext={serviceDue?.daysRemainingDate !== null ? `~${serviceDue?.daysRemainingDate} days left` : 'On schedule'}
          alertState={serviceDue?.status === 'overdue' ? 'critical' : serviceDue?.status === 'warning' ? 'warning' : null}
          onClick={() => onNavigate('service')}
        />

        <StatCard
          label="Document Expiry"
          value={nearestDoc ? `${nearestDoc.daysRemaining}d` : '--'}
          unit=""
          icon={FileText}
          subtext={nearestDoc ? `${nearestDoc.title}` : 'All up to date'}
          alertState={nearestDoc?.isUrgent ? (nearestDoc.expiryStatus === 'expired' ? 'critical' : 'warning') : null}
          onClick={() => onNavigate('documents')}
        />
      </div>

      {/* Last Parked Location Quick Glance */}
      {latestParking && (
        <div
          onClick={() => onNavigate('parking')}
          className="bg-carbon-900 border border-carbon-800 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:border-carbon-700 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase text-zinc-400">Last Parked Location</p>
              <p className="font-display font-bold text-xs text-zinc-200 truncate">
                {latestParking.note || 'Saved Spot'}
              </p>
              <span className="text-[10px] text-zinc-400 font-sans">
                {new Date(latestParking.parkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {latestParking.isPickedUp ? 'Picked up' : 'Parked'}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 flex items-center shrink-0">
            Find <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      )}
    </div>
  );
}
