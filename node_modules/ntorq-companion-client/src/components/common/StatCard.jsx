export function StatCard({ label, value, unit, icon: Icon, subtext, alertState, onClick }) {
  const alertStyles = {
    warning: 'border-amber-500/40 bg-amber-500/5',
    critical: 'border-rose-500/50 bg-rose-500/5',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-carbon-900 border border-carbon-800 rounded-xl p-3.5 flex flex-col justify-between transition relative overflow-hidden ${
        alertState ? alertStyles[alertState] : 'hover:border-carbon-700'
      } ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-center justify-between text-zinc-400 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 truncate">
          {label}
        </span>
        {Icon && <Icon className="w-4 h-4 text-amber-500/80 shrink-0" />}
      </div>

      <div className="flex items-baseline gap-1 my-0.5">
        <span className="font-mono text-xl font-bold text-zinc-100 tabular-nums tracking-tight">
          {value}
        </span>
        {unit && <span className="font-mono text-xs text-zinc-400">{unit}</span>}
      </div>

      {subtext && (
        <span className="text-[11px] text-zinc-400 font-sans truncate mt-1">
          {subtext}
        </span>
      )}
    </div>
  );
}
