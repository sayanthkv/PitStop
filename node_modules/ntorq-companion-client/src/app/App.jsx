import { useState, Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx';
import { useVehicle } from '../hooks/useVehicle.js';
import { Header } from '../components/common/Header.jsx';
import { BottomNav } from '../components/common/BottomNav.jsx';
import { QuickActionModal } from '../components/common/QuickActionModal.jsx';
import { OfflineBanner } from '../components/common/OfflineBanner.jsx';
import { InstallPrompt } from '../components/common/InstallPrompt.jsx';
import { SkeletonLoader } from '../components/common/SkeletonLoader.jsx';

// Auth & Setup views
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { SetupWizard } from '../features/auth/SetupWizard.jsx';

// Core Dashboard view
import { DashboardPage } from '../features/home/DashboardPage.jsx';
import { AlertsDrawer } from '../features/home/AlertsDrawer.jsx';

// Feature Views
import { OdometerPage } from '../features/odometer/OdometerPage.jsx';
import { FuelPage } from '../features/fuel/FuelPage.jsx';
import { MenuPage } from '../features/menu/MenuPage.jsx';
import { ParkingPage } from '../features/parking/ParkingPage.jsx';
import { ServicePage } from '../features/service/ServicePage.jsx';
import { DocumentsPage } from '../features/documents/DocumentsPage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';

// Code-split / lazy loaded views
const LiveRideTracker = lazy(() =>
  import('../features/rides/LiveRideTracker.jsx').then((m) => ({ default: m.LiveRideTracker }))
);
const RidesPage = lazy(() =>
  import('../features/rides/RidesPage.jsx').then((m) => ({ default: m.RidesPage }))
);
const RideDetailPage = lazy(() =>
  import('../features/rides/RideDetailPage.jsx').then((m) => ({ default: m.RideDetailPage }))
);
const BluetoothLabPage = lazy(() =>
  import('../features/bluetooth-lab/BluetoothLabPage.jsx').then((m) => ({ default: m.BluetoothLabPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function MainApp() {
  const { user, isLoading: isAuthLoading, hasOwner } = useAuth();
  const { vehicle, isLoading: isVehicleLoading, refetch: refetchVehicle } = useVehicle();

  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'odometer' | 'fuel' | 'rides' | 'rides/live' | 'rides/detail' | 'parking' | 'service' | 'documents' | 'bluetooth' | 'settings' | 'menu'
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // 1. Loading state
  if (isAuthLoading || (user && isVehicleLoading)) {
    return (
      <div className="min-h-screen bg-carbon-950 flex flex-col items-center justify-center text-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-carbon-900 border border-carbon-700 flex items-center justify-center font-display font-black text-2xl text-amber-500 animate-pulse mb-3">
          N
        </div>
        <p className="font-display font-bold text-sm tracking-widest text-zinc-300 uppercase">
          Initializing NTORQ Cockpit...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated: Owner register (if first run) or Login
  if (!user) {
    if (!hasOwner || authView === 'register') {
      return <RegisterPage onNavigateLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateRegister={() => setAuthView('register')} />;
  }

  // 3. First-run vehicle setup wizard
  if (!vehicle && !isVehicleLoading) {
    return <SetupWizard onComplete={() => refetchVehicle()} />;
  }

  // 4. Quick action routing
  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'ride':
        setCurrentTab('rides/live');
        break;
      case 'park':
        setCurrentTab('parking');
        break;
      case 'odometer':
        setCurrentTab('odometer');
        break;
      case 'fuel':
        setCurrentTab('fuel');
        break;
      default:
        break;
    }
  };

  const isLiveRideView = currentTab === 'rides/live';

  return (
    <div className="min-h-screen bg-carbon-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Hide Header & BottomNav during Live High-Contrast Ride Mode */}
      {!isLiveRideView && (
        <>
          <Header
            vehicle={vehicle}
            onOpenAlerts={() => setIsAlertsOpen(true)}
          />
          <OfflineBanner />
          <InstallPrompt />
        </>
      )}

      {/* Main Content View Container */}
      <main className="flex-1">
        <Suspense fallback={<div className="p-4 max-w-md mx-auto"><SkeletonLoader count={4} /></div>}>
          {currentTab === 'home' && (
            <DashboardPage
              vehicle={vehicle}
              onNavigate={(tab) => setCurrentTab(tab)}
              onQuickAdd={() => setIsQuickActionOpen(true)}
            />
          )}

          {currentTab === 'odometer' && <OdometerPage vehicle={vehicle} />}

          {currentTab === 'fuel' && <FuelPage vehicle={vehicle} />}

          {currentTab === 'rides' && (
            <RidesPage
              onStartLiveRide={() => setCurrentTab('rides/live')}
              onSelectRide={(id) => {
                setSelectedRideId(id);
                setCurrentTab('rides/detail');
              }}
            />
          )}

          {currentTab === 'rides/live' && (
            <LiveRideTracker
              vehicle={vehicle}
              onRideSaved={() => setCurrentTab('rides')}
              onBack={() => setCurrentTab('rides')}
            />
          )}

          {currentTab === 'rides/detail' && (
            <RideDetailPage
              rideId={selectedRideId}
              onBack={() => setCurrentTab('rides')}
            />
          )}

          {currentTab === 'parking' && <ParkingPage vehicle={vehicle} />}

          {currentTab === 'service' && <ServicePage vehicle={vehicle} />}

          {currentTab === 'documents' && <DocumentsPage />}

          {currentTab === 'bluetooth' && <BluetoothLabPage />}

          {currentTab === 'settings' && <SettingsPage />}

          {currentTab === 'menu' && (
            <MenuPage onNavigate={(tab) => setCurrentTab(tab)} />
          )}
        </Suspense>
      </main>

      {/* Shared Modals */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab)}
      />

      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        onSelectAction={handleQuickAction}
      />

      {/* Mobile-First Bottom Nav Bar */}
      {!isLiveRideView && (
        <BottomNav
          currentTab={currentTab}
          setTab={setCurrentTab}
          onQuickAdd={() => setIsQuickActionOpen(true)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
