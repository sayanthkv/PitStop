import { Bell, WifiOff } from 'lucide-react';
import { usePwa } from '../../hooks/usePwa.js';
import { APP_CONFIG } from '../../lib/constants.js';

export function Header({ vehicle, activeAlertsCount = 0, onOpenAlerts }) {
  const { isOnline } = usePwa();

  return (
    <header className="sticky top-0 z-30 bg-carbon-950/85 backdrop-blur-md border-b border-carbon-800 px-4 py-3 pt-safe flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-carbon-900 border border-carbon-700 flex items-center justify-center font-display font-bold text-amber-500 shadow-inner">
          N
        </div>
        <div>
          <h1 className="font-display font-bold text-base tracking-wide text-zinc-100 flex items-center gap-2">
            {APP_CONFIG.name}
            {vehicle?.registrationNumber && (
              <span className="text-[10px] font-mono uppercase bg-carbon-800 px-1.5 py-0.5 rounded text-amber-400 border border-carbon-700">
                {vehicle.registrationNumber}
              </span>
            )}
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans truncate max-w-[180px]">
            {vehicle?.nickname || vehicle?.model || APP_CONFIG.defaultModel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isOnline && (
          <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <WifiOff className="w-3 h-3" /> Offline
          </span>
        )}

        <button
          onClick={onOpenAlerts}
          className="relative p-2 rounded-lg bg-carbon-900 border border-carbon-800 text-zinc-300 hover:text-amber-400 hover:border-carbon-700 transition"
          aria-label="View alerts"
        >
          <Bell className="w-4 h-4" />
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-carbon-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
              {activeAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
