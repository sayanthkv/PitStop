import {
  Zap,
  Camera,
  Wrench,
  Navigation,
  MapPin,
  FileText,
  Gauge,
  Fuel,
  Bluetooth,
  Settings,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/constants.js';

export function MenuPage({ onNavigate }) {
  const primaryFeatures = [
    {
      id: 'cockpit',
      title: 'Cockpit HUD & 0-60 Sprint',
      description: 'Handlebar mount HUD, lean angle & sprint timer',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      badge: 'RACE',
    },
    {
      id: 'scanner',
      title: 'AI Camera Vision Scanner',
      description: 'Auto-detect cluster odometer & petrol pump meter',
      icon: Camera,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      badge: 'AI OCR',
    },
    {
      id: 'maintenance',
      title: 'TVS NTORQ OEM Health Index',
      description: 'Factory service schedule, component health & DIY guides',
      icon: Wrench,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'OEM',
    },
  ];

  const standardModules = [
    {
      id: 'odometer',
      title: 'Odometer Tracker & Timeline',
      description: 'Readings history, audit trail & km/day trends',
      icon: Gauge,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'fuel',
      title: 'Fuel Log & Mileage Tracker',
      description: 'Full-to-full mileage, rate history & range countdown',
      icon: Fuel,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'rides',
      title: 'Ride Tracker & Live GPS',
      description: 'High-accuracy tracking, route maps & telemetry',
      icon: Navigation,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'parking',
      title: 'Parking Finder & Compass',
      description: 'GPS spot saver, live distance & navigation',
      icon: MapPin,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'documents',
      title: 'Vehicle Documents & Expiry',
      description: 'Insurance, PUC, RC, driving license countdowns',
      icon: FileText,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'bluetooth',
      title: 'Bluetooth Lab (Experimental)',
      description: 'Read-only BLE GATT exploration & decoders',
      icon: Bluetooth,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'settings',
      title: 'Settings, Backup & Reports',
      description: 'Vehicle parameters, PDF/CSV reports, JSON export',
      icon: Settings,
      color: 'text-zinc-300 bg-carbon-800 border-carbon-700',
    },
  ];

  return (
    <div className="space-y-4 pb-28 pt-2 px-4 max-w-md mx-auto">
      {/* Header Banner */}
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
            Smart Cockpit Edition
          </span>
        </div>
        <h3 className="font-display font-black text-lg text-zinc-100 uppercase tracking-wide">
          All PitStop Features
        </h3>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          {APP_CONFIG.name} — Handcrafted companion for TVS NTORQ
        </p>
      </div>

      {/* Primary Highlights Section */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase font-bold px-1">
          ★ New Advanced Features
        </span>
        {primaryFeatures.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-carbon-900 to-carbon-900/90 border border-carbon-700/80 hover:border-amber-500/50 flex items-center justify-between text-left active:scale-[0.99] transition group shadow-lg"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition truncate">
                      {item.title}
                    </h4>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-black rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans truncate">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
            </button>
          );
        })}
      </div>

      {/* Standard Companion Modules */}
      <div className="space-y-2 pt-2">
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase font-bold px-1">
          Telemetry & Garage Modules
        </span>
        {standardModules.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full p-3.5 rounded-2xl bg-carbon-900 border border-carbon-800 hover:border-carbon-700 flex items-center justify-between text-left active:scale-[0.99] transition group shadow-md"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 font-sans truncate">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-transform group-hover:translate-x-0.5 shrink-0 ml-2" />
            </button>
          );
        })}
      </div>

      <div className="text-center pt-4 text-[10px] font-mono text-zinc-600">
        {APP_CONFIG.name} v{APP_CONFIG.version} · Smart Cockpit for TVS NTORQ
      </div>
    </div>
  );
}
