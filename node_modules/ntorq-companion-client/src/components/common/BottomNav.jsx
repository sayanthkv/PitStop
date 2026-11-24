import { Home, Gauge, Fuel, Menu, Plus } from 'lucide-react';

export function BottomNav({ currentTab, setTab, onQuickAdd }) {
  const tabs = [
    { id: 'home', label: 'Cluster', icon: Home },
    { id: 'odometer', label: 'Odometer', icon: Gauge },
    { id: 'quick_add', isAction: true },
    { id: 'fuel', label: 'Fuel', icon: Fuel },
    { id: 'menu', label: 'Menu', icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-carbon-950/95 backdrop-blur-lg border-t border-carbon-800 pb-safe">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around relative">
        {tabs.map((tab) => {
          if (tab.isAction) {
            return (
              <button
                key="quick_add"
                onClick={onQuickAdd}
                className="w-13 h-13 -mt-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-carbon-950 flex items-center justify-center shadow-lg shadow-amber-500/25 border-4 border-carbon-950 hover:scale-105 active:scale-95 transition-transform"
                aria-label="Quick Action"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
            );
          }

          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center justify-center w-14 py-1 transition-colors ${
                isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] font-medium mt-1 font-sans">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-amber-400 rounded-full mt-0.5 shadow-sm shadow-amber-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
