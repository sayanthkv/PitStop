import { WifiOff, RefreshCw } from 'lucide-react';
import { usePwa } from '../../hooks/usePwa.js';

export function OfflineBanner() {
  const { isOnline } = usePwa();

  if (isOnline) return null;

  return (
    <div className="bg-rose-950/80 border-b border-rose-800/60 text-rose-200 px-4 py-2 text-xs flex items-center justify-between z-50 sticky top-12">
      <div className="flex items-center gap-2 font-mono">
        <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>You are offline. Showing cached vehicle data.</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 font-mono text-[10px] flex items-center gap-1 border border-rose-700/50"
      >
        <RefreshCw className="w-2.5 h-2.5" /> Retry
      </button>
    </div>
  );
}
