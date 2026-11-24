import { Navigation, MapPin, Gauge, Fuel } from 'lucide-react';
import { BottomSheet } from './BottomSheet.jsx';

export function QuickActionModal({ isOpen, onClose, onSelectAction }) {
  const actions = [
    {
      id: 'ride',
      title: 'Start Ride',
      description: 'Live high-accuracy GPS tracking & cockpit mode',
      icon: Navigation,
      color: 'from-amber-500 to-amber-600',
    },
    {
      id: 'park',
      title: 'Park Here',
      description: 'Save parking spot with GPS & compass navigation',
      icon: MapPin,
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      id: 'odometer',
      title: 'Update Odometer',
      description: 'Quick numeric keypad reading entry',
      icon: Gauge,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      id: 'fuel',
      title: 'Log Petrol Refill',
      description: 'Record litres, price & full-to-full mileage',
      icon: Fuel,
      color: 'from-rose-500 to-rose-600',
    },
  ];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Cockpit Quick Actions">
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-xl bg-carbon-800/80 hover:bg-carbon-800 border border-carbon-700/80 active:scale-[0.98] transition text-left group"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-carbon-950 font-bold shrink-0 shadow-md`}
              >
                <Icon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-display font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition block">
                  {act.title}
                </span>
                <span className="text-[11px] text-zinc-400 font-sans truncate block">
                  {act.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
