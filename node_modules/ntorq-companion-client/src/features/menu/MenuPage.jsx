import {
  Navigation,
  MapPin,
  Wrench,
  FileText,
  Bluetooth,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { APP_CONFIG } from '../../lib/constants.js';

export function MenuPage({ onNavigate }) {
  const menuItems = [
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
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'service',
      title: 'Service & Maintenance Log',
      description: 'Interval tracking, 80/100% alerts, tyre/battery',
      icon: Wrench,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
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
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
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
    <div className="space-y-3 pb-24 pt-2 px-4 max-w-md mx-auto">
      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-4 shadow-xl">
        <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide">
          All Cockpit Features
        </h3>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          {APP_CONFIG.name} — TVS NTORQ Companion Modules
        </p>
      </div>

      <div className="space-y-2">
        {menuItems.map((item) => {
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
        {APP_CONFIG.name} v{APP_CONFIG.version} · Handcrafted for TVS NTORQ Owner
      </div>
    </div>
  );
}
